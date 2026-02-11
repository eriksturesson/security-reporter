import type { CheckResult } from "../../interfaces/Types";
export declare function checkEnvInDockerfile(): Promise<CheckResult[]>;
export declare function checkHardcodedSecretsInDockerfile(): Promise<CheckResult[]>;
export declare function checkDockerignore(): Promise<CheckResult[]>;
declare const _default: {
    checkEnvInDockerfile: typeof checkEnvInDockerfile;
    checkHardcodedSecretsInDockerfile: typeof checkHardcodedSecretsInDockerfile;
    checkDockerignore: typeof checkDockerignore;
};
export default _default;
//# sourceMappingURL=docker.d.ts.map