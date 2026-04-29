import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const adminUrl = process.env.PARAKOT_ADMIN_URL ?? "http://admin.konekon.ru";
export const expectedEditorAdminUrl =
  process.env.PARAKOT_EXPECTED_EDITOR_ADMIN_URL ?? adminUrl;
export const landingUrl = process.env.PARAKOT_LANDING_URL ?? "http://parakot.konekon.ru";
export const apiUrl =
  process.env.PARAKOT_API_URL ?? `${landingUrl.replace(/\/$/, "")}/api`;

export const adminEmail = process.env.PARAKOT_ADMIN_EMAIL;
export const adminPassword = process.env.PARAKOT_ADMIN_PASSWORD;

export function requireAdminCredentials() {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set PARAKOT_ADMIN_EMAIL and PARAKOT_ADMIN_PASSWORD before running admin smoke tests.",
    );
  }

  return {
    email: adminEmail,
    password: adminPassword,
  };
}

export async function loginToAdmin(page: Page) {
  const credentials = requireAdminCredentials();

  await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Пароль").fill(credentials.password);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByText("Подключено")).toBeVisible();
}
