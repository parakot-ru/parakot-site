# API

Здесь будет REST backend проекта.

Текущий стек:

- PHP 7.2+ совместимый каркас
- PDO + MySQL
- JSON API
- `.env` для локального конфига

## Текущий каркас

- `public/index.php` - единая точка входа
- `public/.htaccess` - роутинг для Apache
- `src/` - базовые классы окружения, БД и JSON-ответов
- `schema.sql` - стартовая схема БД
- `bin/check-db.php` - простой CLI-пинг до БД

## Доступные маршруты

- `GET /health`
- `GET /db-ping`
- `GET /content`
- `GET /settings`
- `PUT|PATCH /settings`
- `GET /contacts`
- `POST /contacts`
- `PUT|PATCH /contacts/{id}`
- `DELETE /contacts/{id}`
- `GET /sections`
- `POST /sections`
- `PUT|PATCH /sections/{id}`
- `DELETE /sections/{id}`
- `POST /sections/{id}/items`
- `PUT|PATCH /section-items/{id}`
- `DELETE /section-items/{id}`
- `GET /leads`
- `PUT|PATCH /leads/{id}`
- `POST /leads`

## Конфиг

Локальные секреты хранятся в `api/.env` и не попадают в git.

Для новой среды можно взять шаблон из:

- `.env.example`

## Что дальше

- авторизация для админки
- загрузка изображений
- отправка уведомлений на email
- просмотр и изменение статусов заявок

Предполагаемое размещение:

- `admin.parakot.ru/api`
или
- `api.parakot.ru`
