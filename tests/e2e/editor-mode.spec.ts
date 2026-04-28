import { expect, test } from "@playwright/test";

const adminUrl = process.env.PARAKOT_ADMIN_URL ?? "http://admin.konekon.ru";
const landingUrl = process.env.PARAKOT_LANDING_URL ?? "http://parakot.konekon.ru";
const adminEmail = process.env.PARAKOT_ADMIN_EMAIL;
const adminPassword = process.env.PARAKOT_ADMIN_PASSWORD;

test("admin session enables the landing editor mode", async ({ page }) => {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set PARAKOT_ADMIN_EMAIL and PARAKOT_ADMIN_PASSWORD before running smoke:editor.",
    );
  }

  await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Пароль").fill(adminPassword);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByText("Подключено")).toBeVisible();

  await page.goto(landingUrl, { waitUntil: "domcontentloaded" });

  const editorEntry = page.getByRole("button", { name: "Включить редактор" });
  await expect(editorEntry).toBeVisible();
  await editorEntry.click();

  await expect(page.getByText("Режим редактора")).toBeVisible();
  await expect(page.getByRole("link", { name: "Открыть админку" })).toBeVisible();
  await expect(page.locator("[data-editor-section-id]").first()).toBeVisible();
});
