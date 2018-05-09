var TimeManager = function() {
    this.init = function() {
        this.setTimes();
        var that = this;
        setInterval(that.setTimes, 1000);
    }
    this.setTimes = function() {
        var pst = moment.tz('America/Los_Angeles').format('h:mm:ss a');
        var est = moment.tz('America/New_York').format('h:mm:ss a');
        var utc = moment.tz('Atlantic/Reykjavik').format('h:mm:ss a');
        var hkt = moment.tz('Asia/Hong_Kong').format('h:mm:ss a');
        $('#pst').html(pst);
        $('#est').html(est);
        $('#utc').html(utc);
        $('#hkt').html(hkt);
    }
}
var times = new TimeManager();
times.init();