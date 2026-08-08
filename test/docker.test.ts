import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runDockerChecks } from "../src/core/checks/docker";
import type { CheckResult, DockerConfig } from "../src/interfaces/Types";

let testDir: string;
let originalInitCwd: string | undefined;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "docker-test-"));
  process.chdir(testDir);
  originalInitCwd = process.env.INIT_CWD;
  process.env.INIT_CWD = testDir;
});

afterEach(() => {
  if (originalInitCwd === undefined) {
    delete process.env.INIT_CWD;
  } else {
    process.env.INIT_CWD = originalInitCwd;
  }
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

const find = (results: CheckResult[], name: string) => results.find((r) => r.name === name);
const run = (config: DockerConfig = {}) => runDockerChecks(config);

describe("Docker checks", () => {
  it("skips entirely when no Dockerfile is present", async () => {
    const results = await run();
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("docker");
    expect(results[0].status).toBe("skip");
  });

  it("flags hardcoded-looking secrets in ENV instructions", async () => {
    fs.writeFileSync(
      path.join(testDir, "Dockerfile"),
      ["FROM node:20", 'ENV DATABASE_PASSWORD="hunter2plaintext"', "CMD [\"node\", \"index.js\"]"].join("\n"),
    );

    const results = await run();
    const envCheck = find(results, "docker env vars");

    expect(envCheck?.status).toBe("fail");
    expect(envCheck?.severity).toBe("critical");
    expect(JSON.stringify(envCheck?.details)).toContain("DATABASE_PASSWORD");
  });

  it("does not flag ENV values that reference a build arg or variable", async () => {
    fs.writeFileSync(
      path.join(testDir, "Dockerfile"),
      ["FROM node:20", "ARG DB_PASSWORD", "ENV DATABASE_PASSWORD=$DB_PASSWORD", "CMD [\"node\", \"index.js\"]"].join(
        "\n",
      ),
    );

    const results = await run();
    const envCheck = find(results, "docker env vars");

    expect(envCheck?.status).toBe("pass");
  });

  it("warns when .dockerignore is missing", async () => {
    fs.writeFileSync(path.join(testDir, "Dockerfile"), ["FROM node:20", "COPY . .", "CMD [\"node\", \"index.js\"]"].join("\n"));

    const results = await run();
    const ignoreCheck = find(results, "dockerignore");

    expect(ignoreCheck?.status).toBe("warn");
    expect(ignoreCheck?.message).toContain("No .dockerignore");
  });

  it("fails when .dockerignore exists but misses entries while Dockerfile COPYs everything", async () => {
    fs.writeFileSync(path.join(testDir, "Dockerfile"), ["FROM node:20", "COPY . .", "CMD [\"node\", \"index.js\"]"].join("\n"));
    fs.writeFileSync(path.join(testDir, ".dockerignore"), "coverage/\n");

    const results = await run();
    const ignoreCheck = find(results, "dockerignore");

    expect(ignoreCheck?.status).toBe("fail");
    expect(ignoreCheck?.details?.missing).toEqual(expect.arrayContaining(["node_modules", ".env", ".git"]));
  });

  it("passes when .dockerignore covers node_modules, .env, and .git", async () => {
    fs.writeFileSync(path.join(testDir, "Dockerfile"), ["FROM node:20", "COPY . .", "CMD [\"node\", \"index.js\"]"].join("\n"));
    fs.writeFileSync(path.join(testDir, ".dockerignore"), "node_modules\n.env\n.git\n");

    const results = await run();
    const ignoreCheck = find(results, "dockerignore");

    expect(ignoreCheck?.status).toBe("pass");
  });

  it("warns about ARG instructions with credential-shaped default values", async () => {
    fs.writeFileSync(
      path.join(testDir, "Dockerfile"),
      ["FROM node:20", "ARG API_TOKEN=abc123realtoken", "CMD [\"node\", \"index.js\"]"].join("\n"),
    );

    const results = await run();
    const argsCheck = find(results, "docker build args");

    expect(argsCheck?.status).toBe("warn");
  });

  it("passes a clean Dockerfile with no secrets and a full .dockerignore", async () => {
    fs.writeFileSync(
      path.join(testDir, "Dockerfile"),
      ["FROM node:20", "ARG NODE_ENV", "ENV NODE_ENV=$NODE_ENV", "COPY . .", "CMD [\"node\", \"index.js\"]"].join("\n"),
    );
    fs.writeFileSync(path.join(testDir, ".dockerignore"), "node_modules\n.env\n.git\n");

    const results = await run();

    expect(find(results, "docker env vars")?.status).toBe("pass");
    expect(find(results, "dockerignore")?.status).toBe("pass");
    expect(find(results, "docker build args")?.status).toBe("pass");
  });

  it("respects checkEnvInBuild: false", async () => {
    fs.writeFileSync(
      path.join(testDir, "Dockerfile"),
      ["FROM node:20", 'ENV SECRET_TOKEN="realvalue"'].join("\n"),
    );

    const results = await run({ checkEnvInBuild: false });
    const envCheck = find(results, "docker env vars");

    expect(envCheck?.status).toBe("skip");
  });
});
