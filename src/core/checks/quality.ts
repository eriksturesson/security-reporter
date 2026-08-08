import { QualityConfig, CheckResult } from "../../interfaces/Types";
import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "../utils/project-root";
import { walkProjectFiles, DEFAULT_EXCLUDE_DIRS } from "../utils/fs-scanner";
import { spawnCommand, sanitizeNpmOutput, safeParseJSON } from "../utils/process";
import { extractImportSpecifiers, resolveRelativeImport } from "../utils/imports";

const CODE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

/**
 * Run all quality-related checks
 */
export const runQualityChecks = async (config: QualityConfig): Promise<CheckResult[]> => {
  const checks = [
    checkUnusedDependencies(config),
    checkDuplicateDependencies(config),
    checkOutdatedDependencies(config),
    checkMissingPeerDependencies(),
    checkDependencySizes(),
    checkCircularDependencies(),
  ];

  return Promise.all(checks);
};

const readPackageJson = (): any => {
  const pkgPath = path.join(getProjectRoot(), "package.json");
  return safeParseJSON(fs.readFileSync(pkgPath, "utf-8"), "package.json");
};

/**
 * Unused dependencies via depcheck — actual static-analysis of imports/requires
 * across the whole project, rather than a regex over a single `src/` folder.
 */
const checkUnusedDependencies = async (config: QualityConfig): Promise<CheckResult> => {
  if (config.checkUnused === false) {
    return {
      name: "unused dependencies",
      status: "skip",
      severity: "info",
      message: "Unused dependencies check disabled",
    };
  }

  const root = getProjectRoot();
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return {
      name: "unused dependencies",
      status: "skip",
      severity: "info",
      message: "No package.json found",
    };
  }

  try {
    // depcheck can be slow on very large repos — never let it hang the whole scan.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const depcheck = require("depcheck");
    const allowUnused = config.allowUnused || [];

    const result = await Promise.race([
      depcheck(root, {
        ignoreDirs: Array.from(DEFAULT_EXCLUDE_DIRS),
        ignoreMatches: allowUnused,
        skipMissing: true,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("depcheck timed out")), 60000)),
    ]);

    const unusedDeps = [...(result.dependencies || []), ...(result.devDependencies || [])];

    if (unusedDeps.length > 0) {
      let estimatedSize = 0;
      const nodeModulesPath = path.join(root, "node_modules");
      unusedDeps.forEach((dep: string) => {
        const depPath = path.join(nodeModulesPath, dep);
        if (fs.existsSync(depPath)) {
          estimatedSize += getDirSize(depPath);
        }
      });
      const sizeMB = (estimatedSize / 1024 / 1024).toFixed(2);

      return {
        name: "unused dependencies",
        status: "warn",
        severity: "warning",
        message: `Found ${unusedDeps.length} potentially unused dependencies (~${sizeMB} MB)`,
        details: { unused: unusedDeps.slice(0, 20), estimatedSizeMB: sizeMB, total: unusedDeps.length },
        suggestions: [
          "Review and remove unused dependencies to reduce bundle size",
          `Run: npm uninstall ${unusedDeps.slice(0, 3).join(" ")}`,
          "Add exceptions to config.quality.allowUnused if a dependency is used dynamically (e.g. CLI, config-only)",
        ],
      };
    }

    return {
      name: "unused dependencies",
      status: "pass",
      severity: "info",
      message: "All dependencies appear to be used",
    };
  } catch (error: any) {
    return {
      name: "unused dependencies",
      status: "warn",
      severity: "warning",
      message: "Could not complete unused dependency analysis",
      details: error.message,
      suggestions: ["Run 'npx depcheck' manually for details"],
    };
  }
};

const getDirSize = (dirPath: string): number => {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const filePath = path.join(dirPath, entry.name);
      if (entry.isSymbolicLink()) return;
      if (entry.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        try {
          size += fs.statSync(filePath).size;
        } catch {
          // ignore unreadable files
        }
      }
    });
  } catch {
    // ignore unreadable directories
  }
  return size;
};

