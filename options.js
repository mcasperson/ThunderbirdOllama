function saveOptions(e) {
    browser.storage.sync.set({
        url: document.querySelector("#url").value
    });
    e.preventDefault();
}

function restoreOptions() {
    var gettingItem = browser.storage.sync.get('url');
    gettingItem.then((res) => {
        document.querySelector("#url").value = res.url || '';
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);