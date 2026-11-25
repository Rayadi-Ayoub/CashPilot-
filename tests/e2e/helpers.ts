import path from "node:path";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

export type DemoRole = "owner" | "manager" | "collaborator";

/** Session file saved by `auth.setup.ts` for a demo role. */
export function authFile(role: DemoRole) {
  return path.join(__dirname, "..", "..", "playwright", ".auth", `${role}.json`);
}

/** Signs in through the real login form with a seeded demo account. */
export async function login(page: Page, role: DemoRole) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${role}@cashpilot.demo`);
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Opens a page already signed in as `role`, in its own browser context.
 * Used when one scenario needs two users; never sign out of a saved session,
 * because signing out deletes it on the server for every later test.
 */
export async function pageAs(browser: Browser, role: DemoRole) {
  const context = await browser.newContext({
    ...test.info().project.use,
    storageState: authFile(role),
  });
  return context.newPage();
}

export function mainNav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Main navigation" });
}

/** Short unique suffix so reruns and browsers never collide on created data. */
export function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/** Minimal in-memory PDF receipt for the expense upload. */
export function pdfReceipt() {
  return { name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") };
}

export function successMessage(page: Page) {
  return page.locator(".form-message.success");
}

export function errorMessage(page: Page) {
  return page.locator(".form-message.error");
}

/** Value shown under a <dt> label in an invoice/expense detail grid. */
export function detailValue(page: Page, label: string) {
  return page.locator(".detail-grid > div").filter({ has: page.locator("dt", { hasText: label }) }).locator("dd");
}

/** Creates a draft invoice for the seeded client, validates it and returns its detail URL. */
export async function createValidatedInvoice(page: Page, total: string) {
  await page.goto("/invoices");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save draft" }) });
  await form.getByLabel("Client").selectOption({ label: "Carthage Retail" });
  await form.getByLabel("Total (DT)").fill(total);
  await form.getByLabel("Notes").fill(`E2E ${uniqueSuffix()}`);
  await form.getByRole("button", { name: "Save draft" }).click();
  await expect(successMessage(page)).toContainText("Draft invoice created.");

  await page.getByRole("button", { name: "Validate invoice" }).click();
  await expect(successMessage(page)).toContainText("Invoice validated.");
  return page.url().split("?")[0];
}

export async function recordPayment(page: Page, amount: string) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Record payment" }) });
  await form.getByLabel("Amount (DT)").fill(amount);
  await form.getByRole("button", { name: "Record payment" }).click();
}
