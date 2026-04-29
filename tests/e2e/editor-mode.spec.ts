import { expect, test } from "@playwright/test";
import { adminUrl, landingUrl, loginToAdmin } from "./helpers/env";

test("admin session enables the landing editor mode", async ({ page }) => {
  await loginToAdmin(page);

  await page.goto(landingUrl, { waitUntil: "domcontentloaded" });

  const editorEntry = page.getByRole("button", { name: "Включить редактор" });
  await expect(editorEntry).toBeVisible();
  await editorEntry.click();

  await expect(page.getByText("Режим редактора")).toBeVisible();
  const adminLink = page.getByRole("link", { name: "Открыть админку" });
  await expect(adminLink).toBeVisible();
  await expect(adminLink).toHaveAttribute("href", `${adminUrl}/#sections`);

  const sectionEditLink = page.getByRole("link", { name: "Редактировать секцию" }).first();
  await expect(sectionEditLink).toHaveAttribute(
    "href",
    new RegExp(`^${escapeRegExp(adminUrl)}/#cms-section-\\d+$`),
  );
  await expect(page.locator("[data-editor-section-id]").first()).toBeVisible();
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
