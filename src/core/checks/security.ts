import { SecurityConfig, CheckResult, ProjectType } from "../../interfaces/Types";

/**
 * Run all security-related checks
 */
export const runSecurityChecks = async (config: SecurityConfig, projectType: ProjectType): Promise<CheckResult[]> => {
  const checks = [checkNpmAudit(config), checkSecrets(config), checkEnvFiles(projectType), checkLicenses(config)];

  return Promise.all(checks);
};

/**
 * Run npm audit (placeholder)
 */
const checkNpmAudit = async (config: SecurityConfig): Promise<CheckResult> => {
  return {
    name: "npm audit",
    status: "pass",
    severity: "info",
    message: "Security check placeholder - implement npm audit integration",
    suggestions: ["Run 'npm audit' manually to check for vulnerabilities"],
  };
};

/**
 * Check for secrets (placeholder)
 */
const checkSecrets = async (config: SecurityConfig): Promise<CheckResult> => {
  if (config.checkSecrets === false) {
    return {
      name: "secrets scan",
      status: "skip",
      severity: "info",
      message: "Secrets scanning disabled",
    };
  }

  return {
    name: "secrets scan",
    status: "pass",
    severity: "info",
    message: "Secrets scan placeholder - implement secret detection",
    suggestions: ["Add patterns for API keys, tokens, passwords"],
  };
};

/**
 * Check .env files (placeholder)
 */
const checkEnvFiles = async (projectType: ProjectType): Promise<CheckResult> => {
  return {
    name: "env files",
    status: "pass",
    severity: "info",
    message: "ENV validation placeholder",
    suggestions: ["Check .env is in .gitignore", "Ensure .env.example exists"],
  };
};

/**
 * Check licenses (placeholder)
 */
const checkLicenses = async (config: SecurityConfig): Promise<CheckResult> => {
  if (!config.allowedLicenses || config.allowedLicenses.length === 0) {
    return {
      name: "licenses",
      status: "skip",
      severity: "info",
      message: "License checking disabled",
    };
  }

  return {
    name: "licenses",
    status: "pass",
    severity: "info",
    message: "License check placeholder",
    suggestions: ["Implement license-checker integration"],
  };
};
