window.addEventListener("load", function(){
    console.log("Initializing");
    if (!window.hasOwnProperty('rebloguard')) {
        window.rebloguard = {};
    }
    var rebloguard = window.rebloguard;

    var n_set = 0;
    var report_content_set = function() {
        n_set += 1;
        if (n_set == content_settings.length) {
            rebloguard.initialized = true;
        }
    }
    content_settings = [
        function() {chrome.contentSettings.javascript.set(
                        {"primaryPattern": "http://*.tumblr.com/*",
                         "setting": "block"},
                        report_content_set); },
        function() {chrome.contentSettings.javascript.set(
                        {"primaryPattern": "http://*.tumblr.com/*",
                         "setting": "block"},
                        report_content_set); },
    ]

    for (var i = 0; i < content_settings.length; ++i) {
        content_settings[i]();
    }
}, true);
