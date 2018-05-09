/*
 *  main.js is loaded by index.html when the Chrome extension opens
*/


/*  Launchpad page setup component
 *
 *  Contains code in main.js and eventPage.js
 */
var Page = function() {
    this.positions = {};

    this.checkStates = function() {

        if (!localStorage['version'] || localStorage['version'] < chrome.app.getDetails().version) {
            this.upgradeMemory();
            localStorage['version'] = chrome.app.getDetails().version;
        }
    }

    this.launchBackground = function() {
        var id = chrome.app.getDetails().id;
        window.open('chrome-extension://' + id + '/background.html');
    }

    // uses bootbox.min.js to provide a nice UI for the login prompt
    this.promptLogin = function() {
        bootbox.prompt("Please enter Epic e-mail address:", function(result) {
            if (result === null) {
                console.log("User hit cancel on login prompt.");
            } else {
                var userName = result;
                var userRegex = new RegExp(/.*@epicgames.com/g);
                // check if the username is valid else prompt them to login
                if(userRegex.test(userName)) {
                    bootbox.alert({size: "small", message: "Successful!"});
                    localStorage['user'] = result;
                    $("#login-prompt").text(result);
                } else {
                    page.promptLogin();
                    return;
                }
            }
        });
    }

    this.setup = function() {
        var that = this;
        // check the extension version & upgrade plus first run status
        this.checkStates();

        // Add a listener on the "Epic Launchpad" title to reload the page
        $('.navbar-brand').click(function(){
            window.location.reload();
        });

        // Add a listener on the "Epic Launchpad" title to reload the page
        $('#logo').click(function(){
            chrome.tabs.create({'url' : 'chrome://extensions'});
        })

        $(window).resize(function() {
            $('#status').css('height', window.innerHeight-145);
        });

        $(window).resize(function() {
            $('#statuses').css('height', window.innerHeight-200);
        });

        // This loads the hotkeys.html page into the main frame if the Hotkeys button is clicked on.
        $("#hotkeys-dropdown").click(function(event){
            $('a.hotkeys-button').dropdown("toggle");
            // added this line to stop event from bubbling up the DOM tree and executing twice
            event.stopPropagation();
            hotKeys.loadHotkeysHtml();
        });

        // Settings > About drop-down
        $("#about-dropdown").click(function(event){
            $('a.about-button').dropdown("toggle");
            event.stopPropagation();
            about.loadAboutHtml();
        });

        // This handles the Login component.
        $("#login-prompt").click(function(event){
            event.stopPropagation();  // added this line to stop event from bubbling up the DOM tree and executing twice
            var loggedOut = true;
            var userName = localStorage['user'];
            var userRegex = new RegExp(/.*@epicgames.com/g);

            // Check if the user is logged in and looks like a valid Epic user, ask the user if they want to re-login, else prompt them to login
            if(userRegex.test(userName)) {
                loggedOut = false;
                bootbox.confirm("You're already logged in. Click OK to LOG OUT.", function(result) {
                    loggedOut = result;
                    if(loggedOut) {
                        delete localStorage['user'];
                        $("#login-prompt").text("Login");
                    }
                });
            } else {
                page.promptLogin();
            }
        });

        // If there the user is logged in, show their username instead of "Login" in the navbar.
        if(localStorage['user']){
            $("#login-prompt").text(localStorage['user']);
        }
    }

    this.notify = function(title, text, timeout = 2000) {
        var notification_data = {
            'type' : 'basic',
            'title' : title,
            'iconUrl' : 'icons/icon32.png',
            'message' : text,
            'timeout' : timeout
        }
        chrome.runtime.sendMessage({'command' : 'page-notify', 'notification' : notification_data});
    }

    this.upgradeMemory = function() {
        console.log("upgradeMemory was run, but it doesn't have any code.");
    }
};

/*  Hotkey manager component
 *
 *  Contains code in main.js and eventPage.js
 *  eventPage.js handles opening pages so it always works in omnibox
 */
