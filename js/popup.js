window.addEventListener("load", function(){
    var bgpage = chrome.extension.getBackgroundPage();
    var rebloguard = window.rebloguard = bgpage.rebloguard;

    if (!rebloguard.hasOwnProperty('popup')) {
        rebloguard.popup = {};
    }
    var popup = rebloguard.popup;


    var div = popup.div = document.getElementById('rebloguard-popup');
    console.log("Popup div", div);

    var stat = popup.stat = document.getElementById('rebloguard-status');
    if (rebloguard.initialized) {
        stat.textContent = "Rebloguard is up and running";
    }
}, true);
