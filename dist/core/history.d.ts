import { ValidationReport } from "../interfaces/Types";
export interface HistoryEntry {
    timestamp: string;
    overallStatus: string;
    summary: {
        total: number;
        passed: number;
        warnings: number;
        failed: number;
        skipped: number;
    };
    criticalCount: number;
    executionTime: number;
}
export interface ProjectHistory {
    projectRoot: string;
    projectName: string;
    runs: HistoryEntry[];
}
/**
 * Where cross-repo history lives. Deliberately outside any single project
 * directory, since the point is to remember across many repos. Only
 * aggregate counts are stored — never file paths, snippets, or secrets — so
 * this stays safe to keep even for private client codebases.
 */
export declare const getHistoryDir: () => string;
/**
 * Append this run's summary to the project's local history and return the
 * previous run (if any) so the caller can show a trend.
 */
export declare const recordRun: (report: ValidationReport, projectRoot: string) => {
    entry: HistoryEntry;
    previous?: HistoryEntry;
};
/** All projects this tool has ever scanned on this machine, most recently scanned first. */
export declare const listAllProjects: () => ProjectHistory[];
/** One-line human-readable trend vs the previous run, or null if there's nothing to compare against. */
export declare const formatTrend: (entry: HistoryEntry, previous?: HistoryEntry) => string | null;
/** Render the "all repos I've scanned" table for the terminal. */
export declare const formatDashboard: (projects: ProjectHistory[], options?: {
    professional?: boolean;
}) => string;
//# sourceMappingURL=history.d.ts.map