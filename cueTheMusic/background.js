
chrome.browserAction.setTitle({
    title: "For those good guy moments"
});

// Load song
var curbYourTheme = new Audio();
curbYourTheme.src = "audio/frolic.mp3";

var currentlyPlaying = false;

chrome.browserAction.onClicked.addListener(function(tab) {
    if (currentlyPlaying == false) {
            curbYourTheme.src = "audio/frolic.mp3"; // Reload audio each time
            curbYourTheme.play();
            console.log("Enjoy!");
            currentlyPlaying = true;
    } else {
        curbYourTheme.pause();
        console.log("Paused!");
        currentlyPlaying = false;
    }
});