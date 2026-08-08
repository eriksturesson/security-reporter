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
exports.formatDashboard = exports.formatTrend = exports.listAllProjects = exports.recordRun = exports.getHistoryDir = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const MAX_RUNS_PER_PROJECT = 100;
/**
 * Where cross-repo history lives. Deliberately outside any single project
 * directory, since the point is to remember across many repos. Only
 * aggregate counts are stored — never file paths, snippets, or secrets — so
 * this stays safe to keep even for private client codebases.
 */
const getHistoryDir = () => {
    const base = process.env.SECURITY_REPORTER_HOME || path.join(os.homedir(), ".security-reporter");
    const dir = path.join(base, "history");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
};
exports.getHistoryDir = getHistoryDir;
const projectKey = (projectRoot) => {
    return crypto.createHash("sha256").update(path.resolve(projectRoot)).digest("hex").slice(0, 16);
};
const historyFilePath = (projectRoot) => {
    return path.join((0, exports.getHistoryDir)(), `${projectKey(projectRoot)}.json`);
};
const loadProjectHistory = (projectRoot) => {
    const file = historyFilePath(projectRoot);
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return {
            projectRoot: path.resolve(projectRoot),
            projectName: path.basename(path.resolve(projectRoot)),
            runs: [],
        };
    }
};
/**
 * Append this run's summary to the project's local history and return the
 * previous run (if any) so the caller can show a trend.
 */
const recordRun = (report, projectRoot) => {
    const history = loadProjectHistory(projectRoot);
    const previous = history.runs[history.runs.length - 1];
    const criticalCount = report.checks.filter((c) => c.severity === "critical" && c.status === "fail").length;
    const entry = {
        timestamp: report.timestamp instanceof Date ? report.timestamp.toISOString() : new Date().toISOString(),
        overallStatus: report.overallStatus,
        summary: report.summary,
        criticalCount,
        executionTime: report.executionTime,
    };
    history.runs.push(entry);
    if (history.runs.length > MAX_RUNS_PER_PROJECT) {
        history.runs = history.runs.slice(-MAX_RUNS_PER_PROJECT);
    }
    fs.writeFileSync(historyFilePath(projectRoot), JSON.stringify(history, null, 2));
    return { entry, previous };
};
exports.recordRun = recordRun;
/** All projects this tool has ever scanned on this machine, most recently scanned first. */
const listAllProjects = () => {
    const dir = (0, exports.getHistoryDir)();
    let files = [];
    try {
        files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    }
    catch {
        return [];
    }
    const projects = files
        .map((f) => {
        try {
            return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        }
        catch {
            return null;
        }
    })
        .filter((p) => p !== null && p.runs.length > 0);
    return projects.sort((a, b) => {
        var _a, _b;
        const aLast = ((_a = a.runs[a.runs.length - 1]) === null || _a === void 0 ? void 0 : _a.timestamp) || "";
        const bLast = ((_b = b.runs[b.runs.length - 1]) === null || _b === void 0 ? void 0 : _b.timestamp) || "";
        return bLast.localeCompare(aLast);
    });
};
exports.listAllProjects = listAllProjects;
/** One-line human-readable trend vs the previous run, or null if there's nothing to compare against. */
const formatTrend = (entry, previous) => {
    if (!previous)
        return null;
    const diffFailed = entry.summary.failed - previous.summary.failed;
    const diffWarn = entry.summary.warnings - previous.summary.warnings;
    const diffCritical = entry.criticalCount - previous.criticalCount;
    const parts = [];
    if (diffCritical !== 0)
        parts.push(`${diffCritical > 0 ? "+" : ""}${diffCritical} critical`);
    if (diffFailed !== 0)
        parts.push(`${diffFailed > 0 ? "+" : ""}${diffFailed} failed`);
    if (diffWarn !== 0)
        parts.push(`${diffWarn > 0 ? "+" : ""}${diffWarn} warnings`);
    const when = new Date(previous.timestamp).toLocaleDateString();
    if (parts.length === 0)
        return `No change since last scan (${when})`;
    return `${parts.join(", ")} since last scan on ${when}`;
};
exports.formatTrend = formatTrend;
const statusIcon = (status) => {
    switch (status) {
        case "fail":
            return "❌";
        case "warn":
            return "⚠️ ";
        case "pass":
            return "✅";
        default:
            return "⏭️ ";
    }
};
/** Render the "all repos I've scanned" table for the terminal. */
const formatDashboard = (projects, options) => {
    var _a;
    const professional = (_a = options === null || options === void 0 ? void 0 : options.professional) !== null && _a !== void 0 ? _a : false;
    if (projects.length === 0) {
        return "No scan history yet. Run a scan first (history is recorded automatically unless --no-history is passed).";
    }
    const lines = [];
    lines.push(professional ? "TRACKED PROJECTS" : "🗂️  TRACKED PROJECTS");
    lines.push("");
    projects.forEach((project) => {
        const last = project.runs[project.runs.length - 1];
        const prev = project.runs[project.runs.length - 2];
        const icon = professional ? "" : statusIcon(last.overallStatus);
        const when = new Date(last.timestamp).toLocaleString();
        lines.push(`${icon} ${project.projectName} — ${last.overallStatus.toUpperCase()}`.trim());
        lines.push(`   ${project.projectRoot}`);
        lines.push(`   Last scan: ${when} · ${last.summary.failed} failed, ${last.summary.warnings} warnings, ${last.criticalCount} critical`);
        const trend = (0, exports.formatTrend)(last, prev);
        if (trend) {
            lines.push(`   Trend: ${trend}`);
        }
        lines.push(`   Runs recorded: ${project.runs.length}`);
        lines.push("");
    });
    return lines.join("\n");
};
exports.formatDashboard = formatDashboard;
//# sourceMappingURL=history.js.map