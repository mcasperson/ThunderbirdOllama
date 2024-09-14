function saveOptions(e) {
    browser.storage.sync.set({
        email: document.querySelector("#email").value,
        alias: document.querySelector("#alias").value,
    });
    e.preventDefault();
}

function restoreOptions() {
    const gettingItem = browser.storage.sync.get();
    gettingItem.then((res) => {
        document.querySelector("#email").value = res.email || '';
        document.querySelector("#alias").value = res.alias || '';
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);