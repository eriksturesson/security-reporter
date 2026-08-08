export interface SpawnOptions {
    timeout?: number;
    maxBuffer?: number;
}
/**
 * Safe command spawning helper. Uses spawn() with an argument array instead
 * of exec()/a shell string, so arguments can never be interpreted as shell
 * syntax (command injection).
 */
export declare const spawnCommand: (command: string, args: string[], options?: SpawnOptions) => Promise<{
    stdout: string;
    stderr: string;
    code: number;
}>;
/**
 * npm commands (especially on Windows) can print warnings/errors before the
 * JSON payload. Extract just the JSON part.
 */
export declare const sanitizeNpmOutput: (output: string) => string | null;
/** Safe JSON parsing with a size cap, for content from disk (package.json, config files). */
export declare const safeParseJSON: (content: string, source: string) => any;
//# sourceMappingURL=process.d.ts.map