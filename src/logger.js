/* global module */

function Logger() {
    //get from localStorage
    this.level = Logger.INFO;
}

Logger.TRACE = 1;
Logger.DEBUG = 2;
Logger.INFO = 3;
Logger.WARN = 4;
Logger.ERROR = 5;

Logger.prototype.setLevel = function(level) {
    this.level = level;
};

Logger.prototype.trace = function(message) {
    if (this.level <= Logger.TRACE) {
        var args = arguments;
        args[0] = "[TRACE] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.debug = function(message) {
    if (this.level <= Logger.DEBUG) {
        var args = arguments;
        args[0] = "[DEBUG] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.info = function(message) {
    if (this.level <= Logger.INFO) {
        var args = arguments;
        args[0] = "[INFO] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.warn = function(message) {
    if (this.level <= Logger.WARN) {
        var args = arguments;
        args[0] = "[WARN] "+message;
        console.log.apply(console, args);
    }
};

Logger.prototype.error = function(message) {
    if (this.level <= Logger.ERROR) {
        var args = arguments;
        args[0] = "[ERROR] "+message;
        console.log.apply(console, args);
    }
};


if (typeof module !== 'undefined') {
    module.exports = Logger;
}
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}
