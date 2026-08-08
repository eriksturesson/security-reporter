"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDashboard = exports.formatTrend = exports.listAllProjects = exports.recordRun = exports.saveHtmlReport = exports.reportToHtml = exports.getExitCode = exports.reportToMarkdown = exports.reportToJson = exports.reportToTerminal = exports.runValidation = void 0;
var validators_1 = require("./core/validators");
Object.defineProperty(exports, "runValidation", { enumerable: true, get: function () { return validators_1.runValidation; } });
var reporter_1 = require("./core/reporter");
Object.defineProperty(exports, "reportToTerminal", { enumerable: true, get: function () { return reporter_1.reportToTerminal; } });
Object.defineProperty(exports, "reportToJson", { enumerable: true, get: function () { return reporter_1.reportToJson; } });
Object.defineProperty(exports, "reportToMarkdown", { enumerable: true, get: function () { return reporter_1.reportToMarkdown; } });
Object.defineProperty(exports, "getExitCode", { enumerable: true, get: function () { return reporter_1.getExitCode; } });
var html_reporter_1 = require("./core/html-reporter");
Object.defineProperty(exports, "reportToHtml", { enumerable: true, get: function () { return html_reporter_1.reportToHtml; } });
Object.defineProperty(exports, "saveHtmlReport", { enumerable: true, get: function () { return html_reporter_1.saveHtmlReport; } });
var history_1 = require("./core/history");
Object.defineProperty(exports, "recordRun", { enumerable: true, get: function () { return history_1.recordRun; } });
Object.defineProperty(exports, "listAllProjects", { enumerable: true, get: function () { return history_1.listAllProjects; } });
Object.defineProperty(exports, "formatTrend", { enumerable: true, get: function () { return history_1.formatTrend; } });
Object.defineProperty(exports, "formatDashboard", { enumerable: true, get: function () { return history_1.formatDashboard; } });
//# sourceMappingURL=index.js.map