var hotKeyManager = function(callback) {
    this.ready = false;
    this.saving = false;
    this.savedHotkeys = [];

    this.readyToSave = function() {
        $('#hotkey-space').hide();
        $('#hotkey-ready').show();
        this.saving = true;
    }

    this.instructions = function() {
        $('#hotkey-url').val('');
        $('#hotkey-ready').hide();
        $('#hotkey-instructions').show();
        var that = this;
        setTimeout(function(){
            that.backToDefault();
        }, 8000);
    }

    this.backToDefault = function() {
        $('#hotkey-instructions').hide()
        $('#hotkey-space').show();
        this.saving = false;
    }
        this.savedHotkeys = [];

    this.update = function() {
        // Updates the local memory with data from localstorage
        if (localStorage.savedHotkeys) {
            this.savedHotkeys = JSON.parse(localStorage.savedHotkeys);
        }
    }

    this.open = function(key) {
        chrome.tabs.create({'url' : this.savedHotkeys[key]});
    }

    this.init = function() {
        var that = this;
        chrome.omnibox.onInputChanged.addListener(function(text) {
            var key = text.charCodeAt(0);

            if (that.savedHotkeys[key]) {
                that.open(key);
            } else {
                console.log('cant find any hotkey like that');
            }
        });
        this.update();
    }

    this.save = function(key) {
        this.savedHotkeys[key] = this.collect();
        localStorage.savedHotkeys = JSON.stringify(this.savedHotkeys);
        chrome.runtime.sendMessage({'command' : 'hotkey-update'});
        this.instructions();
    }

    this.sendToBackground = function(key) {
        chrome.runtime.sendMessage({'command' : 'hotkey-open', 'key' : key});
    }

    this.loadHotkeysHtml = function() {
        console.log("loadHotkeysHtml is running");
        // inserts the hotkeys.html .settings div into index.html .main-panel
        var that = this;
        $(".main-body-panel").load("hotkeys.html .center-body", function(){
            // now that we have hotkeys.html loaded, run the init function
            that.init();
            $('.center-title').html("Hotkeys Manager");
            $('#reload-status').hide();
        });
    }

    this.init = function() {
        console.log("hotKeys.init is running.");
        var that = this;
        // Setup button click listner
        $("#hotkeys-dropdown").click(function(event) {
            $('a.hotkeys-button').dropdown("toggle");
            // added this to stop event from bubbling up the DOM tree and executing twice
            // event.stopPropagation();
            // that.readyToSave();
        });
        $('#go-hotkeys').click(function(event) {
            that.readyToSave();
        });
    }

    this.collect = function() {
        // Collect hot key url they are saving
        var val = document.getElementsByName('hotkey-url')[0].value;
        if (val.indexOf('http://') < 0 && val.indexOf('https://') < 0) {
            val = 'http://' + val;
        }
        return val;
    }
};

/*  Hotkey listener function definition
 *
 */
var activateKeyListener = function(){
    // Add listeners to page
    document.addEventListener('keypress',function(e){
        var listenerKey = '\\'.charCodeAt(0);
        if (e.charCode == listenerKey) {
            hotKeys.ready = true;
            return;
        }

        // Save this keystroke
        if (hotKeys.saving == true) {
            hotKeys.save(e.charCode);
            hotKeys.saving = false;
        }
        if (hotKeys.ready == false) return;

        // We are ready, so execute the hotkey
        hotKeys.sendToBackground(e.charCode);
        hotKeys.ready = false;
    });

    if (localStorage.savedHotkeys) {
        hotKeys.savedHotkeys = JSON.parse(localStorage.savedHotkeys);
    }
};


/*  JIRA component
 *  Contains code in main.js
 */
var JIRAIssueCreator = function() {
    this.currentUser = function() {
        if (!!localStorage['user']) {
            return localStorage['user'].split('@')[0];
        } else {
            return '';
        }
    };

    this.openLopsRelease = function() {
        window.open('','_blank');
    };


    this.init = function() {
        var that = this;
        document.getElementById('create-jira-lopsrelease').addEventListener('mouseup', function() {
            that.openLopsRelease();
        });
    };
};


