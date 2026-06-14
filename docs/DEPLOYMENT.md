# Deployment Policy

## Окружения

### Staging

- Лендинг: `parakot.konekon.ru`
- Админка: `admin.konekon.ru`
- Назначение: эксперименты, проверка дизайна, UX, новых секций и поведения админки.

Staging можно обновлять в процессе обычной разработки без отдельного подтверждения, если задача связана с проверкой изменений на живом сайте.

### Production

- Лендинг: `parakot.ru`
- Админка: `admin.parakot.ru`
- Назначение: рабочий сайт Константина / Паракота.

Production нельзя обновлять автоматически или "заодно". Деплой на production делается только после явной команды владельца проекта, например:

- "выкатывай на прод"
- "обнови parakot.ru"
- "перенеси это на боевой сайт"

## Рабочее правило

1. Разработка идет локально в репозитории.
2. Для проверки изменения выкатываются на staging.
3. Изменения фиксируются в git.
4. Production остается без изменений, пока не будет отдельного подтверждения.

Если есть сомнение, staging можно трогать, production - не трогать.

## Быстрый деплой

Скрипты деплоят лендинг и админку. API не трогается. При деплое лендинга
исключаются `/api/` и `/uploads/`.

Staging:

```bash
npm run deploy:staging
```

Staging со smoke-тестом лендинга после деплоя:

```bash
RUN_SMOKE=1 npm run deploy:staging
```

Production защищен от случайного запуска:

```bash
npm run deploy:production -- --confirm-production
```

Production со smoke-тестом лендинга после деплоя:

```bash
RUN_SMOKE=1 npm run deploy:production -- --confirm-production
```

## Сборка админки

Админку важно собирать с API и адресом лендинга нужного окружения.

Staging:

```bash
VITE_API_BASE_URL="http://parakot.konekon.ru/api" \
VITE_SITE_BASE_URL="http://parakot.konekon.ru" \
npm --prefix admin run build
```

Production:

```bash
VITE_API_BASE_URL="https://parakot.ru/api" \
VITE_SITE_BASE_URL="https://parakot.ru" \
npm --prefix admin run build
```
