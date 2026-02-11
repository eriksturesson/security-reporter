"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveHtmlReport = exports.reportToHtml = exports.getExitCode = exports.reportToMarkdown = exports.reportToJson = exports.reportToTerminal = exports.runValidation = void 0;
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
//# sourceMappingURL=index.js.map