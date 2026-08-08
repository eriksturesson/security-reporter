import { DockerConfig, CheckResult } from "../../interfaces/Types";
import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "../utils/project-root";

const DOCKERFILE_CANDIDATES = ["Dockerfile", "dockerfile", "Dockerfile.dev", "Dockerfile.prod"];

/**
 * Run all Docker-related checks. A project without a Dockerfile is not an
 * error — Docker checks simply don't apply, so the whole group is skipped.
 */
export const runDockerChecks = async (config: DockerConfig): Promise<CheckResult[]> => {
  const root = getProjectRoot();
  const dockerfilePath = DOCKERFILE_CANDIDATES.map((name) => path.join(root, name)).find((p) => fs.existsSync(p));

  if (!dockerfilePath) {
    return [
      {
        name: "docker",
        status: "skip",
        severity: "info",
        message: "No Dockerfile found at project root — Docker checks skipped",
      },
    ];
  }

  const dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");

  const checks = [
    checkDockerfileEnvVars(config, dockerfileContent, dockerfilePath),
    checkDockerignore(root, dockerfileContent),
    checkDockerBuildArgs(dockerfileContent),
  ];

  return Promise.all(checks);
};

/**
 * Look for secret-shaped values hardcoded in ENV/ARG instructions, and flag
 * missing default NODE_ENV / required env vars from config.
 */
const checkDockerfileEnvVars = async (
  config: DockerConfig,
  content: string,
  dockerfilePath: string,
): Promise<CheckResult> => {
  if (config.checkEnvInBuild === false) {
    return {
      name: "docker env vars",
      status: "skip",
      severity: "info",
      message: "Docker env vars check disabled",
    };
  }

  const lines = content.split(/\r?\n/);
  const suspicious: string[] = [];
  const secretNamePattern = /(PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|ACCESS_KEY)/i;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const envMatch = trimmed.match(/^(?:ENV|ARG)\s+([A-Za-z0-9_]+)[\s=]+(.+)$/i);
    if (!envMatch) return;

    const [, name, rawValue] = envMatch;
    const value = rawValue.replace(/^["']|["']$/g, "").trim();

    if (secretNamePattern.test(name) && value.length > 0 && !value.startsWith("$")) {
      suspicious.push(`Line ${index + 1}: "${name}" looks like a hardcoded secret`);
    }
  });

  const requiredEnvVars = config.requiredEnvVars || [];
  const missingRequired = requiredEnvVars.filter((name) => !new RegExp(`\\b${name}\\b`).test(content));

  if (suspicious.length > 0) {
    return {
      name: "docker env vars",
      status: "fail",
      severity: "critical",
      message: `Found ${suspicious.length} potentially hardcoded secret(s) in ${path.basename(dockerfilePath)}`,
      details: { suspicious },
      suggestions: [
        "Pass secrets at runtime (docker run -e / --env-file), not baked into the image",
        "Use Docker BuildKit secret mounts (--mount=type=secret) for build-time secrets",
      ],
    };
  }

  if (missingRequired.length > 0) {
    return {
      name: "docker env vars",
      status: "warn",
      severity: "warning",
      message: `Missing expected environment variable(s): ${missingRequired.join(", ")}`,
      details: { missingRequired },
      suggestions: [`Add ENV or ARG entries for: ${missingRequired.join(", ")}`],
    };
  }

  return {
    name: "docker env vars",
    status: "pass",
    severity: "info",
    message: "No hardcoded secrets detected in Docker ENV/ARG instructions",
  };
};

/**
 * .dockerignore existence and coverage of the usual footguns.
 */
const checkDockerignore = async (root: string, dockerfileContent: string): Promise<CheckResult> => {
  const dockerignorePath = path.join(root, ".dockerignore");

  if (!fs.existsSync(dockerignorePath)) {
    return {
      name: "dockerignore",
      status: "warn",
      severity: "warning",
      message: "No .dockerignore file found",
      suggestions: ["Create .dockerignore excluding node_modules, .env, .git, and reports/"],
    };
  }

  const content = fs.readFileSync(dockerignorePath, "utf-8");
  const expected = ["node_modules", ".env", ".git"];
  const missing = expected.filter((entry) => !content.includes(entry));

  const copiesEverything = /^COPY\s+\.\s+\./m.test(dockerfileContent) || /^COPY\s+\.\s+[^\s]/m.test(dockerfileContent);

  if (missing.length > 0 && copiesEverything) {
    return {
      name: "dockerignore",
      status: "fail",
      severity: "error",
      message: `.dockerignore is missing entries that Dockerfile's "COPY . ." would otherwise include: ${missing.join(", ")}`,
      details: { missing },
      suggestions: missing.map((m) => `Add "${m}" to .dockerignore`),
    };
  }

  if (missing.length > 0) {
    return {
      name: "dockerignore",
      status: "warn",
      severity: "warning",
      message: `.dockerignore is missing recommended entries: ${missing.join(", ")}`,
      details: { missing },
      suggestions: missing.map((m) => `Add "${m}" to .dockerignore`),
    };
  }

  return {
    name: "dockerignore",
    status: "pass",
    severity: "info",
    message: ".dockerignore covers node_modules, .env, and .git",
  };
};

/**
 * ARG statements with default values that look like real credentials.
 */
const checkDockerBuildArgs = async (content: string): Promise<CheckResult> => {
  const argLines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^ARG\s+/i.test(l));

  const risky = argLines.filter((l) => /(PASSWORD|SECRET|TOKEN|KEY)\s*=\s*\S+/i.test(l));

  if (risky.length > 0) {
    return {
      name: "docker build args",
      status: "warn",
      severity: "warning",
      message: `Found ${risky.length} ARG instruction(s) with default values that look like credentials`,
      details: { risky },
      suggestions: [
        "Don't set default values for secret-shaped ARGs — require them to be passed explicitly",
        "Prefer BuildKit secret mounts over ARG for anything sensitive (ARG values persist in image history)",
      ],
    };
  }

  return {
    name: "docker build args",
    status: "pass",
    severity: "info",
    message: argLines.length > 0 ? `${argLines.length} ARG instruction(s) checked, no obvious secrets` : "No ARG instructions found",
  };
};
