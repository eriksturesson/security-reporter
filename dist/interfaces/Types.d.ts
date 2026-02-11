export type Severity = "info" | "warning" | "error" | "critical";
export type ProjectType = "frontend" | "backend" | "fullstack";
export type CheckStatus = "pass" | "warn" | "fail" | "skip";
export interface GuardianConfig {
    projectType?: ProjectType;
    security?: SecurityConfig;
    quality?: QualityConfig;
    docker?: DockerConfig;
    tests?: TestConfig;
    reporting?: ReportingConfig;
}
export interface SecurityConfig {
    auditLevel?: "info" | "low" | "moderate" | "high" | "critical";
    checkSecrets?: boolean;
    allowedLicenses?: string[];
    ignoreVulnerabilities?: string[];
    publishDryRun?: boolean;
    generateSbom?: boolean;
    checkRegistry?: boolean;
}
export interface QualityConfig {
    checkUnused?: boolean;
    checkDuplicates?: boolean;
    checkOutdated?: boolean;
    maxDependencyAge?: string;
    allowUnused?: string[];
}
export interface DockerConfig {
    checkEnvInBuild?: boolean;
    requiredEnvVars?: string[];
}
export interface TestConfig {
    run?: boolean;
    coverageThreshold?: number;
}
export interface ReportingConfig {
    format?: "terminal" | "json" | "markdown";
    outputFile?: string;
    verbose?: boolean;
}
export interface CheckResult {
    name: string;
    status: CheckStatus;
    severity: Severity;
    message: string;
    details?: any;
    suggestions?: string[];
}
export interface ValidationReport {
    timestamp: Date;
    projectType: ProjectType;
    overallStatus: CheckStatus;
    summary: {
        total: number;
        passed: number;
        warnings: number;
        failed: number;
        skipped: number;
    };
    checks: CheckResult[];
    executionTime: number;
}
//# sourceMappingURL=Types.d.ts.map