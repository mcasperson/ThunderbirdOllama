// The user clicked our button, get the active tab in the current window using
// the tabs API.
let tabs = await messenger.tabs.query({active: true, currentWindow: true});

// Get the message currently displayed in the active tab, using the
// messageDisplay API. Note: This needs the messagesRead permission.
// The returned message is a MessageHeader object with the most relevant
// information.
let message = await messenger.messageDisplay.getDisplayedMessage(tabs[0].id);

// Get the full messages
let full = await messenger.messages.getFull(message.id);

function getBody(message) {
    let body = ""
    if (message.body) {
        body += removeCSSCommentsFromString(removeCSSFromString(convertToPlain(message.body)))
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

const content = getBody(full)
    .split("\n")
    .filter(line => line.trim() !== "")
    .join("\n")
    .replaceAll("  ", " ")
console.log(content)

// Need to set the OLLAMA_ORIGINS=moz-extension://* environment variable for Ollama
fetch("http://localhost:11434/api/generate",
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

function textToHtml(text) {
    let html = text.replace(/\n/g, '<br>');
    return html;
}