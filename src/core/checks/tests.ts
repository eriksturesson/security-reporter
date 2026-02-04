import { TestConfig, CheckResult } from "../../interfaces/Types";

/**
 * Run all test-related checks
 */
export const runTestChecks = async (config: TestConfig): Promise<CheckResult[]> => {
  const checks = [checkTestScript(config), checkBuildScript()];

  return Promise.all(checks);
};

/**
 * Check if tests are configured (placeholder)
 */
const checkTestScript = async (config: TestConfig): Promise<CheckResult> => {
  if (config.run === false) {
    return {
      name: "tests",
      status: "skip",
      severity: "info",
      message: "Test execution disabled",
    };
  }

  return {
    name: "tests",
    status: "pass",
    severity: "info",
    message: "Test setup placeholder",
    suggestions: ['Add a "test" script to package.json', "Create test files with .test.ts or .spec.ts extensions"],
  };
};

/**
 * Check if build script exists (placeholder)
 */
const checkBuildScript = async (): Promise<CheckResult> => {
  return {
    name: "build",
    status: "pass",
    severity: "info",
    message: "Build setup placeholder",
    suggestions: ['Add a "build" script if your project needs compilation'],
  };
};
