import * as messageTools from '/modules/messageTools.mjs';

messenger.messages.onNewMailReceived.addListener(async (folder, messages) => {
    console.log("New mail received")

    for await (let message of messageTools.iterateMessagePages(messages)) {
        const full = await messenger.messages.getFull(message.id);

        // Only process emails received in the last 24 hours
        if (message.date < new Date() - 1000 * 60 * 60 * 24) {
            console.log("Skipping email " + message.subject + " received more than 24 hours ago")
            continue
        }

        const content = getBody(full)
        const summary = await getSummary(content)
        console.log(summary)
        await fetch("https://hooks.slack.com/services/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",
            {
                method: "POST",
                headers: {"Content-type": "application/json"},
                body: JSON.stringify({
                    text: summary
                })
            })
    }
})

function getBody(message) {
    let body = ""
    if (message.body) {
        body += removeWhiteSpace(removeCSSCommentsFromString(removeCSSFromString(convertToPlain(message.body))))
    }
    if (message.parts) {
        message.parts.forEach(part => {
            body += getBody(part)
        })
    }

    return body
}

function convertToPlain(html){

    // Create a new div element
    const tempDivElement = document.createElement("div");

    // Set the HTML content with the given value
    tempDivElement.innerHTML = html;

    // Retrieve the text property of the element
    return tempDivElement.textContent || tempDivElement.innerText || "";
}

function removeCSSFromString(inputString) {
    // Regular expression to match CSS style declarations
    const cssRegex = /.*?{[^}]*}/g;
    // Remove CSS style declarations from the string
    const outputString = inputString.replace(cssRegex, '');
    return outputString;
}

function removeCSSCommentsFromString(inputString) {
    // Regular expression to match CSS style declarations
    const cssRegex = /\/\*.*?\*\//g;
    // Remove CSS style declarations from the string
    const outputString = inputString.replace(cssRegex, '');
    return outputString;
}

function removeWhiteSpace(message) {
    return message
        .split("\n")
        .filter(line => line.trim() !== "")
        .join("\n")
        .replaceAll("  ", " ")
}

function getSummary(content) {
    // Need to set the OLLAMA_ORIGINS=moz-extension://* environment variable for Ollama
    return fetch("http://localhost:11434/api/generate",
        {
            method: "POST",
            body: JSON.stringify(
                {
                    "model": "llama2:13b",
                    "prompt": "[INST] You are a helpful code assistant. "
                        + "Provide a two paragraph summary of the following email:\n" + content + "\n[/INST]",
                    "stream": false
                }
            ),
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => data.response)
        .catch(error => console.error('Error:', error))
}

function textToHtml(text) {
    let html = text.replace(/\n/g, '<br>');
    return html;
}