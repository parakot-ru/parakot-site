import { expect, test } from "@playwright/test";
import { landingUrl } from "./helpers/env";

test("public landing loads managed content and contact form", async ({ page }) => {
  const contentResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/content") && response.ok(),
  );

  await page.goto(landingUrl, { waitUntil: "domcontentloaded" });
  await contentResponsePromise;

  await expect(page.getByRole("link", { name: /Паракот/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Небо|Паракот|Горы/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Оставить заявку" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Контакты" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Оставить заявку" }).first().click();

  await expect(page.getByRole("heading", { name: /откликается/ })).toBeVisible();
  await expect(page.getByLabel("Имя")).toBeVisible();
  await expect(page.getByLabel("Телефон или Telegram")).toBeVisible();
  await expect(page.getByRole("button", { name: "Отправить заявку" })).toBeVisible();
});
