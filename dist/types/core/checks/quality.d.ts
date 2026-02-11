import type { CheckResult } from "../../interfaces/Types";
export declare function checkUnusedDependencies(): Promise<CheckResult[]>;
export declare function checkDuplicateDependencies(): Promise<CheckResult[]>;
export declare function checkOutdatedPackages(): Promise<CheckResult[]>;
export declare function checkPeerDependencies(): Promise<CheckResult[]>;
declare const _default: {
    checkUnusedDependencies: typeof checkUnusedDependencies;
    checkDuplicateDependencies: typeof checkDuplicateDependencies;
    checkOutdatedPackages: typeof checkOutdatedPackages;
    checkPeerDependencies: typeof checkPeerDependencies;
};
export default _default;
//# sourceMappingURL=quality.d.ts.map