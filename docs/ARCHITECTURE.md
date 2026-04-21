# Архитектура MVP

## Общая идея

Проект разделяется на 3 части в одном репозитории:

- `landing/` - публичный сайт `parakot.ru`
- `admin/` - отдельная админка `admin.parakot.ru`
- `api/` - REST backend на PHP + MySQL

Такой подход позволяет:

- держать быстрый и легкий лендинг без SPA-слоя
- сделать удобную отдельную админку без перезагрузок страниц
- хранить весь проект в одном месте

## Стек

### Landing

- HTML/CSS/JS
- позже можно перевести на простой шаблонный рендеринг через PHP, если это упростит публикацию контента

### Admin

- React + Vite
- только авторизованная часть
- работа с API через REST

### API

- PHP 8+
- PDO
- MySQL
- JSON REST API
- SMTP для отправки заявок на email

## Модель контента

Нужно избегать слишком общего "конструктора сайта". Вместо этого лучше сделать управляемые типы секций:

- `hero`
- `rich_text`
- `stats`
- `cards_grid`
- `locations_grid`
- `timeline`
- `highlight`
- `gallery`
- `faq`
- `contacts`

У секции:

- `type`
- `label`
- `menu_title`
- `show_in_menu`
- `title`
- `description`
- `sort_order`
- `is_published`

У карточек внутри секции:

- `title`
- `description`
- `image_path`
- `link_url`
- `sort_order`

## Контакты

Контакты должны быть не жестко прибиты к Telegram и VK, а храниться как универсальный список.

Поля контакта:

- `type`
- `label`
- `value`
- `url`
- `sort_order`
- `is_visible`

Примеры:

- телефон
- email
- telegram
- vk
- whatsapp
- instagram
- youtube
- другой мессенджер или соцсеть

## Настройки

Отдельный блок настроек проекта:

- `recipient_email`
- `recipient_email_cc`
- `site_title`
- `seo_title`
- `seo_description`
- `hero_background`

## Заявки

Форма на сайте:

- сохраняет заявку в БД
- отправляет уведомление на email

Поля заявки:

- `name`
- `contact`
- `topic`
- `message`
- `created_at`
- `status`

## Ближайший MVP

### Этап 1

- каркас репозитория
- документация
- git

### Этап 2

- схема MySQL
- REST endpoints
- базовый PHP API

### Этап 3

- React-админка для:
  - секций
  - карточек
  - контактов
  - настроек
  - заявок

### Этап 4

- лендинг начинает читать данные из API или из подготовленного JSON