/* About component
 *
 * Renders /Launchpad/extension/readme.md when user clicks Settings > About
 */
var AboutLaunchPad = function() {
    this.loadAboutHtml = function() {
        // Load readme.md into index.html .main-panel  -- note, this is not the root readme.md but /extension/readme.md (they ought to be identical though)
        $(".main-body-panel").load("readme.md", function(readmeText) {
            // About showdown: https://github.com/showdownjs/showdown/blob/master/README.md
            // About showdown's options: https://github.com/showdownjs/showdown/blob/master/README.md#valid-options
            var converter = new showdown.Converter();
            converter.setFlavor('github');
            converter.setOption('headerLevelStart', '2');
            converter.setOption('noHeaderId', true);
            converter.setOption('omitExtraWLInCodeBlocks', true);
            converter.setOption('tasklists', true);
            converter.setOption('smartIndentationFix', true);
            converter.setOption('disableForced4SpacesIndentedSublists', true);
            converter.setOption('simpleLineBreaks', true);
            converter.setOption('ghMentions', true);

            readmeHtml = converter.makeHtml(readmeText);
            readmeHtml = readmeHtml.autoLink();
            readmeHtml = readmeHtml.autoLinkJira();

            // Some dirty styling additions to make the markdown look a little better
            $(".main-body-panel").html(readmeHtml).css({ "padding": "15px" });
            $(".main-body-panel p").css({"padding": "10px"})

            $('.center-title').html("README.md");
            $('#reload-status').hide();
        });
    };
};

/* Statuses component
 *
 * Handles all status update, comment, and like functionality
 */