/**
 * Duplicate dependencies with version conflicts (npm ls --all --json)
 */
const checkDuplicateDependencies = async (config: QualityConfig): Promise<CheckResult> => {
  if (config.checkDuplicates === false) {
    return {
      name: "duplicate dependencies",
      status: "skip",
      severity: "info",
      message: "Duplicate dependencies check disabled",
    };
  }

  try {
    const result = await spawnCommand("npm", ["ls", "--all", "--json"], { timeout: 60000 });
    return summarizeDuplicates(result.stdout);
  } catch (error: any) {
    if (error.stdout) {
      return summarizeDuplicates(error.stdout);
    }
    return {
      name: "duplicate dependencies",
      status: "warn",
      severity: "warning",
      message: "Could not check duplicate dependencies",
      details: error.message,
      suggestions: ["Run 'npm ls --all' manually to inspect the dependency tree"],
    };
  }
};

const summarizeDuplicates = (stdout: string): CheckResult => {
  const cleanJson = sanitizeNpmOutput(stdout);
  if (!cleanJson) {
    return {
      name: "duplicate dependencies",
      status: "skip",
      severity: "info",
      message: "Could not parse npm ls output",
    };
  }

  const tree = JSON.parse(cleanJson);
  const packageVersions: Record<string, Set<string>> = {};

  const traverse = (node: any) => {
    if (!node || !node.dependencies) return;
    Object.entries(node.dependencies).forEach(([name, info]: [string, any]) => {
      if (!packageVersions[name]) packageVersions[name] = new Set();
      if (info.version) packageVersions[name].add(info.version);
      traverse(info);
    });
  };
  traverse(tree);

  const duplicates = Object.entries(packageVersions)
    .filter(([, versions]) => versions.size > 1)
    .map(([name, versions]) => ({ package: name, versions: Array.from(versions) }));

  if (duplicates.length > 0) {
    return {
      name: "duplicate dependencies",
      status: "warn",
      severity: "warning",
      message: `Found ${duplicates.length} packages with multiple installed versions`,
      details: { duplicates: duplicates.slice(0, 10), total: duplicates.length },
      suggestions: [
        "Run 'npm dedupe' to reduce duplication",
        "Update package.json to use consistent version ranges",
        "Consider npm overrides for stubborn transitive conflicts",
      ],
    };
  }

  return {
    name: "duplicate dependencies",
    status: "pass",
    severity: "info",
    message: "No duplicate dependencies found",
  };
};

/**
 * Outdated dependencies with severity levels (npm outdated --json)
 */
const checkOutdatedDependencies = async (config: QualityConfig): Promise<CheckResult> => {
  if (config.checkOutdated === false) {
    return {
      name: "outdated dependencies",
      status: "skip",
      severity: "info",
      message: "Outdated dependencies check disabled",
    };
  }

  try {
    const result = await spawnCommand("npm", ["outdated", "--json"], { timeout: 60000 });
    return summarizeOutdated(result.stdout);
  } catch (error: any) {
    if (error.stdout) {
      return summarizeOutdated(error.stdout);
    }
    return {
      name: "outdated dependencies",
      status: "warn",
      severity: "warning",
      message: "Could not check outdated dependencies",
      details: error.message,
      suggestions: ["Run 'npm outdated' manually"],
    };
  }
};

