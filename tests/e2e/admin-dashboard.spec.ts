import { expect, test } from "@playwright/test";
import { loginToAdmin } from "./helpers/env";

test("admin dashboard loads main management sections", async ({ page }) => {
  await loginToAdmin(page);

  await expect(page.getByRole("heading", { name: "Админка" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Настройки" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Секции" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Контакты" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Заявки" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Настройки сайта" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Справка по отображению секций" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Секции лендинга" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Контакты" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Заявки" })).toBeVisible();

  await expect(page.getByText("Контактов на сайте")).toBeVisible();
  await expect(page.getByText("Всего заявок")).toBeVisible();
});
