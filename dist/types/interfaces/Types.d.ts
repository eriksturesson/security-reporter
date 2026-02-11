export type Severity = "info" | "warning" | "error" | "critical";
export interface BackendErrorOptions {
    message: string;
    isOperational?: boolean;
    showUser?: boolean;
    severity?: Severity;
    code?: number;
    data?: any;
}
export interface CheckResult {
    id: string;
    title: string;
    description?: string;
    severity: Severity;
    passed: boolean;
    details?: any;
}
export interface Report {
    results: CheckResult[];
    summary: {
        passed: number;
        warning: number;
        error: number;
        critical: number;
    };
}
//# sourceMappingURL=Types.d.ts.map