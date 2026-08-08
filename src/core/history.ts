import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { ValidationReport } from "../interfaces/Types";

export interface HistoryEntry {
  timestamp: string;
  overallStatus: string;
  summary: { total: number; passed: number; warnings: number; failed: number; skipped: number };
  criticalCount: number;
  executionTime: number;
}

export interface ProjectHistory {
  projectRoot: string;
  projectName: string;
  runs: HistoryEntry[];
}

const MAX_RUNS_PER_PROJECT = 100;

/**
 * Where cross-repo history lives. Deliberately outside any single project
 * directory, since the point is to remember across many repos. Only
 * aggregate counts are stored — never file paths, snippets, or secrets — so
 * this stays safe to keep even for private client codebases.
 */
export const getHistoryDir = (): string => {
  const base = process.env.SECURITY_REPORTER_HOME || path.join(os.homedir(), ".security-reporter");
  const dir = path.join(base, "history");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const projectKey = (projectRoot: string): string => {
  return crypto.createHash("sha256").update(path.resolve(projectRoot)).digest("hex").slice(0, 16);
};

const historyFilePath = (projectRoot: string): string => {
  return path.join(getHistoryDir(), `${projectKey(projectRoot)}.json`);
};

const loadProjectHistory = (projectRoot: string): ProjectHistory => {
  const file = historyFilePath(projectRoot);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {
      projectRoot: path.resolve(projectRoot),
      projectName: path.basename(path.resolve(projectRoot)),
      runs: [],
    };
  }
};

/**
 * Append this run's summary to the project's local history and return the
 * previous run (if any) so the caller can show a trend.
 */
export const recordRun = (
  report: ValidationReport,
  projectRoot: string,
): { entry: HistoryEntry; previous?: HistoryEntry } => {
  const history = loadProjectHistory(projectRoot);
  const previous = history.runs[history.runs.length - 1];

  const criticalCount = report.checks.filter((c) => c.severity === "critical" && c.status === "fail").length;

  const entry: HistoryEntry = {
    timestamp: report.timestamp instanceof Date ? report.timestamp.toISOString() : new Date().toISOString(),
    overallStatus: report.overallStatus,
    summary: report.summary,
    criticalCount,
    executionTime: report.executionTime,
  };

  history.runs.push(entry);
  if (history.runs.length > MAX_RUNS_PER_PROJECT) {
    history.runs = history.runs.slice(-MAX_RUNS_PER_PROJECT);
  }

  fs.writeFileSync(historyFilePath(projectRoot), JSON.stringify(history, null, 2));

  return { entry, previous };
};

/** All projects this tool has ever scanned on this machine, most recently scanned first. */
export const listAllProjects = (): ProjectHistory[] => {
  const dir = getHistoryDir();
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const projects = files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as ProjectHistory;
      } catch {
        return null;
      }
    })
    .filter((p): p is ProjectHistory => p !== null && p.runs.length > 0);

  return projects.sort((a, b) => {
    const aLast = a.runs[a.runs.length - 1]?.timestamp || "";
    const bLast = b.runs[b.runs.length - 1]?.timestamp || "";
    return bLast.localeCompare(aLast);
  });
};

/** One-line human-readable trend vs the previous run, or null if there's nothing to compare against. */
export const formatTrend = (entry: HistoryEntry, previous?: HistoryEntry): string | null => {
  if (!previous) return null;

  const diffFailed = entry.summary.failed - previous.summary.failed;
  const diffWarn = entry.summary.warnings - previous.summary.warnings;
  const diffCritical = entry.criticalCount - previous.criticalCount;

  const parts: string[] = [];
  if (diffCritical !== 0) parts.push(`${diffCritical > 0 ? "+" : ""}${diffCritical} critical`);
  if (diffFailed !== 0) parts.push(`${diffFailed > 0 ? "+" : ""}${diffFailed} failed`);
  if (diffWarn !== 0) parts.push(`${diffWarn > 0 ? "+" : ""}${diffWarn} warnings`);

  const when = new Date(previous.timestamp).toLocaleDateString();
  if (parts.length === 0) return `No change since last scan (${when})`;
  return `${parts.join(", ")} since last scan on ${when}`;
};

const statusIcon = (status: string): string => {
  switch (status) {
    case "fail":
      return "❌";
    case "warn":
      return "⚠️ ";
    case "pass":
      return "✅";
    default:
      return "⏭️ ";
  }
};

/** Render the "all repos I've scanned" table for the terminal. */
export const formatDashboard = (projects: ProjectHistory[], options?: { professional?: boolean }): string => {
  const professional = options?.professional ?? false;

  if (projects.length === 0) {
    return "No scan history yet. Run a scan first (history is recorded automatically unless --no-history is passed).";
  }

  const lines: string[] = [];
  lines.push(professional ? "TRACKED PROJECTS" : "🗂️  TRACKED PROJECTS");
  lines.push("");

  projects.forEach((project) => {
    const last = project.runs[project.runs.length - 1];
    const prev = project.runs[project.runs.length - 2];
    const icon = professional ? "" : statusIcon(last.overallStatus);
    const when = new Date(last.timestamp).toLocaleString();

    lines.push(`${icon} ${project.projectName} — ${last.overallStatus.toUpperCase()}`.trim());
    lines.push(`   ${project.projectRoot}`);
    lines.push(
      `   Last scan: ${when} · ${last.summary.failed} failed, ${last.summary.warnings} warnings, ${last.criticalCount} critical`,
    );
    const trend = formatTrend(last, prev);
    if (trend) {
      lines.push(`   Trend: ${trend}`);
    }
    lines.push(`   Runs recorded: ${project.runs.length}`);
    lines.push("");
  });

  return lines.join("\n");
};
