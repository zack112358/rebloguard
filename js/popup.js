window.addEventListener("load", function(){
    if (!window.hasOwnProperty('rebloguard')) {
        window.rebloguard = {};
    }
    var rebloguard = window.rebloguard;

    if (!rebloguard.hasOwnProperty('popup')) {
        rebloguard.popup = {};
    }
    var popup = rebloguard.popup;

    var div = popup.div = document.getElementById('rebloguard-popup');
    console.log("Popup div", div);

    var button = popup.button = document.getElementById('rebloguard-disablebutton');
    button.onclick = function() {
        alert("click");
    }
}, true);
