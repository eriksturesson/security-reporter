import { GuardianConfig, ValidationReport, CheckResult, CheckStatus } from "../interfaces/Types";
import { runSecurityChecks } from "./checks/security";
import { runQualityChecks } from "./checks/quality";
import { runDockerChecks } from "./checks/docker";
import { runTestChecks } from "./checks/tests";

/**
 * Main validation runner - coordinates all checks
 */
export const runValidation = async (config: GuardianConfig = {}): Promise<ValidationReport> => {
  const startTime = Date.now();
  const projectType = config.projectType || detectProjectType();

  console.log(`🛡️  Running validation for ${projectType} project...\n`);

  // Run all checks in parallel
  const [securityResults, qualityResults, dockerResults, testResults] = await Promise.all([
    runSecurityChecks(config.security || {}, projectType),
    runQualityChecks(config.quality || {}),
    runDockerChecks(config.docker || {}),
    runTestChecks(config.tests || {}),
  ]);

  // Combine all results
  const allChecks = [...securityResults, ...qualityResults, ...dockerResults, ...testResults];

  // Calculate summary
  const summary = calculateSummary(allChecks);
  const overallStatus = determineOverallStatus(allChecks);

  const report: ValidationReport = {
    timestamp: new Date(),
    projectType,
    overallStatus,
    summary,
    checks: allChecks,
    executionTime: Date.now() - startTime,
  };

  return report;
};

/**
 * Detect project type based on dependencies
 */
const detectProjectType = (): "frontend" | "backend" | "fullstack" => {
  try {
    const pkg = require(process.cwd() + "/package.json");
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const hasFrontend = ["react", "vue", "angular", "svelte", "next"].some((lib) =>
      Object.keys(deps).some((dep) => dep.includes(lib)),
    );

    const hasBackend = ["express", "fastify", "koa", "@nestjs/core", "firebase-functions"].some((lib) =>
      Object.keys(deps).includes(lib),
    );

    if (hasFrontend && hasBackend) return "fullstack";
    if (hasFrontend) return "frontend";
    return "backend";
  } catch {
    return "backend"; // default
  }
};

/**
 * Calculate summary statistics
 */
const calculateSummary = (checks: CheckResult[]) => {
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
const determineOverallStatus = (checks: CheckResult[]): CheckStatus => {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  if (checks.every((c) => c.status === "skip")) return "skip";
  return "pass";
};
