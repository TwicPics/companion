function updateIcon() {
    console.log('Icon Clicked')
    chrome.storage.sync.get('debugMode', function (data) {
        let isDebugActive = data.debugMode;

        if (isDebugActive === true) {
            isDebugActive = false;
            chrome.browserAction.setIcon({
                path: {
                    "16": "/icons/disabled/icon-bw-16.png",
                    "24": "/icons/disabled/icon-bw-24.png",
                    "32": "/icons/disabled/icon-bw-32.png",
                    "48": "/icons/disabled/icon-bw-48.png",
                    "128": "/icons/disabled/icon-bw-128.png"
                }
            });
        } else {
            isDebugActive = true;
            chrome.browserAction.setIcon({
                path: {
                    "16": "/icons/enabled/icon-16.png",
                    "24": "/icons/enabled/icon-24.png",
                    "32": "/icons/enabled/icon-32.png",
                    "48": "/icons/enabled/icon-48.png",
                    "128": "/icons/enabled/icon-128.png"
                }
            });
        }

        chrome.storage.sync.set({ debugMode: isDebugActive }, function () {
            console.log('The debug mode is set to ' + isDebugActive);
        });

    });
};


document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('debug-switch');
    btn.addEventListener('click', updateIcon);
});