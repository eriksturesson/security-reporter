import * as path from "path";

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
export const getProjectRoot = (): string => {
  if (process.env.SECURITY_REPORT_ROOT) {
    return path.resolve(process.env.SECURITY_REPORT_ROOT);
  }
  if (process.env.INIT_CWD) {
    return process.env.INIT_CWD;
  }
  return process.cwd();
};
