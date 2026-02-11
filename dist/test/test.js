"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
console.log("Running basic smoke tests");
// Simple smoke test to ensure test runner is wired up
assert_1.default.strictEqual(1 + 1, 2, "math works");
console.log("All tests passed");
//# sourceMappingURL=test.js.map