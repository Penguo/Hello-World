/**
Author: Sean Wendt, 2016-12-12

INSTRUCTIONS:

1.  Make sure you are logged in to Confluence first.
2.  Copy and paste this entire script into your Chrome dev console with Launchpad open.  It will automatically get the list of pages it needs to query from Confluence API.
3.  Once that is complete, execute `getAllLabels(size)` -- this will execute getLabels the correct number of times.
    If the page's labels includes one from `labels`, it will push the id to the exclude_ids array.
4.  Now wait, this make take a few minutes.  Once it's finished, the console will indicate it and print the array of ids to exclude.
5.  IMPORTANT: last step is to replace the exclude_ids array in main.js with these values.

**/

var WAIT_INTERVAL = 500; // milliseconds between API queries
var obj = {};
var results = [];
var resultSet = [];
var labels = ["parent", "archive", "no_update"];
var exclude_ids = [];
var numberOfResults = '500';
var size = 0;
var startIndex = 0;
var endpoint = 'https://chartboost.atlassian.net/wiki/rest/api/space/sup/content?type=page&limit=' + numberOfResults + '&start=' + startIndex;
var pagelink = "https://chartboost.atlassian.net/wiki";
var next = false;

// Initial page query
$.ajax({
    type: "GET",
    url: endpoint,
    contentType:"application/json; charset=utf-8",
    dataType: "json",
    success: function (response){
        results = response.page.results;
        // If there is a "next" object it means we need to make a second query as it's paginated
        if(response.page._links.next){
            console.log("response.page._links.next is " + response.page._links.next);
            next = true;
            startIndex = response.page.size;
        } else { 
            next = false;
        }
        size += response.page.size;
    },
    error : function(xhr, errorText){
        var responseInJson = (JSON.parse(xhr.responseText));
        console.log("Error getting articles! ", responseInJson);
    }
}).then(function(){
    if(next){
        endpoint = 'https://chartboost.atlassian.net/wiki/rest/api/space/sup/content?type=page&limit=' + numberOfResults + '&start=' + startIndex;
        $.ajax({
            type: "GET",
            url: endpoint,
            contentType:"application/json; charset=utf-8",
            dataType: "json",
            success: function (response){
                for(key in response.page.results){
                    results.push(response.page.results[key]);
                }
                size += response.page.size;
            },
            error : function(xhr, errorText){
                var responseInJson = (JSON.parse(xhr.responseText));
                console.log("Error getting articles! ", responseInJson);
            }
        }).then(function(){
            console.log("results.length is " + results.length);
            for(var i = 0; i < results.length; i++){
                obj.title = results[i].title;
                obj.id = results[i].id;
                obj.url = results[i]._links.self+'/label'
                resultSet.push(obj);
                // now reset obj for the next iteration!
                obj = {};
            }
            console.log("resultSet.length is " + resultSet.length);
        });
    }
});

// API query to get labels for a given page
var getLabels = function(index){
    $.ajax({
        type: "GET",
        url: resultSet[index].url,
        dataType: "json",
        async: false,
        success: function (response){
            console.log("Success!")
            extendedResults = response.results;
            for(var j = 0; j < extendedResults.length; j++){
                if (labels.includes(extendedResults[j].name)){
                    exclude_ids.push(resultSet[index].id);
                }
            }
        },
        error : function(xhr, errorText){
            var responseInJson = (JSON.parse(xhr.responseText));
            console.log("Error getting articles! ", responseInJson);
        }
    });
};

// Loops the API query with a pause between queries of WAITSECONDS
var getAllLabels = function(idx) {
    setTimeout(function() {
        getLabels(idx - 1);            
        if (--idx) { //  decrement idx and call getAllLabels again if i > 0
            getAllLabels(idx);
        } else { // if it's the last one, notify the user
            console.log("Finished!");
            console.log("Update the exclude_ids array in main.js with the following: ");
            console.log(exclude_ids);
        }
    }, WAIT_INTERVAL);
};