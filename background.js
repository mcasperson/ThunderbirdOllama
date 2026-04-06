import * as messageTools from '/modules/messageTools.mjs';
import { getDefaultSummaryInstructions, getNamedActionRequiredInstructions } from '/defaults.js';

const SUMMARY_PREFIX = "[SUMMARY]"
const ACTION_REQUIRED = "[ACTION_REQUIRED]"
const DEFAULT_CONTEXT_WINDOW = 2048

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

    const contextLength = await getContextLength()

    /*
        We use the messageTools.iterateMessagePages function to iterate over all the messages in the folder.
     */
    for await (let message of messageTools.iterateMessagePages(messages)) {
        /*
            If for some reason the email was received over a day ago, ignore it
         */
        if (isOlderThan24Hours(message)) {
            console.log("Skipping email " + message.subject + " received more than 24 hours ago")
            continue
        }

        /*
            If this email is already a summary, ignore ir
         */
        if (isSummaryEmail(message)) {
            continue
        }

        /*
            Get the text content of the email, stripping out HTML and CSS
         */
        const content = await getBody(message)
            .then(body => body.substring(0, contextLength))

        /*
            Call Ollama to generate a summary of the email. The service may be (re)starting,
            so we retry a few times. Note Ollama queues requests, so there is no benefit to
            sending multiple requests in parallel.
         */
        const summary = await getSummaryWithRetry(await getPrompt(content))

        const actionRequired = await getSummaryWithRetry(await getActionRequiredInstructions()) === "true";

        /*
            If Ollama isn't running or there was another error, log it and exit.
         */
        if (!summary) {
            console.error("Failed to generate summary for email " + message.subject)
            continue
        }

        const processedSummary = await processResponse(summary)

        console.log(processedSummary)

        await sendNewEmail(message, actionRequired, processedSummary)
    }
})

function isOlderThan24Hours(message) {
    return message.date < new Date() - 1000 * 60 * 60 * 24
}

function isSummaryEmail(message) {
    return message.subject.startsWith(SUMMARY_PREFIX)
}

async function getEmailAddress() {
    let { email } = await browser.storage.local.get({ email : "" });
    return email.trim();
}

async function getEmailAlias() {
    let { alias } = await browser.storage.local.get({ alias : "" });
    return alias.trim();
}

async function getModel() {
    let { model } = await browser.storage.local.get({ model : "" });
    return model.trim();
}

async function getName() {
    let { name } = await browser.storage.local.get({ name : "" });
    return name.trim();
}

async function getInstructions() {
    return await browser.storage.local.get()
        .then(getItem => getItem.instructions?.trim() || getDefaultSummaryInstructions());
}


async function getActionRequiredInstructions() {
    const name = await getName();

    return await browser.storage.local.get()
        .then(getItem => getItem.actionInstructions?.trim() || getNamedActionRequiredInstructions(name));
}


async function getContextLength() {
    return await browser.storage.local.get({contextwindow: DEFAULT_CONTEXT_WINDOW.toString()})
        .then(data => data.contextwindow.trim())
        .then(contextWindow => parseInt(contextWindow))
        .then(contextWindow => isNaN(contextWindow) || contextWindow < 0
            ? DEFAULT_CONTEXT_WINDOW
            : contextWindow)
        /*
            Context window measures the number of tokens. There are approx 4 chars per token.
            To give us a buffer and allow for the prompt template we subtract 256 tokens and
            multiply by 4 to get the number of characters that can be passed into the model.
         */
        .then(contextWindow => (contextWindow - 256) * 4)
}

async function sendNewEmail(message, actionRequired, summary) {
    const email = await getEmailAddress()
    const alias = await getEmailAlias()

    if (email.length === 0) {
        return
    }

    const emailWithAlias = getToAddress(email, alias)

    const actionRequiredTitle = actionRequired ? " " + ACTION_REQUIRED : ""

    const composeTab = await browser.compose.beginNew({
        to: emailWithAlias,
        subject: SUMMARY_PREFIX + actionRequiredTitle + " " + message.subject,
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

async function getPrompt(content) {
    const model = await getModel()

    if (model.startsWith("phi")) {
        return await getPhiPrompt(content)
    }

    if (model.startsWith("qwen")) {
        return await getQwenPrompt(content)
    }

    return await getLlamaPrompt(content)
}

async function processResponse(response) {
    const model = await getModel()

    if (model.startsWith("qwen")) {
        return response.replace(/<think>.*?<\/think>/gs, '').trim()
    }

    return response
}

async function getSummaryWithRetry(prompt) {
    for (let i = 0; i < 12; ++i) {
        const summary = await getSummary(prompt)
        if (summary) {
            return summary
        }
        await new Promise(r => setTimeout(r, 5000))
    }

    return null
}

async function getPhiPrompt(content) {
    return "<|im_start|>system<|im_sep|>" +
        "You are an expert in reading and summarizing emails." +
        "<|im_end|>" +
        "<|im_start|>system<|im_sep|>" +
        "The email content is: " + content +
        "<|im_end|>" +
        "<|im_start|>user<|im_sep|>" +
        await getInstructions() +
        "<|im_end|>" +
        "<|im_start|>assistant<|im_sep|>"
}

async function getLlamaPrompt(content) {
    return "<|begin_of_text|>" +
        "<|start_header_id|>system<|end_header_id|>" +
        "You are an expert in reading and summarizing emails." +
        "<|eot_id|>" +
        "<|start_header_id|>system<|end_header_id|>" +
        "The email content is: " + content +
        "<|eot_id|>" +
        "<|start_header_id|>user<|end_header_id|>" +
        await getInstructions() +
        "<|eot_id|>" +
        "<|start_header_id|>assistant<|end_header_id|>"
}

async function getQwenPrompt(content) {
    return "<|im_start|>system\n" +
        "You are an expert in reading and summarizing emails." +
        "<|im_end|>" +
        "<|im_start|>system\n" +
        "The email content is: " + content +
        "<|im_end|>" +
        "<|im_start|>user\n" +
        await getInstructions() +
        "<|im_end|>" +
        "<|im_start|>assistant"
}

function removeThinkingTags(text) {
    if (!text) {
        return text
    }

    const match = /<thinking>(.*?)<\/thinking>/g.exec(text.trim())
    if (match) {
        return match[1]
    }

    return text
}

/**
 * Call Ollama to generate a summary of the email
 * @param prompt The prompt to pass to ollama
 * @returns {Promise<any>} The email summary
 */
async function getSummary(prompt) {
    const model = await getModel()
    const contextLength = await getContextLength()

    // Need to set the OLLAMA_ORIGINS=moz-extension://* environment variable for Ollama
    return fetch("http://localhost:11434/api/generate",
        {
            method: "POST",
            body: JSON.stringify(
                {
                    "model": model,
                    "prompt": prompt,
                    "stream": false,
                    "options": {
                        "num_ctx": contextLength
                    }
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
        .then(text => removeThinkingTags(text))
        .then(result => {
            console.log(result)
            return JSON.parse(result)
        })
        .then(data => data.response)
        .catch(error => console.error('Error:', error))
}