var Statuses = function() {
    var that = this;
    this.entries = [];
    this.user = '';
    this.body = '';
    this.keydown = null;
    this.md = new Remarkable();
    this.currentTeam = '';

    this.init = function(all) {
        chrome.storage.local.get('entries',function(data){
            userStatus.entries = JSON.parse(data['entries']);
            
            userStatus.init_continued(all);
        });
    }

    this.init_continued = function(all) {
        if (localStorage['user']) {
            this.user = localStorage['user'];
        }
        
        if (localStorage['currentTeam']) {
            this.currentTeam = localStorage['currentTeam'];
        } else {
            localStorage['currentTeam'] = 'all';
        }
        if (!localStorage['teams']) {
            localStorage['teams'] = '[]';
        }

        if (localStorage.getItem('status-read-posts') === null) {
            localStorage['status-read-posts'] = '{}';
        }

        var that = this;
        var journal_button = document.getElementById('go-journal');
        journal_button.addEventListener('mouseup', function(){
            // Require text in new status updates
            var emptyStatus = document.getElementsByName('status-body')[0];
            // Trim spaces to avoid empty messages or workarounds
            if (emptyStatus.value.trim() == '') {
              bootbox.alert("Please enter text in the status update field.");
            } else {
              journal_button.style.display = 'none';
              that.put();
            }
        });

        document.getElementById('send-new').addEventListener('mouseup', function() {
            $('.markdown-formatted').removeClass("hidden");
            that.sendNewPrep();
        });

        document.getElementById('send-new').removeEventListener('mouseup', function() {
            that.sendNewPrep();
        });

        userField = {};
        userField.value = (localStorage['user']) ? localStorage['user'] : '';

        var bodyField = document.getElementsByName('status-body')[0];
        bodyField.value = (localStorage['status-current-body']) ? localStorage['status-current-body'] : '';
        bodyField.addEventListener('keyup', function(e) {
            localStorage['status-current-body'] = bodyField.value;
            // if user hits Esc key
            if (e.keyCode === 27){
                $('#submit-status').hide();
                $('#send-new').show();
                $('.markdown-formatted').addClass("hidden");
                $('#status').css('height', window.innerHeight-145);
                $('#statuses').css({"height": window.innerHeight-200});
            }
        });

        var statusesLi = document.getElementById('statuses');

        // only use scrollHelper if it's on the page load
        if(all){
            statusesLi.addEventListener('scroll', function(e){
                that.scrollHelper(statusesLi);
            });
        }

        // This adds key listeners to listen to CMD F
        // Writes all status messages in that case
        $(window).keydown(function(e) {
            if ( ( e.keyCode == 70 && ( e.ctrlKey || e.metaKey ) ) ||
                 ( e.keyCode == 191 ) ) {
                that.keydown = new Date().getTime();
            }

            return true;
        }).blur(function() {
            if ( that.keydown !== null ) {
                var delta = new Date().getTime() - that.keydown;
                if ( delta >= 0 && delta < 1500 ) {
                    that.populate(null, true);
                }

                that.keydown = null;
            }
        });

        var markdownButton = document.getElementById('is-status-markdown');
        if (localStorage.getItem('status-markdown-checked') === null) {
            localStorage['status-markdown-checked'] = false;
        }

        markdownButton.checked = (localStorage['status-markdown-checked'] == 'false') ? false : true;

        markdownButton.addEventListener('click', function(e){
            localStorage['status-markdown-checked'] = e.target.checked;
        });

        $('#reload-status').click(function(){
            chrome.runtime.sendMessage({command: 'status-message-update'});
            page.notify('Hear this...', 'Fetching latest status messages, reloading this page when complete...');
        });

        // Write teams to filter
        var teams = JSON.parse(localStorage['teams']);
        var filter_container = document.getElementById('filter-on-teams');
        
        for (var team in teams) {
            var el = document.createElement('span');
            
            el.setAttribute('class', 'filter');
            el.innerHTML = teams[team];
            el.setAttribute('id', 'filter-' + teams[team].toLowerCase().replace(/ /g,'_'));
            $(el).data('team', teams[team]);
            
            $(el).click(function(e){
                userStatus.currentTeam = $(e.target).data('team');
                localStorage['currentTeam'] = userStatus.currentTeam;
                window.location.reload();
            });
            
            if (teams[team] == userStatus.currentTeam) {
                $(el).addClass('bold');
            }
            
            filter_container.appendChild(el);
        }
        
        if (userStatus.currentTeam == 'all') {
            $('#filter-all').addClass('bold');
        }
        
        $('#filter-all').click(function(){
            userStatus.currentTeam = 'all';
            localStorage['currentTeam'] = 'all';
            window.location.reload();
        });

        if(all){
            this.populate(undefined,undefined,undefined,undefined,undefined,true);
        }
    }

    this.scrollHelper = function(statusesLi) {

        if (Math.ceil(Number(statusesLi.offsetHeight)) + Math.ceil(Number(statusesLi.scrollTop)) >= Math.ceil(Number(statusesLi.scrollHeight))) {
            //console.log('scroll triggered');
            // c.l('scroll triggered!');
            this.populate();
        }
    }

    this.sendNewPrep = function() {
        $('#send-new').hide();
        $('#statuses').css('height', window.innerHeight-370);
        $('#submit-status').show();
    }
    
    this.endpoint = function(method) {
        return '' + method + '.json';
    }

    this.findPostId = function(id, entries){
        //looping only 100 entries for performance concern
        for (var i = 0; i < 100; i++) {
            if(id == entries[i].id){
                return entries[i];
            }
        }
    }


    this.addComment = function(e) {
        if ($(e.target.parentNode.parentNode).find('.comment-input').length) {
            return;
        }
        var commentInput = document.createElement('textarea');
        $(commentInput).addClass('comment-input');

        commentInput.setAttribute('placeholder', 'Type your comment, then press enter to send...');
        commentInput.addEventListener('keydown', userStatus.sendComment);

        $(commentInput).data('id', $(e.target).data('id'));

        $(e.target.parentNode.parentNode).children('.status-content-div').append(commentInput);
        $(commentInput).focus();
    }

    this.sendComment = function(e) {
        // if user hits Enter key
        if (e.which == 13) {
            if (localStorage.getItem('user') === null) {
                bootbox.alert("FAILED<br>Please Login first before attempting to submit a status update.");
                return;
            }
            // Require text in new comments
            var emptyComment = $(e.target.parentNode.parentNode).find('.comment-input');
            // Trim spaces to avoid empty messages or workarounds
            if ($.trim($(emptyComment).val()) == '') {
              bootbox.alert("Please enter text in the comment field.");
              // Prevent the carat from shifting to the new line
              e.preventDefault();
              // TODO: Autofocus on comment field after alert
              return false;
            }
            
            e.preventDefault();
            e.target.setAttribute('disabled', true);
            userStatus.createComment($(e.target.parentNode.parentNode).find('.status-comments')[0], {
                'user' : localStorage['user'],
                'body' : e.target.value,
                'date_created' : Math.floor(Date.now()/1000)
            });


        // if user hits Esc key
        if(e.which == 27){
            e.preventDefault();
            e.target.setAttribute('disabled', true);
            $(e.target.parentNode.parentNode).find('.comment-input').remove();
        }
    }

    this.createComment = function(parentEl, commentData) {
        var eachComment = document.createElement('div');
        var commenter = commentData['user'].split('@')[0] + ': ';
        var commenterSpan = document.createElement('span');
        $(commenterSpan).addClass('status-comment-username');
        $(commenterSpan).append(commenter);

        var commentText = commentData['body'];
        commentText = commentText.autoLink();
        commentText = commentText.autoLinkJira();
        //commentText = commentText.replace(/\n/g,'<br />');

        $(eachComment).append(commenterSpan);
        $(eachComment).append(commentText);
        $(eachComment).addClass('smaller');
        eachComment.setAttribute('title', 'Commented ' + moment.unix(commentData['date_created']).fromNow());
        $(parentEl).append(eachComment);
    }

    this.populate = function(start, endless, searchText, usernameFilter, teamFilter, pageLoad) {
        // console.log("this.populate was run. start:" + start + ", endless:" + endless + ", searchText:" + searchText + ",usernameFilter:" + usernameFilter);
        // Sometimes this is empty when first installing.. sucky hack
        console.log('attempting to populate');
        if (this.entries.length == 0) {
            return;
        }

        if (searchText === undefined && usernameFilter === undefined) {
            // console.log("no Search text, no Username filter");
            var readPosts = JSON.parse(localStorage['status-read-posts']);
            var statusList = document.getElementById('statuses');
            var startPoint = window.statusStartPoint || 0;
            if (endless == true) {
                var endPoint = this.entries.length - startPoint;
            } else {
                // TODO: Fix this hack
                // 55 entries makes sure that each team's entries are drawn on the page
                // when it skips over many other statuses from other teams
                // Issue is that scroll helper doesnt trigger to draw more if there is no scroll in the first place
                // Real fix is to calculate the size of inner li elements and compare to ul size
                var endPoint = startPoint + 55;
            }
            
            var calulated_endpoint = Math.min(endPoint,this.entries.length);
            
            for (var i = startPoint; i < calulated_endpoint; i++) {
                if (this.entries[i].team == this.currentTeam || this.currentTeam == 'all') {

                    var clr = document.createElement('div');
                    $(clr).addClass('clear');
                    var li = document.createElement('li');
                    var userDiv = document.createElement('div');
                    var contentDiv = document.createElement('div');
                    var bodySpan = document.createElement('div');
                    $(userDiv).addClass('pad-right float-left overflow-hidden margin-top-10 status-name-div');
                    $(contentDiv).addClass('status-content-div');
                    $(bodySpan).addClass('post-text float-left');

                    var userName = document.createElement('span');
                    $(userName).addClass('status-username');
                    var timeAgo = document.createElement('div');
                    $(timeAgo).addClass('time-ago');
                    $(timeAgo).html(moment.unix(this.entries[i].date_created).calendar());
                    var shortUserName = this.entries[i].user == "muz.husain@epicgames.com" ? "Shank: " : this.entries[i].user.split('@')[0].split('.')[0] + ': ';
                    $(userName).html(shortUserName);
                    var statusBody = this.entries[i].body;

                    if (this.entries[i].hasOwnProperty('is_markdown') == true && this.entries[i]['is_markdown'] == 'true') {
                        statusBody = this.md.render(statusBody);
                    } else {
                        statusBody = statusBody.replace(/\n/g,'<br />');
                    }
                    statusBody = statusBody.autoLinkJira();
                    statusBody = statusBody.autoLink();
                    $(bodySpan).html(statusBody);

                    var commentOnDiv = document.createElement('div');
                    commentOnDiv.innerHTML = 'Comment';
                    $(commentOnDiv).addClass('pointer smaller padded');
                    $(commentOnDiv).data('id', post_id);

                    commentOnDiv.addEventListener('click', this.addComment);

                    $(userDiv).append(userName);
                    $(userDiv).append(timeAgo);
                    $(userDiv).append(commentOnDiv);

                    $(li).append(userDiv);
                    $(li).append(contentDiv);

                    // Decide if unread
                    if (readPosts.hasOwnProperty(post_id) == false) {
                        $(li).addClass('unread');
                    }
                    $(li).data('id', post_id);
                    li.addEventListener('mouseenter', this.markAsRead);

                    $(contentDiv).append(bodySpan);
                    $(contentDiv).append(clr);
                    // If comments exist, add them
                    var commentsList = document.createElement('div');
                    $(commentsList).addClass('status-comments');
                    if (this.entries[i].hasOwnProperty('comments') == true) {
                        for (var k = 0; k < this.entries[i]['comments'].length; k++) {
                            this.createComment(commentsList, this.entries[i]['comments'][k]);
                        }
                    }
                    $(contentDiv).append(commentsList);
                    $(statusList).append(li);
    
                    var clearBoth = document.createElement('div');
                    clearBoth.setAttribute('style','clear:both;');
                    $(statusList).append(clearBoth);
                }
            }
        }
        window.statusStartPoint = endPoint;
        
    };
    // TODO: search & filter
    // this.populateSearch = function(searchText) {
    //     this.populate(null, null, searchText, undefined);
    //     console.log("populateSearch executed, searchText is " + searchText);
    // };

    // this.populateFilter = function(usernameFilter) {
    //     this.populate(null, null, undefined, usernameFilter)
    // };

    // this.populateFilterAndSearch = function(searchText, usernameFilter) {
    //     this.populate(null, null, searchText, usernameFilter)
    // };

    this.markAsRead = function(e) {
        var readPosts = JSON.parse(localStorage['status-read-posts']);
        $(e.target).removeClass('unread');
        readPosts[$(e.target).data('id')] = {};
        localStorage['status-read-posts'] = JSON.stringify(readPosts);
    };

    this.collectValidateUsername = function() {
        if (localStorage['user'] == '' || !localStorage['user'] == undefined) {
            alert('Please login first.');
            return false;
        }

        return localStorage['user'];
    }

    this.collect = function() {
        var userName = this.collectValidateUsername();

        if (!userName) {
            $('#go-journal').show();
            bootbox.alert("Ooops! You're not logged in.")
            return false;
        }

        var titleText = 'Daily Journal';//document.getElementsByName('title')[0].value;
        var bodyTxt = document.getElementsByName('status-body')[0].value;

        // Save the username for next time
        this.user = userName;
        localStorage['user'] = userName;
        var company_id = localStorage['current_company_id'];

        var is_markdown = localStorage['status-markdown-checked'];

        return {
            'user' : userName,
            'title' : titleText,
            'body' : bodyTxt,
            'version' : chrome.app.getDetails().version,
            'companyId' : company_id,
            'isMarkdown' : is_markdown
        }
    }

    this.put = function() {
        var statusContent = this.collect();

        if (!statusContent) {
            return;
        }

        $.post(this.endpoint('put'), statusContent, function(resp){
            if (resp == 'true') {
                // Clear the memory
                localStorage['status-current-body'] = '';

                $('#submit-status').hide();
                $('#statuses').show();
                $('#send-new').show();

                // Send a message to the background page for it to fetch updates
                chrome.runtime.sendMessage({command: 'status-message-update'});
            } else {
                alert('looks like it didnt go through');
            }
        });
    }
}


    // Helper function which provides some date values as properties, along with a constructor function "getDatesThisWeek"
    this.calendar = {
        "startDate": moment().startOf('day'),
        "endDate": moment().day("Friday").format('YYYY-MM-DD'),
        "datesThisWeek" : [],
        "getDatesThisWeek": function(){
            var e = moment().day("Friday").day();
            var s = moment().day()
            while(e >= s){
                this.datesThisWeek.push(moment().day(s).format('YYYY-MM-DD'));
                s++;
            }
            return this.datesThisWeek;  // e.g. ["2016-12-21","2016-12-22","2016-12-23"] -- only dates left in the week, including today
        },
    };

/* Tools Component
 *
 *
 */

// This should log things only if you set c.on = true; Default is off. Should take any number of arguments...
var LogController = function() {
    this.on = false;
    this.l = function() {
        if (this.on == true) {
            console.log('---log start----');
            for (var i = 0; i < arguments.length; i++) {
                console.log(arguments[i]);
            }
            console.log('----log end-----');
        }
    }
}

// Handler to get the status.html page loaded and run the Statuses.init function
var activateStatusComponent = function(all){
    $(".main-body-panel").load("status.html .settings", function(){
        event.stopPropagation();  // added this line to stop event from bubbling up the DOM tree and executing twice
        userStatus.init(all);
        //$(".main-body-panel").attr('settings', 'settings-finished');
    });
};


/*
 * Setup message passing listener
 *
 * There is only one listener needed, everything belongs in the if else
 *
 */
chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
    if (request.command == 'reload-page') {
        sendResponse({ 'farewell' : 'goodbye' });
        window.location.reload();
    } else if (request.command == 'hotkey-open') {
        // OPEN A HOTKEY
        hotKeys.open(request['key']);
        sendResponse({ 'farewell' : 'goodbye' });
    }  else if (request.command == 'hotkey-update') {
        // UPDATE SAVED HOTKEYS FROM LOCALSTORAGE
        hotKeys.update();
        sendResponse({ 'farewell' : 'goodbye' });
    }
});


