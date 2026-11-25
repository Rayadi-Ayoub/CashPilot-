import { test as setup } from "@playwright/test";
import { authFile, login, type DemoRole } from "./helpers";

/**
 * Signs each demo role in once, through the real login form, and saves the
 * session cookies. The scenario tests reuse these sessions, so a full
 * 3-browser run makes only a handful of real login attempts per account
 * (safe with a per-account login rate limit).
 */
const roles: DemoRole[] = ["owner", "manager", "collaborator"];

for (const role of roles) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await login(page, role);
    await page.context().storageState({ path: authFile(role) });
  });
}
