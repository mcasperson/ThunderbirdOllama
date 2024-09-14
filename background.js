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
        const content = getBody(full)

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
    const email = await browser.storage.sync.get('email')
    const alias = await browser.storage.sync.get('alias')

    const emailSplit = email.split("@")

    if (emailSplit.length !== 2) {
        return
    }

    const emailWithAlias = emailSplit[0] + "+" + alias + "@" + emailSplit[1]

    const composeTab = await compose.beginNew({
        to: emailWithAlias,
        subject: SUMMARY_PREFIX + " " + message.subject,
        plainTextBody: summary
    })

    await compose.sendMessage(composeTab.id)
}

async function sendToSlack(message, summary) {
    const gettingItem = await browser.storage.sync.get('url');

    /*
        Send the summary to Slack.
     */
    await fetch(gettingItem.url,
        {
            method: "POST",
            headers: {"Content-type": "application/json"},
            body: JSON.stringify({
                text: "--------------------------------------------------\n" + message.subject + "\n" + summary
            })
        })
}

/**
 * Get the text content of the email, stripping out HTML, CSS
 * @param message The email object
 * @returns {string} The text content of the email
 */
function getBody(message) {
    let body = ""
    if (message.body) {
        let text = convertToPlain(message.body)
        text = removeCSSFromString(text)
        text = removeCSSCommentsFromString(text)
        text = removeWhiteSpace(text)
        body += text
    }
    if (message.parts) {
        message.parts.forEach(part => {
            body += getBody(part)
        })
    }

    return body
}

/**
 * Convert HTML to plain text
 * @param html The input HTML
 * @returns {string} The text content
 */
function convertToPlain(html){

    // Create a new div element
    const tempDivElement = document.createElement("div");

    // Set the HTML content with the given value
    tempDivElement.innerHTML = html;

    // Retrieve the text property of the element
    return tempDivElement.textContent || tempDivElement.innerText || "";
}

/**
 * Strip out CSS
 * @param inputString The input text
 * @returns {string} The text content without CSS
 */
function removeCSSFromString(inputString) {
    // Regular expression to match CSS style declarations
    const cssRegex = /.*?{[^}]*}/g;
    // Remove CSS style declarations from the string
    return inputString.replace(cssRegex, '');
}

/**
 * Remove CSS comments from the string
 * @param inputString The input string
 * @returns {string} The text content without comments
 */
function removeCSSCommentsFromString(inputString) {
    // Regular expression to match CSS style declarations
    const cssRegex = /\/\*.*?\*\//g;
    // Remove CSS style declarations from the string
    return inputString.replace(cssRegex, '');
}

/**
 * Remove unnecessary white space from the string
 * @param message The input string
 * @returns {string} The string without unnecessary white space
 */
function removeWhiteSpace(message) {
    return message
        .split("\n")
        .filter(line => line.trim() !== "")
        .join("\n")
        .replaceAll("  ", " ")
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
                    "model": "llama3.1",
                    "prompt": "[INST] You are a helpful code assistant. "
                        + "Provide a two paragraph summary of the following email. "
                        + "The summary must highlight the important points, dates, people, questions, and action items. "
                        + "The email is:\n" + content + "\n[/INST]",
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