import * as fs from "fs";
import * as path from "path";

export const savePdfFromHtml = async (htmlPath: string, outputPath?: string): Promise<string> => {
  const finalPdf = outputPath || path.join(process.cwd(), "reports", "security-report.pdf");

  // Try to require puppeteer dynamically
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require("puppeteer");

    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    const fileUrl = `file://${path.resolve(htmlPath)}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0" });
    await page.pdf({ path: finalPdf, format: "A4", printBackground: true });
    await browser.close();

    return finalPdf;
  } catch (err: any) {
    throw new Error(
      "Puppeteer not available or failed to generate PDF. Install 'puppeteer' or run in an environment that supports headless Chromium.",
    );
  }
};
