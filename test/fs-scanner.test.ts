import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { walkProjectFiles, countProjectFiles, SOURCE_FILE_EXTENSIONS } from "../src/core/utils/fs-scanner";

let testDir: string;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-scanner-test-"));
});

afterEach(() => {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("walkProjectFiles", () => {
  it("finds files anywhere under root, not just a src/ folder", () => {
    fs.mkdirSync(path.join(testDir, "app"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "app", "config.ts"), "export const x = 1;");
    fs.writeFileSync(path.join(testDir, "root-file.ts"), "export const y = 2;");

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      onFile: (f) => visited.push(f),
    });

    expect(visited.some((f) => f.endsWith(path.join("app", "config.ts")))).toBe(true);
    expect(visited.some((f) => f.endsWith("root-file.ts"))).toBe(true);
  });

  it("excludes default directories like node_modules, .git, dist", () => {
    fs.mkdirSync(path.join(testDir, "node_modules", "some-pkg"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "node_modules", "some-pkg", "index.ts"), "export const z = 1;");
    fs.mkdirSync(path.join(testDir, "dist"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "dist", "index.js"), "module.exports = {};");
    fs.writeFileSync(path.join(testDir, "kept.ts"), "export const kept = true;");

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      onFile: (f) => visited.push(f),
    });

    expect(visited.some((f) => f.includes("node_modules"))).toBe(false);
    expect(visited.some((f) => f.includes(`${path.sep}dist${path.sep}`))).toBe(false);
    expect(visited.some((f) => f.endsWith("kept.ts"))).toBe(true);
  });

  it("skips hidden directories", () => {
    fs.mkdirSync(path.join(testDir, ".hidden"), { recursive: true });
    fs.writeFileSync(path.join(testDir, ".hidden", "secret.ts"), "export const s = 1;");

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      onFile: (f) => visited.push(f),
    });

    expect(visited.length).toBe(0);
  });

  it("does not follow symlinks pointing outside the project root", () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-scanner-outside-"));
    const outsideFile = path.join(outsideDir, "outside.ts");
    fs.writeFileSync(outsideFile, "export const secret = 'should not be visited';");

    let symlinkCreated = true;
    try {
      fs.symlinkSync(outsideFile, path.join(testDir, "link.ts"));
    } catch {
      symlinkCreated = false;
    }

    if (!symlinkCreated) {
      // Symlinks require elevated privileges on some Windows setups — skip rather than false-fail.
      fs.rmSync(outsideDir, { recursive: true, force: true });
      return;
    }

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      onFile: (f) => visited.push(f),
    });

    expect(visited.length).toBe(0);
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  it("skips files larger than maxFileSize", () => {
    fs.writeFileSync(path.join(testDir, "big.ts"), "x".repeat(1000));
    fs.writeFileSync(path.join(testDir, "small.ts"), "x".repeat(10));

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      maxFileSize: 100,
      onFile: (f) => visited.push(f),
    });

    expect(visited.some((f) => f.endsWith("big.ts"))).toBe(false);
    expect(visited.some((f) => f.endsWith("small.ts"))).toBe(true);
  });

  it("respects caller-supplied excludeDirs on top of the defaults", () => {
    fs.mkdirSync(path.join(testDir, "vendor-custom"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "vendor-custom", "lib.ts"), "export const v = 1;");
    fs.writeFileSync(path.join(testDir, "keep.ts"), "export const k = 1;");

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      excludeDirs: new Set(["vendor-custom"]),
      onFile: (f) => visited.push(f),
    });

    expect(visited.some((f) => f.includes("vendor-custom"))).toBe(false);
    expect(visited.some((f) => f.endsWith("keep.ts"))).toBe(true);
  });

  it("only visits files matching the extensions regex", () => {
    fs.writeFileSync(path.join(testDir, "a.ts"), "export const a = 1;");
    fs.writeFileSync(path.join(testDir, "b.png"), "not really an image");

    const visited: string[] = [];
    walkProjectFiles(testDir, {
      extensions: SOURCE_FILE_EXTENSIONS,
      onFile: (f) => visited.push(f),
    });

    expect(visited.some((f) => f.endsWith("a.ts"))).toBe(true);
    expect(visited.some((f) => f.endsWith("b.png"))).toBe(false);
  });
});

describe("countProjectFiles", () => {
  it("counts matching files across the whole tree", () => {
    fs.mkdirSync(path.join(testDir, "lib"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "lib", "a.ts"), "export const a = 1;");
    fs.writeFileSync(path.join(testDir, "lib", "b.js"), "module.exports = {};");
    fs.writeFileSync(path.join(testDir, "readme.txt"), "not code");

    const count = countProjectFiles(testDir, SOURCE_FILE_EXTENSIONS);
    expect(count).toBe(2);
  });
});
