
var msgContentScript = function(message) {
    console.log('messaging content script');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {command: 'search-result', results : message}, function(response) {
            console.log(response.farewell);
        });
    });
}

/*
 * Status Widget background component
 *
 * Contains code in main.js as well as eventPage.js
 */
var StatusUpdater = function() {
    console.log("eventPage.js->StatusUpdater is running.")
    this.intervalID = '';
    this.init = function() {
        // When we start chrome, get the latest updates
        this.get();

        // Clear any previous alarms (though this may not be necessary?)
        // if (chrome.alarms.get("launchpadUpdateInterval")) { chrome.alarms.clear("launchpadUpdateInterval"); }
        
        // Set an interval to check statuses every 30 minutes
        var that = this;
        var launchpadUpdateAlarm = chrome.alarms.create("launchpadUpdateInterval", {"delayInMinutes": 30, "periodInMinutes": 30});
        chrome.alarms.onAlarm.addListener(function(launchpadUpdateAlarm){
            console.log(launchpadUpdateAlarm.name + " has been triggered.  Getting fresh status updates!");
            that.get();
        });
    }

    this.endpoint = function(method) {
        return '' + method + '.json';
    }

    this.get = function(force) {
        var that = this;
        var company_id = localStorage['current_company_id'];
        $.get(this.endpoint('get'), { 'company_id' : company_id }, function(resp){
            if (resp) {
                resp = resp.replace('chrome_extension','');
                var parsedResponse = JSON.parse(resp);
                if (!parsedResponse.status && parsedResponse.status != 403) {
                    that.save(resp);
                    if (force == true) {
                        setTimeout(function(){
                            that.notifyUpdates();
                        },100);
                    }
                }
            }
        });
    }

    this.save = function(resp) {
        var teams = {};
        var entries = JSON.parse(resp);
        for (var i = 0; i < entries.length; i++) {
            teams[entries[i]['team']] = true;
        }
        var sorted_teams = Object.keys(teams);
        localStorage['teams'] = JSON.stringify(sorted_teams);
        
        // Remove the old entries thing to free up 5mb memory
        if (localStorage['entries']) {
            localStorage.removeItem('entries');
        }
        
        chrome.storage.local.set({'entries':resp});
    }

    this.notifyUpdates = function() {
        // Notify the tab that we have recent updates
        chrome.runtime.sendMessage({command: 'reload-page'});
    }
}
 
var statusUpdater = new StatusUpdater();
statusUpdater.init();


// Notifier needs to be in the background page to handle tab reload events with setTimeout
var notify = function(notification_data) {
    var timeout = notification_data.timeout;
    delete notification_data.timeout;
    chrome.notifications.create(null, notification_data, function(id) {
        setTimeout(function(){chrome.notifications.clear(id);}, timeout);
    });
}

/*
 * Setup message passing listener
 * 
 * There is only one listener needed, everything belongs in the if else
 *
 */
chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
    if (request.command == 'fetch-events') {
        sendResponse({ 'evts' : JSON.stringify(events) });
    } else if (request.command == 'status-message-update') {
        statusUpdater.get(true);
        sendResponse({ 'farewell' : 'goodbye' });
    } else if (request.command == 'page-notify') {
        notify(request.notification);
    } else {
        sendResponse({ 'farewell' : 'goodbye from eventPage.js' });
    } 
});


// Forces an update as soon as one is detected
chrome.runtime.onUpdateAvailable.addListener(function(){
    chrome.runtime.reload();
});