const summarizeOutdated = (stdout: string): CheckResult => {
  const cleanJson = sanitizeNpmOutput(stdout) || "{}";
  const outdated = JSON.parse(cleanJson);
  const count = Object.keys(outdated).length;

  if (count === 0) {
    return {
      name: "outdated dependencies",
      status: "pass",
      severity: "info",
      message: "All dependencies are up to date",
    };
  }

  const majorUpdates: string[] = [];
  const minorUpdates: string[] = [];
  const patchUpdates: string[] = [];

  Object.entries(outdated).forEach(([name, info]: [string, any]) => {
    const current = info.current;
    const latest = info.latest;
    if (!current || !latest) return;

    const currentParts = current.split(".").map(Number);
    const latestParts = latest.split(".").map(Number);

    if (latestParts[0] > currentParts[0]) {
      majorUpdates.push(`${name}: ${current} → ${latest}`);
    } else if (latestParts[1] > currentParts[1]) {
      minorUpdates.push(`${name}: ${current} → ${latest}`);
    } else {
      patchUpdates.push(`${name}: ${current} → ${latest}`);
    }
  });

  const hasMajor = majorUpdates.length > 0;

  return {
    name: "outdated dependencies",
    status: hasMajor ? "warn" : "pass",
    severity: hasMajor ? "warning" : "info",
    message: `Found ${count} outdated dependencies (${majorUpdates.length} major, ${minorUpdates.length} minor, ${patchUpdates.length} patch)`,
    details: {
      major: majorUpdates.slice(0, 10),
      minor: minorUpdates.slice(0, 10),
      patch: patchUpdates.slice(0, 10),
      total: count,
    },
    suggestions: [
      "Run 'npm update' to update minor/patch versions",
      "Review major updates for breaking changes before upgrading",
    ],
  };
};

/**
 * Missing/unmet peer dependencies (npm ls)
 */
const checkMissingPeerDependencies = async (): Promise<CheckResult> => {
  const parseUnmetPeers = (output: string): string[] => {
    const unmetPeers: string[] = [];
    output.split(/\r?\n/).forEach((line) => {
      if (line.includes("UNMET PEER DEPENDENCY") || line.toLowerCase().includes("missing peer")) {
        const match = line.match(/([a-z0-9-_@/.]+)@/i);
        if (match) unmetPeers.push(match[1]);
      }
    });
    return [...new Set(unmetPeers)];
  };

  try {
    const result = await spawnCommand("npm", ["ls"], { timeout: 60000 });
    const unmetPeers = parseUnmetPeers(result.stdout + result.stderr);
    return unmetPeers.length > 0 ? failMissingPeers(unmetPeers) : passMissingPeers();
  } catch (error: any) {
    const combined = `${error.stdout || ""}${error.stderr || ""}`;
    const unmetPeers = parseUnmetPeers(combined);
    if (unmetPeers.length > 0) return failMissingPeers(unmetPeers);

    return {
      name: "peer dependencies",
      status: "pass",
      severity: "info",
      message: "Peer dependencies checked",
    };
  }
};

const failMissingPeers = (unmetPeers: string[]): CheckResult => ({
  name: "peer dependencies",
  status: "fail",
  severity: "error",
  message: `Missing ${unmetPeers.length} peer dependencies`,
  details: unmetPeers,
  suggestions: [`Install missing peer dependencies: npm install --save-dev ${unmetPeers.slice(0, 3).join(" ")}`],
});

const passMissingPeers = (): CheckResult => ({
  name: "peer dependencies",
  status: "pass",
  severity: "info",
  message: "All peer dependencies satisfied",
});

/**
 * Dependency size analysis — helps identify bloat and optimize install size
 */
