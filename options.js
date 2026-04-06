import {getDefaultName, getDefaultSummaryInstructions, getNamedActionRequiredInstructions} from "./defaults.js";

function saveOptions(e) {
    browser.storage.local.set({
        email: document.querySelector("#email").value,
        alias: document.querySelector("#alias").value,
        model: document.querySelector("#model").value,
        contextwindow: document.querySelector("#contextwindow").value,
        instructions: document.querySelector("#instructions").value,
        name: document.querySelector("#name").value,
        actionInstructions: document.querySelector("#actionInstructions").value,
    });
    e.preventDefault();
}

function restoreOptions() {
    const gettingItem = browser.storage.local.get();
    gettingItem.then((res) => {
        document.querySelector("#email").value = res.email || '';
        document.querySelector("#alias").value = res.alias || '';
        document.querySelector("#model").value = res.model || 'llama3.2';
        document.querySelector("#contextwindow").value = res.contextwindow || '2048';
        document.querySelector("#instructions").value = res.instructions || getDefaultSummaryInstructions();
        document.querySelector("#name").value = res.name || getDefaultName();
        document.querySelector("#actionInstructions").value = res.actionInstructions || getNamedActionRequiredInstructions(res.name || '');
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.getElementById("regenerate").addEventListener("click", async () => {
    const gettingItem = browser.storage.local.get();
    gettingItem.then((res) => {
        document.querySelector("#actionInstructions").value = getNamedActionRequiredInstructions(document.querySelector("#name").value || '');
    });
})