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
        body += message.body
    }
    if (message.parts) {
        message.parts.forEach(part => {
            body += getBody(part)
        })
    }

    return body
}

// Need to set the OLLAMA_ORIGINS=moz-extension://* environment variable for Ollama
fetch("http://localhost:11434/api/generate",
    {
        method: "POST",
        body: JSON.stringify(
            {
                "model": "mistral",
                "prompt": "[INST] You are a helpful code assistant. "
                + "Your task is to provide a summary of this email:\n" + getBody(full) + "\n[/INST]",
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