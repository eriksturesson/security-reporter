import { DockerConfig, CheckResult } from "../../interfaces/Types";
/**
 * Run all Docker-related checks. A project without a Dockerfile is not an
 * error — Docker checks simply don't apply, so the whole group is skipped.
 */
export declare const runDockerChecks: (config: DockerConfig) => Promise<CheckResult[]>;
//# sourceMappingURL=docker.d.ts.map