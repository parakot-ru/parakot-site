# Testing

## Smoke-тесты

Тесты открывают живое тестовое окружение в браузере и проверяют основные сценарии без изменения контента:

- `smoke:api` проверяет публичный `/content`, логин в API и чтение dashboard-данных.
- `smoke:landing` проверяет, что лендинг загрузил управляемый контент и форму заявки.
- `smoke:admin` проверяет вход в админку и основные разделы интерфейса.
- `smoke:editor` проверяет, что админская сессия включает кнопку редактора на лендинге.
- `smoke` запускает весь набор.

```bash
PARAKOT_ADMIN_EMAIL="..." \
PARAKOT_ADMIN_PASSWORD="..." \
npm run smoke
```

По умолчанию используются тестовые адреса:

- `http://admin.konekon.ru`
- `http://parakot.konekon.ru`

Их можно переопределить:

```bash
PARAKOT_ADMIN_URL="http://admin.konekon.ru" \
PARAKOT_LANDING_URL="http://parakot.konekon.ru" \
PARAKOT_EXPECTED_EDITOR_ADMIN_URL="http://admin.konekon.ru" \
PARAKOT_ADMIN_EMAIL="..." \
PARAKOT_ADMIN_PASSWORD="..." \
npm run smoke:editor
```

`PARAKOT_EXPECTED_EDITOR_ADMIN_URL` нужен для проверки ссылок из режима редактора. На production лендинг умеет сам выбрать `https://admin.parakot.ru`, если SSL доступен, или откатиться на `http://admin.parakot.ru`.

Для визуальной отладки можно запускать браузер не в headless-режиме:

```bash
PARAKOT_ADMIN_EMAIL="..." \
PARAKOT_ADMIN_PASSWORD="..." \
npm run smoke:editor:headed
```

На macOS тест по умолчанию использует установленный Google Chrome. Если нужно использовать другой канал браузера, можно задать `PLAYWRIGHT_BROWSER_CHANNEL`.
