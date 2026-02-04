import { DockerConfig, CheckResult } from "../../interfaces/Types";

/**
 * Run all Docker-related checks
 */
export const runDockerChecks = async (config: DockerConfig): Promise<CheckResult[]> => {
  // Check if Dockerfile exists
  // In a real implementation, you'd check the filesystem
  const hasDockerfile = false; // placeholder

  if (!hasDockerfile) {
    return [
      {
        name: "docker",
        status: "skip",
        severity: "info",
        message: "No Dockerfile found - Docker checks skipped",
      },
    ];
  }

  const checks = [checkDockerfileEnvVars(config), checkDockerignore(), checkDockerBuildArgs(config)];

  return Promise.all(checks);
};

/**
 * Check Dockerfile env vars (placeholder)
 */
const checkDockerfileEnvVars = async (config: DockerConfig): Promise<CheckResult> => {
  if (config.checkEnvInBuild === false) {
    return {
      name: "docker env vars",
      status: "skip",
      severity: "info",
      message: "Docker env vars check disabled",
    };
  }

  return {
    name: "docker env vars",
    status: "pass",
    severity: "info",
    message: "Docker ENV validation placeholder",
    suggestions: ["Check .env is not copied into Docker image", "Use ARG for build-time variables"],
  };
};

/**
 * Check .dockerignore (placeholder)
 */
const checkDockerignore = async (): Promise<CheckResult> => {
  return {
    name: "dockerignore",
    status: "pass",
    severity: "info",
    message: "Dockerignore placeholder",
    suggestions: ["Ensure .dockerignore includes node_modules, .env, .git"],
  };
};

/**
 * Check Docker build args (placeholder)
 */
const checkDockerBuildArgs = async (config: DockerConfig): Promise<CheckResult> => {
  return {
    name: "docker build args",
    status: "pass",
    severity: "info",
    message: "Docker build args placeholder",
    suggestions: ["Provide default values for ARG statements"],
  };
};
