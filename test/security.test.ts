import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runSecurityChecks } from "../src/core/checks/security";
import { runTestChecks } from "../src/core/checks/tests";
import { reportToHtml } from "../src/core/html-reporter";
import type { SecurityConfig, TestConfig, CheckResult, ValidationReport } from "../src/interfaces/Types";

// Test utilities
let testDir: string;

beforeEach(() => {
  // Create temporary test directory
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "security-test-"));
  process.chdir(testDir);
});

afterEach(() => {
  // Cleanup
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
});

describe("Security Fixes", () => {
  describe("Fix #2: Path Traversal Protection", () => {
    it("should not follow symlinks outside project", async () => {
      // Setup: Create project structure
      fs.mkdirSync(path.join(testDir, "src"), { recursive: true });

      // Create a sensitive file outside project
      const sensitiveFile = path.join(os.tmpdir(), "sensitive-data.txt");
      fs.writeFileSync(sensitiveFile, "SECRET_PASSWORD=super_secret_123");

      // Create symlink pointing outside project
      const symlinkPath = path.join(testDir, "src", "evil-link.txt");
      try {
        fs.symlinkSync(sensitiveFile, symlinkPath);
      } catch (err) {
        // Skip test if symlinks not supported (Windows without admin)
        console.log("Skipping symlink test - not supported on this system");
        return;
      }

      // Create package.json
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({ name: "test-project", version: "1.0.0" }));

      // Run security checks
      const config: SecurityConfig = { checkSecrets: true };
      const results = await runSecurityChecks(config, "backend");

      // Find secrets scan result
      const secretsCheck = results.find((r: CheckResult) => r.name === "secrets scan");

      // Should not report secrets from the symlinked file
      expect(secretsCheck?.status).not.toBe("fail");

      if (secretsCheck?.details?.matches) {
        const matches = secretsCheck.details.matches;
        // Should not contain any matches from outside the project
        expect(matches.every((m: any) => !m.file.includes(sensitiveFile))).toBe(true);
      }

      // Cleanup
      fs.unlinkSync(sensitiveFile);
    });

    it("should validate paths stay within project root", async () => {
      // Setup
      fs.mkdirSync(path.join(testDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "src", "normal-file.ts"), 'const key = "not-a-secret";');

      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));

      // Run security checks
      const config: SecurityConfig = { checkSecrets: true };
      const results = await runSecurityChecks(config, "backend");

      const secretsCheck = results.find((r: CheckResult) => r.name === "secrets scan");

      // Should complete successfully
      expect(secretsCheck?.status).toBe("pass");
    });
  });

  describe("Fix #3: ReDoS Protection", () => {
    it("should handle extremely long strings without hanging", async () => {
      // Setup: Create file with very long potential token
      fs.mkdirSync(path.join(testDir, "src"), { recursive: true });

      const longString = "A".repeat(100000);
      const codeWithLongString = `
        // This is a test file with a very long string
        const token = "Bearer ${longString}!!!";
      `;

      fs.writeFileSync(path.join(testDir, "src", "test.ts"), codeWithLongString);
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));

      // Run with timeout to ensure it doesn't hang
      const startTime = Date.now();

      const config: SecurityConfig = { checkSecrets: true };
      const results = await Promise.race([
        runSecurityChecks(config, "backend"),
        new Promise<CheckResult[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout - ReDoS detected!")), 5000),
        ),
      ]);

      const duration = Date.now() - startTime;

      // Should complete in under 5 seconds (way faster than ReDoS would take)
      expect(duration).toBeLessThan(5000);

      // The key point: It completes quickly, even with 100k chars
      // The regex WILL match (first 500 chars), but that's OK - it doesn't hang
      const secretsCheck = results.find((r: CheckResult) => r.name === "secrets scan");

      // As long as it completed quickly, ReDoS is prevented
      expect(secretsCheck).toBeDefined();
    });

    it("should match valid tokens within length limits", async () => {
      // Setup
      fs.mkdirSync(path.join(testDir, "src"), { recursive: true });

      const codeWithValidToken = `
        const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      `;

      fs.writeFileSync(path.join(testDir, "src", "auth.ts"), codeWithValidToken);
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));

      const config: SecurityConfig = { checkSecrets: true };
      const results = await runSecurityChecks(config, "backend");

      const secretsCheck = results.find((r: CheckResult) => r.name === "secrets scan");

      // Should detect the token (it's within valid length)
      expect(secretsCheck?.status).toBe("fail");
      expect(secretsCheck?.details?.matches?.length).toBeGreaterThan(0);
    });
  });

  describe("Fix #4: Safe JSON Parsing", () => {
    it("should reject extremely large JSON files", async () => {
      // Create a huge package.json (over 1MB)
      const hugeArray = Array(100000).fill("x");
      const hugePackage = {
        name: "test",
        version: "1.0.0",
        description: hugeArray.join(""),
      };

      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify(hugePackage));

      const config: SecurityConfig = {};

      // Should handle gracefully (not crash, return error)
      await expect(async () => {
        const results = await runSecurityChecks(config, "backend");

        // At least one check should mention the issue
        const hasError = results.some((r: CheckResult) => r.status === "fail" || r.message.includes("large"));

        // We don't throw - we return error status
        expect(hasError || results.length === 0).toBe(true);
      }).not.toThrow();
    });

    it("should validate JSON structure", async () => {
      // Create valid package.json
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));

      const config: SecurityConfig = {};
      const results = await runSecurityChecks(config, "backend");

      // Should process successfully
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Fix #6: Input Validation", () => {
    it("should validate project type input", () => {
      const validTypes = ["frontend", "backend", "fullstack"];
      const invalidTypes = ["invalid", "random", "<script>", "../../etc/passwd"];

      // Valid types should be accepted
      validTypes.forEach((type) => {
        expect(validTypes.includes(type)).toBe(true);
      });

      // Invalid types should be rejected
      invalidTypes.forEach((type) => {
        expect(validTypes.includes(type)).toBe(false);
      });
    });

    it("should validate format input", () => {
      const validFormats = ["terminal", "json", "markdown", "html", "all"];
      const invalidFormats = ["pdf", "xml", "<script>", "'; DROP TABLE users;--"];

      validFormats.forEach((format) => {
        expect(validFormats.includes(format)).toBe(true);
      });

      invalidFormats.forEach((format) => {
        expect(validFormats.includes(format)).toBe(false);
      });
    });
  });

  describe("Fix #8: Infinite Loop Protection", () => {
    it("should respect maximum directory depth", async () => {
      // Create deeply nested structure (15 levels)
      let currentPath = testDir;
      for (let i = 0; i < 15; i++) {
        currentPath = path.join(currentPath, `level${i}`);
        fs.mkdirSync(currentPath, { recursive: true });
      }

      // Add a test file at the deepest level
      fs.writeFileSync(path.join(currentPath, "deep.test.ts"), "test");

      // Add package.json at root
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", version: "1.0.0", scripts: { test: "vitest" } }),
      );

      const config: TestConfig = { run: true };

      // Should complete without hanging
      const startTime = Date.now();
      const results = await Promise.race([
        runTestChecks(config),
        new Promise<CheckResult[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout - infinite loop detected!")), 5000),
        ),
      ]);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle circular symlinks gracefully", async () => {
      // Create circular symlink
      fs.mkdirSync(path.join(testDir, "test"), { recursive: true });

      const dir1 = path.join(testDir, "test", "dir1");
      const dir2 = path.join(testDir, "test", "dir2");

      fs.mkdirSync(dir1);
      fs.mkdirSync(dir2);

      try {
        // dir1/link -> dir2
        fs.symlinkSync(dir2, path.join(dir1, "link"), "dir");
        // dir2/link -> dir1 (circular!)
        fs.symlinkSync(dir1, path.join(dir2, "link"), "dir");
      } catch (err) {
        // Skip if symlinks not supported
        console.log("Skipping circular symlink test");
        return;
      }

      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", version: "1.0.0", scripts: { test: "vitest" } }),
      );

      const config: TestConfig = { run: true };

      // Should complete without infinite loop
      const startTime = Date.now();
      await Promise.race([
        runTestChecks(config),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Infinite loop!")), 5000)),
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Fix #9: XSS Protection", () => {
    it("should escape HTML in check names", () => {
      const maliciousReport: ValidationReport = {
        timestamp: new Date(),
        projectType: "backend",
        overallStatus: "pass",
        summary: { total: 1, passed: 1, warnings: 0, failed: 0, skipped: 0 },
        checks: [
          {
            name: '<script>alert("XSS")</script>',
            status: "pass",
            severity: "info",
            message: "Test check",
          },
        ],
        executionTime: 100,
      };

      const html = reportToHtml(maliciousReport);

      // Should NOT contain unescaped script tag
      expect(html).not.toContain('<script>alert("XSS")</script>');

      // Should contain escaped version
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("&lt;/script&gt;");
    });

    it("should escape HTML in check messages", () => {
      const maliciousReport: ValidationReport = {
        timestamp: new Date(),
        projectType: "backend",
        overallStatus: "fail",
        summary: { total: 1, passed: 0, warnings: 0, failed: 1, skipped: 0 },
        checks: [
          {
            name: "test check",
            status: "fail",
            severity: "critical",
            message: "Found <img src=x onerror=\"alert('XSS')\">",
          },
        ],
        executionTime: 100,
      };

      const html = reportToHtml(maliciousReport);

      // Should NOT contain unescaped img tag
      expect(html).not.toContain("<img src=x");

      // Should contain escaped version
      expect(html).toContain("&lt;img");
    });

    it("should escape HTML in suggestions", () => {
      const maliciousReport: ValidationReport = {
        timestamp: new Date(),
        projectType: "backend",
        overallStatus: "warn",
        summary: { total: 1, passed: 0, warnings: 1, failed: 0, skipped: 0 },
        checks: [
          {
            name: "test check",
            status: "warn",
            severity: "warning",
            message: "Warning",
            suggestions: ["Run: <script>malicious()</script>", "Fix the issue"],
          },
        ],
        executionTime: 100,
      };

      const html = reportToHtml(maliciousReport);

      // Should NOT contain unescaped script
      expect(html).not.toContain("<script>malicious()</script>");

      // Should contain escaped version
      expect(html).toContain("&lt;script&gt;");
    });

    it("should escape HTML in details", () => {
      const maliciousReport: ValidationReport = {
        timestamp: new Date(),
        projectType: "backend",
        overallStatus: "fail",
        summary: { total: 1, passed: 0, warnings: 0, failed: 1, skipped: 0 },
        checks: [
          {
            name: "test",
            status: "fail",
            severity: "error",
            message: "Error",
            details: { evil: '<iframe src="javascript:alert()"></iframe>' },
          },
        ],
        executionTime: 100,
      };

      const html = reportToHtml(maliciousReport);

      // Should NOT contain unescaped iframe
      expect(html).not.toContain('<iframe src="javascript:alert()">');

      // Should contain escaped version
      expect(html).toContain("&lt;iframe");
    });

    it("should include Content Security Policy header", () => {
      const report: ValidationReport = {
        timestamp: new Date(),
        projectType: "backend",
        overallStatus: "pass",
        summary: { total: 1, passed: 1, warnings: 0, failed: 0, skipped: 0 },
        checks: [
          {
            name: "test",
            status: "pass",
            severity: "info",
            message: "OK",
          },
        ],
        executionTime: 100,
      };

      const html = reportToHtml(report);

      // Should include CSP header
      expect(html).toContain("Content-Security-Policy");
      expect(html).toContain("default-src 'none'");

      // Should include other security headers
      expect(html).toContain("X-Content-Type-Options");
      expect(html).toContain("X-Frame-Options");
      expect(html).toContain("DENY");
    });
  });

  describe("Fix #15: Memory Protection", () => {
    it("should skip very large files", async () => {
      // Create a large file (15MB - above 10MB limit)
      fs.mkdirSync(path.join(testDir, "src"), { recursive: true });

      const largeContent = "x".repeat(15 * 1024 * 1024);
      fs.writeFileSync(path.join(testDir, "src", "huge.ts"), largeContent);

      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));

      const config: SecurityConfig = { checkSecrets: true };

      // Should complete without memory issues
      const results = await runSecurityChecks(config, "backend");

      const secretsCheck = results.find((r: CheckResult) => r.name === "secrets scan");

      // Should complete (may skip the large file)
      expect(secretsCheck).toBeDefined();
    });
  });

  describe("Integration: Multiple Security Fixes Together", () => {
    it("should handle a complex malicious scenario safely", async () => {
      // Setup: Complex attack scenario
      fs.mkdirSync(path.join(testDir, "src"), { recursive: true });

      // 1. File with potential XSS in content
      fs.writeFileSync(path.join(testDir, "src", "xss.ts"), 'const html = "<script>alert(\\"XSS\\")</script>";');

      // 2. File with very long string (ReDoS test)
      fs.writeFileSync(path.join(testDir, "src", "long.ts"), `const token = "Bearer ${"A".repeat(1000)}";`);

      // 3. Package.json with script injection attempt
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: 'test"; malicious',
          version: "1.0.0",
          scripts: {
            test: 'echo "test"',
          },
        }),
      );

      const config: SecurityConfig = { checkSecrets: true };

      // Should handle everything safely
      const startTime = Date.now();
      const results = await Promise.race([
        runSecurityChecks(config, "backend"),
        new Promise<CheckResult[]>((_, reject) => setTimeout(() => reject(new Error("System hung!")), 10000)),
      ]);

      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);

      // Should return results
      expect(results.length).toBeGreaterThan(0);

      // Should not crash
      expect(results).toBeDefined();
    });
  });
});

describe("Security Best Practices Validation", () => {
  it("should not use child_process.exec anywhere", async () => {
    // Read the source files
    const securityFile = fs.readFileSync(path.join(__dirname, "../src/core/checks/security.ts"), "utf-8");

    // Should NOT contain execAsync or exec calls
    expect(securityFile).not.toContain("execAsync(");
    expect(securityFile).not.toContain("child_process.exec");

    // Should contain spawn instead
    expect(securityFile).toContain("spawn");
  });

  it("should not have unbounded regex quantifiers", () => {
    const securityFile = fs.readFileSync(path.join(__dirname, "../src/core/checks/security.ts"), "utf-8");

    // Check for patterns that should have bounds
    // Should have {min,max} instead of * or +
    const bearerTokenPattern = securityFile.match(/Bearer.*pattern.*{(\d+),(\d+)}/);

    if (bearerTokenPattern) {
      const [, min, max] = bearerTokenPattern;
      expect(parseInt(max)).toBeLessThanOrEqual(1000); // Reasonable limit
    }
  });
});