const checkDependencySizes = async (): Promise<CheckResult> => {
  try {
    const root = getProjectRoot();
    const nodeModulesPath = path.join(root, "node_modules");

    if (!fs.existsSync(nodeModulesPath)) {
      return {
        name: "dependency sizes",
        status: "skip",
        severity: "info",
        message: "node_modules not found (run npm install first)",
      };
    }

    const pkg = readPackageJson();
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const depSizes: Array<{ name: string; sizeMB: number }> = [];
    Object.keys(deps).forEach((dep) => {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        depSizes.push({ name: dep, sizeMB: parseFloat((getDirSize(depPath) / 1024 / 1024).toFixed(2)) });
      }
    });

    depSizes.sort((a, b) => b.sizeMB - a.sizeMB);
    const totalSize = depSizes.reduce((sum, d) => sum + d.sizeMB, 0);

    const status = totalSize > 500 ? "warn" : "pass";

    return {
      name: "dependency sizes",
      status,
      severity: status === "warn" ? "warning" : "info",
      message:
        status === "warn"
          ? `Large dependencies footprint: ${totalSize.toFixed(2)} MB`
          : `Total dependencies size: ${totalSize.toFixed(2)} MB`,
      details: {
        totalSizeMB: parseFloat(totalSize.toFixed(2)),
        packageCount: depSizes.length,
        top10Largest: depSizes.slice(0, 10),
      },
      suggestions:
        status === "warn"
          ? ["Consider lighter alternatives for the largest dependencies", "Review if all dependencies are necessary"]
          : [],
    };
  } catch (error: any) {
    return {
      name: "dependency sizes",
      status: "skip",
      severity: "info",
      message: "Could not analyze dependency sizes",
    };
  }
};

/**
 * Circular dependency detection: builds an import graph from relative
 * import/require specifiers across the project and DFS-detects cycles.
 * Not a full replacement for madge, but a genuine (not placeholder) check.
 */
const checkCircularDependencies = async (): Promise<CheckResult> => {
  const root = getProjectRoot();

  const graph = new Map<string, Set<string>>();
  let filesScanned = 0;

  try {
    walkProjectFiles(root, {
      extensions: CODE_EXTENSIONS,
      onFile: (filePath) => {
        filesScanned++;
        let content: string;
        try {
          content = fs.readFileSync(filePath, "utf-8");
        } catch {
          return;
        }

        const specifiers = extractImportSpecifiers(content).filter((s) => s.startsWith("."));
        if (specifiers.length === 0) return;

        const edges = graph.get(filePath) || new Set<string>();
        specifiers.forEach((specifier) => {
          const resolved = resolveRelativeImport(filePath, specifier, root);
          if (resolved && resolved !== filePath) {
            edges.add(resolved);
          }
        });
        if (edges.size > 0) graph.set(filePath, edges);
      },
    });

    if (filesScanned === 0) {
      return {
        name: "circular dependencies",
        status: "skip",
        severity: "info",
        message: "No source files found to analyze",
      };
    }

    const cycles = findCycles(graph, root);

    if (cycles.length > 0) {
      return {
        name: "circular dependencies",
        status: "warn",
        severity: "warning",
        message: `Found ${cycles.length} circular import chain(s)`,
        details: { cycles: cycles.slice(0, 5) },
        suggestions: [
          "Break the cycle by extracting shared code into a separate module",
          "Run 'npx madge --circular' for a more exhaustive analysis",
        ],
      };
    }

    return {
      name: "circular dependencies",
      status: "pass",
      severity: "info",
      message: `No circular imports detected (${filesScanned} files analyzed)`,
    };
  } catch (error: any) {
    return {
      name: "circular dependencies",
      status: "skip",
      severity: "info",
      message: "Could not analyze circular dependencies",
      details: error.message,
    };
  }
};

/** Depth-first cycle detection over a small in-memory import graph. */
const findCycles = (graph: Map<string, Set<string>>, root: string): string[][] => {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const MAX_CYCLES = 5;

  const toRel = (p: string) => path.relative(root, p).replace(/\\/g, "/");

  const dfs = (node: string) => {
    if (cycles.length >= MAX_CYCLES) return;
    visited.add(node);
    inStack.add(node);
    stack.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (cycles.length >= MAX_CYCLES) break;
      if (inStack.has(neighbor)) {
        const cycleStart = stack.indexOf(neighbor);
        cycles.push(stack.slice(cycleStart).concat(neighbor).map(toRel));
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    stack.pop();
    inStack.delete(node);
  };

  for (const node of graph.keys()) {
    if (cycles.length >= MAX_CYCLES) break;
    if (!visited.has(node)) dfs(node);
  }

  return cycles;
};
