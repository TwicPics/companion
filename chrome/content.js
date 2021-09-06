chrome.storage.onChanged.addListener(function (changes) {
    if ('debugMode' in changes) {
        var isDebugActive = changes['debugMode'].newValue;
        var root = document.documentElement;
        console.log(`In storage changed listener : isDebugActive = ${isDebugActive}`);

        if (isDebugActive === true) {
            root.setAttribute("twic:debug", "");
        } else {
            root.removeAttribute("twic:debug");
        }
    }
});

chrome.storage.sync.get('debugMode', function (data) {
    let isDebugActive = data.debugMode;
    if (isDebugActive === true) {
        var root = document.documentElement;
        root.setAttribute("twic:debug", "");
    }
});
