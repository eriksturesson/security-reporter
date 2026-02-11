"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestChecks = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const root = process.cwd();
/**
 * Run all test-related checks
 */
const runTestChecks = async (config) => {
    const checks = [checkTestScript(config), checkBuildScript()];
    return Promise.all(checks);
};
exports.runTestChecks = runTestChecks;
/**
 * Check if tests are configured
 */
const checkTestScript = async (config) => {
    var _a;
    if (config.run === false) {
        return {
            name: "tests",
            status: "skip",
            severity: "info",
            message: "Test execution disabled",
        };
    }
    // Read package.json
    let pkg = {};
    try {
        const pkgRaw = await fs_1.default.promises.readFile(path_1.default.join(root, "package.json"), "utf8");
        pkg = JSON.parse(pkgRaw);
    }
    catch (e) {
        return {
            name: "tests",
            status: "warn",
            severity: "warning",
            message: "Unable to read package.json to determine test configuration",
            suggestions: ["Ensure package.json is present and valid"],
        };
    }
    const hasTestScript = typeof ((_a = pkg.scripts) === null || _a === void 0 ? void 0 : _a.test) === "string" && pkg.scripts.test.trim().length > 0;
    // Look for test files in common locations
    const testFiles = await findTestFiles(root, ["test", "tests", "src"]);
    if (!hasTestScript && testFiles.length === 0) {
        return {
            name: "tests",
            status: "warn",
            severity: "warning",
            message: "No tests configured",
            suggestions: [
                'Add a "test" script to package.json',
                "Create test files with .test.ts or .spec.ts extensions (e.g. test/, tests/ or src/)",
            ],
        };
    }
    if (hasTestScript && testFiles.length === 0) {
        return {
            name: "tests",
            status: "warn",
            severity: "warning",
            message: 'A "test" script is defined but no test files were found',
            suggestions: ["Create test files with .test.ts or .spec.ts extensions"],
        };
    }
    // pass
    return {
        name: "tests",
        status: "pass",
        severity: "info",
        message: `Tests configured (${testFiles.length} test file(s) found)`,
        details: { testFiles: testFiles.slice(0, 10) },
    };
};
const findTestFiles = async (rootDir, dirs) => {
    const matches = [];
    const exts = /(\.test\.ts$|\.spec\.ts$|\.test\.js$|\.spec\.js$)/i;
    for (const d of dirs) {
        const start = path_1.default.join(rootDir, d);
        try {
            await walkAndCollect(start, matches, exts);
        }
        catch (e) {
            // ignore missing dirs
        }
    }
    return matches;
};
/**
 * FIX #8: Add depth limit and cycle detection
 * FIXED: Potential infinite loop in directory traversal
 */
const MAX_DEPTH = 10;
const visitedInodes = new Set();
const walkAndCollect = async (dir, out, re, depth = 0) => {
    // FIX: Check depth limit
    if (depth > MAX_DEPTH) {
        console.warn(`[Security] Max depth ${MAX_DEPTH} reached at ${dir}`);
        return;
    }
    let stat;
    try {
        stat = await fs_1.default.promises.stat(dir);
    }
    catch (e) {
        return;
    }
    if (!stat.isDirectory())
        return;
    // FIX: Detect circular symlinks with inode tracking
    const inode = `${stat.dev}:${stat.ino}`;
    if (visitedInodes.has(inode)) {
        console.warn(`[Security] Circular link detected at ${dir}`);
        return;
    }
    visitedInodes.add(inode);
    // Validate we're still within project root
    const projectRoot = path_1.default.resolve(root);
    const currentDir = path_1.default.resolve(dir);
    if (!currentDir.startsWith(projectRoot)) {
        console.warn(`[Security] Directory outside project detected: ${dir}`);
        return;
    }
    let entries;
    try {
        entries = await fs_1.default.promises.readdir(dir, { withFileTypes: true });
    }
    catch (err) {
        // Ignore inaccessible directories
        return;
    }
    for (const e of entries) {
        const full = path_1.default.join(dir, e.name);
        // Skip symlinks to prevent traversal attacks
        if (e.isSymbolicLink()) {
            continue;
        }
        try {
            if (e.isDirectory()) {
                // Avoid node_modules and hidden directories
                if (e.name === "node_modules" || e.name.startsWith(".")) {
                    continue;
                }
                // Recurse with incremented depth
                await walkAndCollect(full, out, re, depth + 1);
            }
            else if (e.isFile()) {
                if (re.test(e.name)) {
                    const relativePath = full
                        .replace(root, "")
                        .replace(/^[\\\/]/, "")
                        .replace(/\\/g, "/");
                    out.push(relativePath);
                }
            }
        }
        catch (err) {
            // ignore individual file/dir errors
        }
    }
    // Remove inode from visited set when leaving this directory
    // This allows visiting the same inode through different paths (if legitimate)
    visitedInodes.delete(inode);
};
/**
 * Check if build script exists
 */
const checkBuildScript = async () => {
    var _a;
    const pkgPath = path_1.default.join(root, "package.json");
    try {
        const raw = await fs_1.default.promises.readFile(pkgPath, "utf8");
        const pkg = JSON.parse(raw);
        if ((_a = pkg.scripts) === null || _a === void 0 ? void 0 : _a.build) {
            return {
                name: "build",
                status: "pass",
                severity: "info",
                message: "Build script configured",
            };
        }
        return {
            name: "build",
            status: "warn",
            severity: "warning",
            message: "No build script found",
            suggestions: ['Add a "build" script if your project needs compilation'],
        };
    }
    catch (e) {
        return {
            name: "build",
            status: "warn",
            severity: "warning",
            message: "Unable to read package.json to determine build script",
            suggestions: ["Ensure package.json is present and valid"],
        };
    }
};
//# sourceMappingURL=tests.js.map