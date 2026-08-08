export { runValidation } from "./core/validators";
export { reportToTerminal, reportToJson, reportToMarkdown, getExitCode } from "./core/reporter";
export { reportToHtml, saveHtmlReport } from "./core/html-reporter";
export { recordRun, listAllProjects, formatTrend, formatDashboard } from "./core/history";
export type { HistoryEntry, ProjectHistory } from "./core/history";
export type {
  GuardianConfig,
  SecurityConfig,
  QualityConfig,
  DockerConfig,
  TestConfig,
  ReportingConfig,
  CheckResult,
  ValidationReport,
  Severity,
  ProjectType,
  CheckStatus,
} from "./interfaces/Types";
