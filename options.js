function saveOptions(e) {
    browser.storage.local.set({
        email: document.querySelector("#email").value,
        alias: document.querySelector("#alias").value,
        model: document.querySelector("#model").value,
        contextwindow: document.querySelector("#contextwindow").value,
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
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);