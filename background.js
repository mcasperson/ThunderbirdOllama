import * as messageTools from '/modules/messageTools.mjs';

const SUMMARY_PREFIX = "[SUMMARY]"

class ResponseError extends Error {
    constructor(message, res) {
        super(message)
        this.response = res
    }
}

/*
    We set up an event listener to respond to any new emails received by Thunderbird.
 */
messenger.messages.onNewMailReceived.addListener(async (folder, messages) => {
    console.log("New mail received")

    /*
        We use the messageTools.iterateMessagePages function to iterate over all the messages in the folder.
     */
    for await (let message of messageTools.iterateMessagePages(messages)) {
        const full = await messenger.messages.getFull(message.id);

        /*
            If for some reason the email was received over a day ago, ignore it
         */
        if (message.date < new Date() - 1000 * 60 * 60 * 24) {
            console.log("Skipping email " + message.subject + " received more than 24 hours ago")
            continue
        }

        /*
            If this email is already a summary, ignore ir
         */
        if (message.subject.startsWith(SUMMARY_PREFIX)) {
            continue
        }

        /*
            Get the text content of the email, stripping out HTML and CSS
         */
        const content = await getBody(message)

        /*
            Call Ollama to generate a summary of the email. The service may be (re)starting,
            so we retry a few times. Note Ollama queues requests, so there is no benefit to
            sending multiple requests in parallel.
         */
        let summary = null
        for (let i = 0; i < 12; ++i) {
            summary = await getSummary(content)
            if (summary) {
                break
            }
            await new Promise(r => setTimeout(r, 5000));
        }

        /*
            If Ollama isn't running or there was another error, log it and exit.
         */
        if (!summary) {
            console.error("Failed to generate summary for email " + message.subject)
            continue
        }

        console.log(summary)

        await sendNewEmail(message, summary)
    }
})

async function sendNewEmail(message, summary) {
    const getItem = await browser.storage.local.get()

    if (getItem.email.trim().length === 0) {
        return
    }

    const emailWithAlias = getToAddress(getItem.email, getItem.alias)

    const composeTab = await browser.compose.beginNew({
        to: emailWithAlias,
        subject: SUMMARY_PREFIX + " " + message.subject,
        plainTextBody: summary
    })

    await browser.compose.sendMessage(composeTab.id)
}

function getToAddress(email, alias) {
    if (alias.trim().length === 0) {
        return email
    }

    const emailSplit = email.split("@")

    if (emailSplit.length !== 2) {
        return email
    }

    return emailSplit[0] + "+" + alias + "@" + emailSplit[1]
}

/**
 * Get the text content of the email, stripping out HTML, CSS
 * @param message The email object
 * @returns {string} The text content of the email
 */
async function getBody(message) {
    const textParts = await messenger.messages.listInlineTextParts(message.id)
    const plainTextParts = []
    for (const part of textParts) {
        const plainText = await browser.messengerUtilities.convertToPlainText(part.content)
        plainTextParts.push(plainText)
    }

   return plainTextParts.join("\n")
}

/**
 * Call Ollama to generate a summary of the email
 * @param content The plain text context of the email
 * @returns {Promise<any>} The email summary
 */
function getSummary(content) {
    // Need to set the OLLAMA_ORIGINS=moz-extension://* environment variable for Ollama
    return fetch("http://localhost:11434/api/generate",
        {
            method: "POST",
            body: JSON.stringify(
                {
                    "model": "llama3.2",
                    "prompt": "<|begin_of_text|>" +
                        "<|start_header_id|>system<|end_header_id|>" +
                        "You are an expert in reading and summarizing emails." +
                        "<|eot_id|>" +
                        "<|start_header_id|>system<|end_header_id|>" +
                        "The email content is: " + content +
                        "<|eot_id|>" +
                        "<|start_header_id|>user<|end_header_id|>" +
                        "Provide a two paragraph summary of the email. " +
                        "The summary must highlight the important points, dates, people, questions, and action items." +
                        "<|eot_id|>" +
                        "<|start_header_id|>assistant<|end_header_id|>",
                    "stream": false
                }
            ),
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new ResponseError('Bad fetch response', response)
            }
            return response
        })
        .then(response => response.text())
        .then(result => {
            console.log(result)
            return JSON.parse(result)
        })
        .then(data => data.response)
        .catch(error => console.error('Error:', error))
}