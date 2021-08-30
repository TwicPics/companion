
chrome.storage.onChanged.addListener(function (data) {
    var isDebugActive = data['debugMode'].newValue;
    var root = document.documentElement;
    console.log("In storage changed listener");
    console.log(isDebugActive);

    if (isDebugActive === true) {
        root.setAttribute("twic:debug", "true");
    } else {
        root.setAttribute("twic:debug", "false");
    }
});