/* 
 * Helper functions
 */
var sortBy = (function() {
    const _defaults = {
        parser: (x) => x,
        desc: false
    };
    const isObject = (o) => o !== null && typeof o === "object";
    const isDefined = (v) => typeof v !== "undefined";
    function getItem(x) {
        const isProp = isObject(x) && isDefined(x[this.prop]);
        return this.parser(isProp ? x[this.prop] : x);
    }

    return function(array, options) {
        if (!(array instanceof Array) || !array.length)
            return [];
        const opt = Object.assign({}, _defaults, options);
        opt.desc = opt.desc ? -1 : 1;
        return array.sort(function(a, b) {
            a = getItem.call(opt, a);
            b = getItem.call(opt, b);
            return opt.desc * (a < b ? -1 : +(a > b));
        });
    };
}());


/*
 * Runtime stuff!  Be careful changing the order of things here.
 */
var callbacks = $.Callbacks();
var page = new Page();
var hotKeys = new hotKeyManager();
var jiraIssueCreator = new JIRAIssueCreator();
var userStatus = new Statuses();
var c = new LogController();
var about = new AboutLaunchPad();

// Activate this immediately for snappiest experience
activateStatusComponent(true);

// These functions may depend on elements in index.html and need to execute only after the window is finished loading.
window.onload = function(){
    page.setup();
    activateKeyListener();
    jiraIssueCreator.init();
    confluenceAPI.init();
    accounts.init();
    whosOut.init();
    tickets.init();
    
    // hack to delay setting the height until after the page has fully loaded
    setTimeout(function(){

        $('#status').css('height', window.innerHeight-145);
        $('#statuses').css('height', window.innerHeight-200);
    }, 10);
}
