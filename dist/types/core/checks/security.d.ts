import type { CheckResult } from "../../interfaces/Types";
export declare function runNpmAudit(): Promise<CheckResult[]>;
export declare function runSecretScan(): Promise<CheckResult[]>;
export declare function validateEnvExposure(): Promise<CheckResult[]>;
export declare function checkLicenses(): Promise<CheckResult[]>;
declare const _default: {
    runNpmAudit: typeof runNpmAudit;
    runSecretScan: typeof runSecretScan;
    validateEnvExposure: typeof validateEnvExposure;
    checkLicenses: typeof checkLicenses;
};
export default _default;
//# sourceMappingURL=security.d.ts.map