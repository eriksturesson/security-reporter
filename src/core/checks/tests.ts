import { TestConfig, CheckResult } from "../../interfaces/Types";
import fs from "fs";
import path from "path";

const root = process.cwd();

/**
 * Run all test-related checks
 */
export const runTestChecks = async (config: TestConfig): Promise<CheckResult[]> => {
  const checks = [checkTestScript(config), checkBuildScript()];

  return Promise.all(checks);
};

/**
 * Check if tests are configured
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

  // Read package.json
  let pkg: any = {};
  try {
    const pkgRaw = await fs.promises.readFile(path.join(root, "package.json"), "utf8");
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    return {
      name: "tests",
      status: "warn",
      severity: "warning",
      message: "Unable to read package.json to determine test configuration",
      suggestions: ["Ensure package.json is present and valid"],
    };
  }

  const hasTestScript = typeof pkg.scripts?.test === "string" && pkg.scripts.test.trim().length > 0;

  // Look for test files in common locations
  const testFiles = await findTestFiles(root, ["test", "tests", "src"]);

  if (!hasTestScript && testFiles.length === 0) {
    return {
      name: "tests",
      status: "warn",
      severity: "warning",
      message: "No tests configured",
      suggestions: [
        'Add a "test" script to package.json',
        "Create test files with .test.ts or .spec.ts extensions (e.g. test/, tests/ or src/)",
      ],
    };
  }

  if (hasTestScript && testFiles.length === 0) {
    return {
      name: "tests",
      status: "warn",
      severity: "warning",
      message: 'A "test" script is defined but no test files were found',
      suggestions: ["Create test files with .test.ts or .spec.ts extensions"],
    };
  }

  // pass
  return {
    name: "tests",
    status: "pass",
    severity: "info",
    message: `Tests configured (${testFiles.length} test file(s) found)`,
    details: { testFiles: testFiles.slice(0, 10) },
  };
};

const findTestFiles = async (rootDir: string, dirs: string[]): Promise<string[]> => {
  const matches: string[] = [];
  const exts = /(\.test\.ts$|\.spec\.ts$|\.test\.js$|\.spec\.js$)/i;

  for (const d of dirs) {
    const start = path.join(rootDir, d);
    try {
      await walkAndCollect(start, matches, exts);
    } catch (e) {
      // ignore missing dirs
    }
  }

  return matches;
};

/**
 * FIX #8: Add depth limit and cycle detection
 * FIXED: Potential infinite loop in directory traversal
 */
const MAX_DEPTH = 10;
const visitedInodes = new Set<string>();

const walkAndCollect = async (dir: string, out: string[], re: RegExp, depth: number = 0) => {
  // FIX: Check depth limit
  if (depth > MAX_DEPTH) {
    console.warn(`[Security] Max depth ${MAX_DEPTH} reached at ${dir}`);
    return;
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(dir);
  } catch (e) {
    return;
  }

  if (!stat.isDirectory()) return;

  // FIX: Detect circular symlinks with inode tracking
  const inode = `${stat.dev}:${stat.ino}`;
  if (visitedInodes.has(inode)) {
    console.warn(`[Security] Circular link detected at ${dir}`);
    return;
  }
  visitedInodes.add(inode);

  // Validate we're still within project root
  const projectRoot = path.resolve(root);
  const currentDir = path.resolve(dir);
  if (!currentDir.startsWith(projectRoot)) {
    console.warn(`[Security] Directory outside project detected: ${dir}`);
    return;
  }

  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    // Ignore inaccessible directories
    return;
  }

  for (const e of entries) {
    const full = path.join(dir, e.name);

    // Skip symlinks to prevent traversal attacks
    if (e.isSymbolicLink()) {
      continue;
    }

    try {
      if (e.isDirectory()) {
        // Avoid node_modules and hidden directories
        if (e.name === "node_modules" || e.name.startsWith(".")) {
          continue;
        }

        // Recurse with incremented depth
        await walkAndCollect(full, out, re, depth + 1);
      } else if (e.isFile()) {
        if (re.test(e.name)) {
          const relativePath = full
            .replace(root, "")
            .replace(/^[\\\/]/, "")
            .replace(/\\/g, "/");
          out.push(relativePath);
        }
      }
    } catch (err) {
      // ignore individual file/dir errors
    }
  }

  // Remove inode from visited set when leaving this directory
  // This allows visiting the same inode through different paths (if legitimate)
  visitedInodes.delete(inode);
};

/**
 * Check if build script exists
 */
const checkBuildScript = async (): Promise<CheckResult> => {
  const pkgPath = path.join(root, "package.json");
  try {
    const raw = await fs.promises.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    if (pkg.scripts?.build) {
      return {
        name: "build",
        status: "pass",
        severity: "info",
        message: "Build script configured",
      };
    }
    return {
      name: "build",
      status: "warn",
      severity: "warning",
      message: "No build script found",
      suggestions: ['Add a "build" script if your project needs compilation'],
    };
  } catch (e) {
    return {
      name: "build",
      status: "warn",
      severity: "warning",
      message: "Unable to read package.json to determine build script",
      suggestions: ["Ensure package.json is present and valid"],
    };
  }
};
