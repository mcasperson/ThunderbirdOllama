function saveOptions(e) {
    browser.storage.local.set({
        email: document.querySelector("#email").value,
        alias: document.querySelector("#alias").value,
    });
    e.preventDefault();
}

function restoreOptions() {
    const gettingItem = browser.storage.local.get();
    gettingItem.then((res) => {
        document.querySelector("#email").value = res.email || '';
        document.querySelector("#alias").value = res.alias || '';
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);