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
exports.getProjectRoot = void 0;
const path = __importStar(require("path"));
/**
 * Get the actual project root where the user ran the command.
 *
 * Resolution order:
 * 1. SECURITY_REPORT_ROOT - explicit override, useful when the tool is invoked
 *    from a wrapper script or a nested working directory.
 * 2. INIT_CWD - set by npm/npx to the directory the command was invoked from,
 *    even when the package itself runs from inside node_modules/.bin.
 * 3. process.cwd() - fallback for direct `node dist/cli.js` invocations.
 */
const getProjectRoot = () => {
    if (process.env.SECURITY_REPORT_ROOT) {
        return path.resolve(process.env.SECURITY_REPORT_ROOT);
    }
    if (process.env.INIT_CWD) {
        return process.env.INIT_CWD;
    }
    return process.cwd();
};
exports.getProjectRoot = getProjectRoot;
//# sourceMappingURL=project-root.js.map