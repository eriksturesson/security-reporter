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
exports.SOURCE_FILE_EXTENSIONS = exports.countProjectFiles = exports.walkProjectFiles = exports.DEFAULT_EXCLUDE_DIRS = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Directories that are never worth scanning: build output, package caches,
 * VCS metadata. Kept separate from the caller's own excludes so every check
 * shares the same baseline instead of redefining it.
 */
exports.DEFAULT_EXCLUDE_DIRS = new Set([
    "node_modules",
    ".git",
    ".hg",
    ".svn",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".nuxt",
    ".turbo",
    ".cache",
    ".parcel-cache",
    "vendor",
    "reports",
]);
const MAX_DEPTH = 20;
/**
 * Recursively walk a project directory, staying within `root`.
 *
 * Carries over the path-traversal and symlink protections from the original
 * secrets scanner (which used to only walk <root>/src): resolved paths are
 * verified to stay inside root, symlinks are never followed, and hidden
 * directories are skipped unless explicitly excluded.
 */
const walkProjectFiles = (root, options) => {
    var _a;
    const projectRoot = path.resolve(root);
    const excludeDirs = new Set([...exports.DEFAULT_EXCLUDE_DIRS, ...(options.excludeDirs || [])]);
    const maxFileSize = (_a = options.maxFileSize) !== null && _a !== void 0 ? _a : 10 * 1024 * 1024;
    const visit = (dir, depth) => {
        if (depth > MAX_DEPTH) {
            return;
        }
        const normalizedDir = path.resolve(dir);
        if (!normalizedDir.startsWith(projectRoot)) {
            return;
        }
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (entry.isSymbolicLink()) {
                continue;
            }
            const filePath = path.join(dir, entry.name);
            const resolvedPath = path.resolve(filePath);
            if (!resolvedPath.startsWith(projectRoot)) {
                continue;
            }
            if (entry.isDirectory()) {
                if (excludeDirs.has(entry.name) || entry.name.startsWith(".")) {
                    continue;
                }
                visit(filePath, depth + 1);
            }
            else if (entry.isFile() && options.extensions.test(entry.name)) {
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.size > maxFileSize) {
                        continue;
                    }
                }
                catch {
                    continue;
                }
                options.onFile(filePath);
            }
        }
    };
    visit(projectRoot, 0);
};
exports.walkProjectFiles = walkProjectFiles;
/** Count files matching `extensions` under root, using the same excludes as walkProjectFiles. */
const countProjectFiles = (root, extensions, excludeDirs) => {
    let count = 0;
    (0, exports.walkProjectFiles)(root, {
        extensions,
        excludeDirs,
        onFile: () => {
            count++;
        },
    });
    return count;
};
exports.countProjectFiles = countProjectFiles;
exports.SOURCE_FILE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|env|sh)$/i;
//# sourceMappingURL=fs-scanner.js.map