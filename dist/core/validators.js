"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidation = void 0;
const security_1 = require("./checks/security");
const quality_1 = require("./checks/quality");
const docker_1 = require("./checks/docker");
const tests_1 = require("./checks/tests");
/**
 * Main validation runner - coordinates all checks
 */
const runValidation = async (config = {}) => {
    const startTime = Date.now();
    const projectType = config.projectType || detectProjectType();
    console.log(`🛡️  Running validation for ${projectType} project...\n`);
    // Run all checks in parallel
    const [securityResults, qualityResults, dockerResults, testResults] = await Promise.all([
        (0, security_1.runSecurityChecks)(config.security || {}, projectType),
        (0, quality_1.runQualityChecks)(config.quality || {}),
        (0, docker_1.runDockerChecks)(config.docker || {}),
        (0, tests_1.runTestChecks)(config.tests || {}),
    ]);
    // Combine all results
    const allChecks = [...securityResults, ...qualityResults, ...dockerResults, ...testResults];
    // Calculate summary
    const summary = calculateSummary(allChecks);
    const overallStatus = determineOverallStatus(allChecks);
    const report = {
        timestamp: new Date(),
        projectType,
        overallStatus,
        summary,
        checks: allChecks,
        executionTime: Date.now() - startTime,
    };
    return report;
};
exports.runValidation = runValidation;
/**
 * Detect project type based on dependencies
 */
const detectProjectType = () => {
    try {
        const pkg = require(process.cwd() + "/package.json");
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const hasFrontend = ["react", "vue", "angular", "svelte", "next"].some((lib) => Object.keys(deps).some((dep) => dep.includes(lib)));
        const hasBackend = ["express", "fastify", "koa", "@nestjs/core", "firebase-functions"].some((lib) => Object.keys(deps).includes(lib));
        if (hasFrontend && hasBackend)
            return "fullstack";
        if (hasFrontend)
            return "frontend";
        return "backend";
    }
    catch {
        return "backend"; // default
    }
};
/**
 * Calculate summary statistics
 */
const calculateSummary = (checks) => {
    return {
        total: checks.length,
        passed: checks.filter((c) => c.status === "pass").length,
        warnings: checks.filter((c) => c.status === "warn").length,
        failed: checks.filter((c) => c.status === "fail").length,
        skipped: checks.filter((c) => c.status === "skip").length,
    };
};
/**
 * Determine overall status based on all checks
 */
const determineOverallStatus = (checks) => {
    if (checks.some((c) => c.status === "fail"))
        return "fail";
    if (checks.some((c) => c.status === "warn"))
        return "warn";
    if (checks.every((c) => c.status === "skip"))
        return "skip";
    return "pass";
};
//# sourceMappingURL=validators.js.map