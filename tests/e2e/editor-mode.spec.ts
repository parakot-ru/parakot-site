import { expect, test } from "@playwright/test";
import { landingUrl, loginToAdmin } from "./helpers/env";

test("admin session enables the landing editor mode", async ({ page }) => {
  await loginToAdmin(page);

  await page.goto(landingUrl, { waitUntil: "domcontentloaded" });

  const editorEntry = page.getByRole("button", { name: "Включить редактор" });
  await expect(editorEntry).toBeVisible();
  await editorEntry.click();

  await expect(page.getByText("Режим редактора")).toBeVisible();
  await expect(page.getByRole("link", { name: "Открыть админку" })).toBeVisible();
  await expect(page.locator("[data-editor-section-id]").first()).toBeVisible();
});
