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
  await expect(page.getByRole("button", { name: "Добавить секцию" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Контакты" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Заявки" })).toBeVisible();
  await expect(page.getByText("Новая секция")).toBeVisible();
  await expect(page.getByText("Тип секции").first()).toBeVisible();
  await expect(page.getByText("Стиль блока").first()).toBeVisible();
  await expect(page.getByText("Первый экран").first()).toBeVisible();
  await expect(page.getByText("Шаблон отображения")).toHaveCount(0);

  await expect(page.getByText("Контактов на сайте")).toBeVisible();
  await expect(page.getByText("Всего заявок")).toBeVisible();

  const logoPreview = page.getByAltText("Текущий логотип");

  if ((await logoPreview.count()) > 0) {
    await expect
      .poll(() =>
        logoPreview.evaluate(
          (image) =>
            image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
});
