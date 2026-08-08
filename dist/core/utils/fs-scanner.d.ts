/**
 * Directories that are never worth scanning: build output, package caches,
 * VCS metadata. Kept separate from the caller's own excludes so every check
 * shares the same baseline instead of redefining it.
 */
export declare const DEFAULT_EXCLUDE_DIRS: Set<string>;
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
export declare const walkProjectFiles: (root: string, options: WalkOptions) => void;
/** Count files matching `extensions` under root, using the same excludes as walkProjectFiles. */
export declare const countProjectFiles: (root: string, extensions: RegExp, excludeDirs?: Set<string>) => number;
export declare const SOURCE_FILE_EXTENSIONS: RegExp;
//# sourceMappingURL=fs-scanner.d.ts.map