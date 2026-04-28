# Testing

## Smoke-тест режима редактора

Тест открывает тестовую админку, логинится, переходит на лендинг и проверяет, что кнопка `Включить редактор` появляется и включает панель редактора.

```bash
PARAKOT_ADMIN_EMAIL="..." \
PARAKOT_ADMIN_PASSWORD="..." \
npm run smoke:editor
```

По умолчанию используются тестовые адреса:

- `http://admin.konekon.ru`
- `http://parakot.konekon.ru`

Их можно переопределить:

```bash
PARAKOT_ADMIN_URL="http://admin.konekon.ru" \
PARAKOT_LANDING_URL="http://parakot.konekon.ru" \
PARAKOT_ADMIN_EMAIL="..." \
PARAKOT_ADMIN_PASSWORD="..." \
npm run smoke:editor
```

Для визуальной отладки можно запускать браузер не в headless-режиме:

```bash
PARAKOT_ADMIN_EMAIL="..." \
PARAKOT_ADMIN_PASSWORD="..." \
npm run smoke:editor:headed
```

На macOS тест по умолчанию использует установленный Google Chrome. Если нужно использовать другой канал браузера, можно задать `PLAYWRIGHT_BROWSER_CHANNEL`.
