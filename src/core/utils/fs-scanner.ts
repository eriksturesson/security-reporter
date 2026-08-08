import * as fs from "fs";
import * as path from "path";

/**
 * Directories that are never worth scanning: build output, package caches,
 * VCS metadata. Kept separate from the caller's own excludes so every check
 * shares the same baseline instead of redefining it.
 */
export const DEFAULT_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".parcel-cache",
  "vendor",
  "reports",
]);

const MAX_DEPTH = 20;

export interface WalkOptions {
  /** Regex tested against the file name; only matching files are visited. */
  extensions: RegExp;
  /** Directory basenames to skip, in addition to DEFAULT_EXCLUDE_DIRS. */
  excludeDirs?: Set<string>;
  /** Files larger than this are skipped (bytes). Default 10MB. */
  maxFileSize?: number;
  onFile: (filePath: string) => void;
}

/**
 * Recursively walk a project directory, staying within `root`.
 *
 * Carries over the path-traversal and symlink protections from the original
 * secrets scanner (which used to only walk <root>/src): resolved paths are
 * verified to stay inside root, symlinks are never followed, and hidden
 * directories are skipped unless explicitly excluded.
 */
export const walkProjectFiles = (root: string, options: WalkOptions): void => {
  const projectRoot = path.resolve(root);
  const excludeDirs = new Set([...DEFAULT_EXCLUDE_DIRS, ...(options.excludeDirs || [])]);
  const maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024;

  const visit = (dir: string, depth: number) => {
    if (depth > MAX_DEPTH) {
      return;
    }

    const normalizedDir = path.resolve(dir);
    if (!normalizedDir.startsWith(projectRoot)) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const filePath = path.join(dir, entry.name);
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(projectRoot)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (excludeDirs.has(entry.name) || entry.name.startsWith(".")) {
          continue;
        }
        visit(filePath, depth + 1);
      } else if (entry.isFile() && options.extensions.test(entry.name)) {
        try {
          const stats = fs.statSync(filePath);
          if (stats.size > maxFileSize) {
            continue;
          }
        } catch {
          continue;
        }
        options.onFile(filePath);
      }
    }
  };

  visit(projectRoot, 0);
};

/** Count files matching `extensions` under root, using the same excludes as walkProjectFiles. */
export const countProjectFiles = (root: string, extensions: RegExp, excludeDirs?: Set<string>): number => {
  let count = 0;
  walkProjectFiles(root, {
    extensions,
    excludeDirs,
    onFile: () => {
      count++;
    },
  });
  return count;
};

export const SOURCE_FILE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|env|sh)$/i;
