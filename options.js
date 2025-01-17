function saveOptions(e) {
    browser.storage.local.set({
        email: document.querySelector("#email").value,
        alias: document.querySelector("#alias").value,
        model: document.querySelector("#model").value,
        contextwindow: document.querySelector("#contextwindow").value,
        instructions: document.querySelector("#instructions").value,
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
        document.querySelector("#instructions").value = res.instructions || 'Provide a two paragraph summary of the email. The summary must highlight the important points, dates, people, questions, and action items';
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);