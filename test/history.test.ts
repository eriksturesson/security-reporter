import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { recordRun, listAllProjects, formatTrend, formatDashboard } from "../src/core/history";
import type { ValidationReport, CheckResult } from "../src/interfaces/Types";

let homeDir: string;
let originalHome: string | undefined;

beforeEach(() => {
  // recordRun/listAllProjects read SECURITY_REPORTER_HOME so history from
  // running this test suite never touches the developer's real ~/.security-reporter.
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "sr-history-test-"));
  originalHome = process.env.SECURITY_REPORTER_HOME;
  process.env.SECURITY_REPORTER_HOME = homeDir;
});

afterEach(() => {
  if (originalHome === undefined) {
    delete process.env.SECURITY_REPORTER_HOME;
  } else {
    process.env.SECURITY_REPORTER_HOME = originalHome;
  }
  try {
    fs.rmSync(homeDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

const makeReport = (overrides: Partial<ValidationReport> = {}): ValidationReport => {
  const checks: CheckResult[] = overrides.checks ?? [
    { name: "npm audit", status: "pass", severity: "info", message: "clean" },
  ];

  return {
    timestamp: new Date(),
    projectType: "backend",
    overallStatus: "pass",
    summary: { total: checks.length, passed: checks.length, warnings: 0, failed: 0, skipped: 0 },
    checks,
    executionTime: 100,
    ...overrides,
  };
};

describe("recordRun", () => {
  it("has no previous entry on the first scan of a project", () => {
    const projectRoot = path.join(os.tmpdir(), "project-a");
    const { entry, previous } = recordRun(makeReport(), projectRoot);

    expect(previous).toBeUndefined();
    expect(entry.overallStatus).toBe("pass");
  });

  it("returns the prior run as `previous` on the second scan", () => {
    const projectRoot = path.join(os.tmpdir(), "project-b");

    recordRun(makeReport({ overallStatus: "warn", summary: { total: 1, passed: 0, warnings: 1, failed: 0, skipped: 0 } }), projectRoot);
    const { previous } = recordRun(makeReport({ overallStatus: "pass" }), projectRoot);

    expect(previous?.overallStatus).toBe("warn");
  });

  it("never stores check names, messages, or details — only aggregate counts", () => {
    const projectRoot = path.join(os.tmpdir(), "project-secret-names");
    recordRun(
      makeReport({
        checks: [
          {
            name: "secrets scan",
            status: "fail",
            severity: "critical",
            message: "Found AKIA1234567890ABCDEF in config.js",
            details: { snippet: "AKIA1234567890ABCDEF" },
          },
        ],
        overallStatus: "fail",
        summary: { total: 1, passed: 0, warnings: 0, failed: 1, skipped: 0 },
      }),
      projectRoot,
    );

    const dir = path.join(homeDir, "history");
    const files = fs.readdirSync(dir);
    expect(files.length).toBe(1);
    const raw = fs.readFileSync(path.join(dir, files[0]), "utf-8");

    expect(raw).not.toContain("AKIA1234567890ABCDEF");
    expect(raw).not.toContain("secrets scan");
  });

  it("caps stored runs per project at 100", () => {
    const projectRoot = path.join(os.tmpdir(), "project-many-runs");
    for (let i = 0; i < 105; i++) {
      recordRun(makeReport(), projectRoot);
    }

    const dir = path.join(homeDir, "history");
    const files = fs.readdirSync(dir);
    const history = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf-8"));

    expect(history.runs.length).toBe(100);
  });
});

describe("formatTrend", () => {
  it("returns null when there is no previous run", () => {
    const { entry } = recordRun(makeReport(), path.join(os.tmpdir(), "project-c"));
    expect(formatTrend(entry)).toBeNull();
  });

  it("reports no change when nothing differs", () => {
    const projectRoot = path.join(os.tmpdir(), "project-d");
    recordRun(makeReport(), projectRoot);
    const { entry, previous } = recordRun(makeReport(), projectRoot);

    expect(formatTrend(entry, previous)).toContain("No change");
  });

  it("reports increases and decreases in failed/warning/critical counts", () => {
    const projectRoot = path.join(os.tmpdir(), "project-e");
    recordRun(
      makeReport({ summary: { total: 2, passed: 0, warnings: 1, failed: 1, skipped: 0 } }),
      projectRoot,
    );
    const { entry, previous } = recordRun(
      makeReport({ summary: { total: 3, passed: 0, warnings: 0, failed: 3, skipped: 0 } }),
      projectRoot,
    );

    const trend = formatTrend(entry, previous)!;
    expect(trend).toContain("+2 failed");
    expect(trend).toContain("-1 warnings");
  });
});

describe("listAllProjects", () => {
  it("lists every project that has been scanned, most recently scanned first", () => {
    const rootA = path.join(os.tmpdir(), "project-list-a");
    const rootB = path.join(os.tmpdir(), "project-list-b");

    recordRun(makeReport(), rootA);
    // Ensure a distinguishable timestamp ordering without relying on real time gaps.
    const laterReport = makeReport();
    laterReport.timestamp = new Date(Date.parse(laterReport.timestamp.toISOString()) + 1000);
    recordRun(laterReport, rootB);

    const projects = listAllProjects();
    const names = projects.map((p) => p.projectName);

    expect(names).toContain(path.basename(rootA));
    expect(names).toContain(path.basename(rootB));
    expect(projects[0].projectName).toBe(path.basename(rootB));
  });

  it("returns an empty array when nothing has been scanned yet", () => {
    expect(listAllProjects()).toEqual([]);
  });
});

describe("formatDashboard", () => {
  it("renders a friendly message when there is no history", () => {
    expect(formatDashboard([])).toContain("No scan history yet");
  });

  it("includes project name, root, and status for tracked projects", () => {
    const projectRoot = path.join(os.tmpdir(), "project-dashboard");
    recordRun(makeReport({ overallStatus: "fail" }), projectRoot);

    const output = formatDashboard(listAllProjects());

    expect(output).toContain(path.basename(projectRoot));
    expect(output).toContain("FAIL");
  });
});
