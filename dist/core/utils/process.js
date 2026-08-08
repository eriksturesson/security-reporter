"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeParseJSON = exports.sanitizeNpmOutput = exports.spawnCommand = void 0;
const child_process_1 = require("child_process");
const project_root_1 = require("./project-root");
/**
 * Safe command spawning helper. Uses spawn() with an argument array instead
 * of exec()/a shell string, so arguments can never be interpreted as shell
 * syntax (command injection).
 */
const spawnCommand = (command, args, options = {}) => {
    return new Promise((resolve, reject) => {
        const { timeout = 30000, maxBuffer = 10 * 1024 * 1024 } = options;
        // Windows needs .cmd extension and shell for npm
        const isWindows = process.platform === "win32";
        const cmd = isWindows && command === "npm" ? "npm.cmd" : command;
        const proc = (0, child_process_1.spawn)(cmd, args, {
            cwd: (0, project_root_1.getProjectRoot)(),
            env: process.env,
            shell: isWindows,
        });
        let stdout = "";
        let stderr = "";
        let killed = false;
        const timer = setTimeout(() => {
            killed = true;
            proc.kill();
            reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
        proc.stdout.on("data", (data) => {
            stdout += data.toString();
            if (stdout.length > maxBuffer) {
                killed = true;
                proc.kill();
                reject(new Error(`Output exceeded maxBuffer (${maxBuffer} bytes)`));
            }
        });
        proc.stderr.on("data", (data) => {
            stderr += data.toString();
            if (stderr.length > maxBuffer) {
                killed = true;
                proc.kill();
                reject(new Error(`Error output exceeded maxBuffer (${maxBuffer} bytes)`));
            }
        });
        proc.on("close", (code) => {
            clearTimeout(timer);
            if (!killed) {
                if (code === 0 || code === 1) {
                    // npm audit/ls/outdated return 1 when findings exist; that's not a failure to run
                    resolve({ stdout, stderr, code: code || 0 });
                }
                else {
                    const error = new Error(`Command failed with exit code ${code}`);
                    error.stdout = stdout;
                    error.stderr = stderr;
                    error.code = code;
                    reject(error);
                }
            }
        });
        proc.on("error", (err) => {
            clearTimeout(timer);
            if (!killed) {
                reject(err);
            }
        });
    });
};
exports.spawnCommand = spawnCommand;
/**
 * npm commands (especially on Windows) can print warnings/errors before the
 * JSON payload. Extract just the JSON part.
 */
const sanitizeNpmOutput = (output) => {
    if (!output || output.trim().length === 0) {
        return null;
    }
    try {
        JSON.parse(output);
        return output;
    }
    catch {
        // fall through to sanitization
    }
    const lines = output.split(/\r?\n/);
    let jsonStart = -1;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            jsonStart = i;
            break;
        }
    }
    if (jsonStart === -1) {
        return null;
    }
    let jsonEnd = -1;
    for (let i = lines.length - 1; i >= jsonStart; i--) {
        const trimmed = lines[i].trim();
        if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
            jsonEnd = i;
            break;
        }
    }
    if (jsonEnd === -1) {
        return null;
    }
    const result = lines.slice(jsonStart, jsonEnd + 1).join("\n");
    try {
        JSON.parse(result);
        return result;
    }
    catch {
        return null;
    }
};
exports.sanitizeNpmOutput = sanitizeNpmOutput;
const MAX_JSON_SIZE = 1024 * 1024; // 1MB
/** Safe JSON parsing with a size cap, for content from disk (package.json, config files). */
const safeParseJSON = (content, source) => {
    if (content.length > MAX_JSON_SIZE) {
        throw new Error(`${source} is too large (${content.length} bytes, max ${MAX_JSON_SIZE})`);
    }
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== "object" || parsed === null) {
            throw new Error(`${source} must contain a JSON object`);
        }
        return parsed;
    }
    catch (error) {
        throw new Error(`Failed to parse ${source}: ${error.message}`);
    }
};
exports.safeParseJSON = safeParseJSON;
//# sourceMappingURL=process.js.map