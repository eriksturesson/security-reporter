import * as fs from "fs";
import * as path from "path";

const IMPORT_RE = /\b(?:require\s*\(\s*|from\s+|import\s*\()\s*['"`]([^'"`]+)['"`]/g;

/** Extract the module specifiers referenced via import/require in a source file. */
export const extractImportSpecifiers = (content: string): string[] => {
  const specifiers: string[] = [];
  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(content))) {
    specifiers.push(match[1]);
  }
  return specifiers;
};

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

/** Resolve a relative import specifier to a file within `root`, or null if it doesn't resolve. */
export const resolveRelativeImport = (fromFile: string, specifier: string, root: string): string | null => {
  const target = path.resolve(path.dirname(fromFile), specifier);
  const projectRoot = path.resolve(root);

  const candidates = [
    target,
    ...CODE_EXTENSIONS.map((ext) => `${target}${ext}`),
    ...CODE_EXTENSIONS.map((ext) => path.join(target, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) {
        const resolved = path.resolve(candidate);
        return resolved.startsWith(projectRoot) ? resolved : null;
      }
    } catch {
      // candidate doesn't exist, try the next one
    }
  }
  return null;
};
