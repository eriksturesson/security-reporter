"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePdfFromHtml = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * FIX #10: Secure Puppeteer configuration
 * FIXED: Running Puppeteer without sandbox (security risk)
 */
const savePdfFromHtml = async (htmlPath, outputPath) => {
    const finalPdf = outputPath || path.join(process.cwd(), "reports", "security-report.pdf");
    // Try to require puppeteer dynamically
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        let puppeteer;
        let usingCore = false;
        try {
            puppeteer = require("puppeteer");
        }
        catch (e) {
            // try puppeteer-core (no chromium download) — require executable path to be set
            try {
                puppeteer = require("puppeteer-core");
                usingCore = true;
            }
            catch (err) {
                throw new Error("Puppeteer not available. Install 'puppeteer' or 'puppeteer-core' and ensure PUPPETEER_EXECUTABLE_PATH is set when using puppeteer-core");
            }
        }
        // FIX: Only disable sandbox in Docker environments
        const isDocker = process.env.DOCKER_CONTAINER === "true" || fs.existsSync("/.dockerenv");
        const launchOptions = {
            headless: true,
            timeout: 30000,
            ignoreHTTPSErrors: false,
        };
        // Only disable sandbox if we're actually in Docker
        if (isDocker) {
            console.log("[Security] Running in Docker - disabling sandbox");
            launchOptions.args = ["--no-sandbox", "--disable-setuid-sandbox"];
        }
        else {
            // Run with sandbox enabled for security
            launchOptions.args = [];
        }
        // Use isolated temporary profile
        const tempDir = path.join(os.tmpdir(), `puppeteer-${Date.now()}`);
        launchOptions.userDataDir = tempDir;
        // Allow overriding executable path (required for puppeteer-core)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        else if (usingCore && !launchOptions.executablePath) {
            // When using puppeteer-core, we require an executable path to be set
            throw new Error("puppeteer-core detected but PUPPETEER_EXECUTABLE_PATH is not set. Set it to your Chrome/Chromium binary path.");
        }
        const browser = await puppeteer.launch(launchOptions);
        try {
            const page = await browser.newPage();
            // FIX: Don't bypass CSP
            await page.setBypassCSP(false);
            // FIX: Block external resources for security
            await page.setRequestInterception(true);
            const fileUrl = `file://${path.resolve(htmlPath)}`;
            page.on("request", (request) => {
                const url = request.url();
                // Only allow the HTML file itself
                if (url === fileUrl || url.startsWith("file://")) {
                    request.continue();
                }
                else {
                    // Block all external resources (network requests)
                    console.log(`[Security] Blocked external resource: ${url}`);
                    request.abort();
                }
            });
            // Navigate with timeout
            await page.goto(fileUrl, {
                waitUntil: "networkidle0",
                timeout: 10000,
            });
            // Generate PDF
            await page.pdf({
                path: finalPdf,
                format: "A4",
                printBackground: true,
                margin: {
                    top: "20px",
                    right: "20px",
                    bottom: "20px",
                    left: "20px",
                },
            });
            return finalPdf;
        }
        finally {
            // Always close browser
            await browser.close();
            // Clean up temp directory
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            catch (err) {
                // Ignore cleanup errors
            }
        }
    }
    catch (err) {
        throw new Error("Puppeteer not available or failed to generate PDF. Install 'puppeteer' with: npm install puppeteer --save-optional");
    }
};
exports.savePdfFromHtml = savePdfFromHtml;
//# sourceMappingURL=pdf-reporter.js.map