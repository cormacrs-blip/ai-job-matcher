import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
// Test workers reload this config. Reuse only a marked temporary directory created by this run.
function existingTestDir(): string | null {
  const dir = process.env.ALIGN_E2E_DATA_DIR;
  const token = process.env.ALIGN_E2E_MARKER;
  if (
    !dir ||
    !token ||
    path.dirname(dir) !== tmpdir() ||
    !/^align-playwright-[A-Za-z0-9]+$/.test(path.basename(dir))
  )
    return null;
  try {
    return readFileSync(path.join(dir, ".align-test-marker"), "utf8") === token
      ? dir
      : null;
  } catch {
    return null;
  }
}
const existing = existingTestDir();
const testDataDir =
  existing || mkdtempSync(path.join(tmpdir(), "align-playwright-"));
if (!existing) {
  process.env.ALIGN_E2E_MARKER = randomUUID();
  writeFileSync(
    path.join(testDataDir, ".align-test-marker"),
    process.env.ALIGN_E2E_MARKER,
  );
}
process.env.ALIGN_E2E_DATA_DIR = testDataDir;
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    env: { ...process.env, ALIGN_DATA_DIR: testDataDir },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
