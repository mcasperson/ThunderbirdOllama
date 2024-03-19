import * as messageTools from '/modules/messageTools.mjs';

messenger.messages.onNewMailReceived.addListener(async (folder, messages) => {
    const { messageLog } = await messenger.storage.local.get({ messageLog: [] });

    for await (let message of messageTools.iterateMessagePages(messages)) {
        const full = await messenger.messages.getFull(message.id);
        const content = getBody(full)
        const summary = await getSummary(content)
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
        .then(data => {
            console.log(data);
            document.getElementById("summary").innerHTML = textToHtml(data.response)
        })
        .catch(error => console.error('Error:', error))
}

function textToHtml(text) {
    let html = text.replace(/\n/g, '<br>');
    return html;
}