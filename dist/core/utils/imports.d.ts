/** Extract the module specifiers referenced via import/require in a source file. */
export declare const extractImportSpecifiers: (content: string) => string[];
/** Resolve a relative import specifier to a file within `root`, or null if it doesn't resolve. */
export declare const resolveRelativeImport: (fromFile: string, specifier: string, root: string) => string | null;
//# sourceMappingURL=imports.d.ts.map