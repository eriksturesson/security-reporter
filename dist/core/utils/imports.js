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
exports.resolveRelativeImport = exports.extractImportSpecifiers = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const IMPORT_RE = /\b(?:require\s*\(\s*|from\s+|import\s*\()\s*['"`]([^'"`]+)['"`]/g;
/** Extract the module specifiers referenced via import/require in a source file. */
const extractImportSpecifiers = (content) => {
    const specifiers = [];
    IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE.exec(content))) {
        specifiers.push(match[1]);
    }
    return specifiers;
};
exports.extractImportSpecifiers = extractImportSpecifiers;
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
/** Resolve a relative import specifier to a file within `root`, or null if it doesn't resolve. */
const resolveRelativeImport = (fromFile, specifier, root) => {
    const target = path.resolve(path.dirname(fromFile), specifier);
    const projectRoot = path.resolve(root);
    const candidates = [
        target,
        ...CODE_EXTENSIONS.map((ext) => `${target}${ext}`),
        ...CODE_EXTENSIONS.map((ext) => path.join(target, `index${ext}`)),
    ];
    for (const candidate of candidates) {
        try {
            if (fs.statSync(candidate).isFile()) {
                const resolved = path.resolve(candidate);
                return resolved.startsWith(projectRoot) ? resolved : null;
            }
        }
        catch {
            // candidate doesn't exist, try the next one
        }
    }
    return null;
};
exports.resolveRelativeImport = resolveRelativeImport;
//# sourceMappingURL=imports.js.map