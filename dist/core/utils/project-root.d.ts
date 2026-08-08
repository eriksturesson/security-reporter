/**
 * Get the actual project root where the user ran the command.
 *
 * Resolution order:
 * 1. SECURITY_REPORT_ROOT - explicit override, useful when the tool is invoked
 *    from a wrapper script or a nested working directory.
 * 2. INIT_CWD - set by npm/npx to the directory the command was invoked from,
 *    even when the package itself runs from inside node_modules/.bin.
 * 3. process.cwd() - fallback for direct `node dist/cli.js` invocations.
 */
export declare const getProjectRoot: () => string;
//# sourceMappingURL=project-root.d.ts.map