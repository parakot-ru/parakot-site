<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

$connection = Database::connection();
$connection->beginTransaction();

try {
    $settings = fetchCurrentSettings($connection);
    $recipientEmail = valueOrNull($settings, 'recipient_email');
    $recipientEmailCc = valueOrNull($settings, 'recipient_email_cc');

    $statement = $connection->prepare(
        'INSERT INTO site_settings (
            id,
            site_title,
            logo_url,
            seo_title,
            seo_description,
            hero_background,
            recipient_email,
            recipient_email_cc
         )
         VALUES (
            1,
            :site_title,
            :logo_url,
            :seo_title,
            :seo_description,
            :hero_background,
            :recipient_email,
            :recipient_email_cc
         )
         ON DUPLICATE KEY UPDATE
            site_title = VALUES(site_title),
            logo_url = VALUES(logo_url),
            seo_title = VALUES(seo_title),
            seo_description = VALUES(seo_description),
            hero_background = VALUES(hero_background),
            recipient_email = VALUES(recipient_email),
            recipient_email_cc = VALUES(recipient_email_cc)'
    );
    $statement->execute([
        ':site_title' => 'Паракот',
        ':logo_url' => '/assets/parakot-logo.webp',
        ':seo_title' => 'Паракот - Парапланерные курсы и туры по Кавказу',
        ':seo_description' => 'Обучение полетам на параплане, туры и выезды по Кавказу с Константином "Котом". Юца, Пятигорск, Чегем, Даргавс, Джилы-Су, Дигория.',
        ':hero_background' => null,
        ':recipient_email' => $recipientEmail,
        ':recipient_email_cc' => $recipientEmailCc
    ]);

    $connection->exec('DELETE FROM section_items');
    $connection->exec('DELETE FROM sections');
    $connection->exec('DELETE FROM contacts');

    insertContact($connection, 'phone', 'Телефон', '+7 (919) 755-14-43', 'tel:+79197551443', 10);
    insertContact($connection, 'phone', 'Телефон', '+7 (928) 358-06-03', 'tel:+79283580603', 20);
    insertContact($connection, 'telegram', 'Telegram', '@parakot_obuchenie', 'https://t.me/parakot_obuchenie', 30);

    insertSection(
        $connection,
        'hero',
        'Паракот.ру',
        null,
        false,
        'Небо. Горы. Свобода полета. С Константином "Котом"',
        'Паракот - мой позывной, а для друзей и учеников я просто Кот. Здесь - обучение, туры и выезды для пилотов в лучших локациях Кавказа: с настоящими горами, воздушным настроением и спокойным, надежным подходом к полетам.',
        0
    );

    $aboutId = insertSection(
        $connection,
        'rich_text',
        'Обо мне',
        'Обо мне',
        true,
        'Больше 20 лет в парапланеризме, обучении и горных выездах',
        "В парапланеризме больше 20 лет. Паракот - позывной, под которым знают многие пилоты и ученики. В работе важны не эффектные обещания, а понятная база: логика полета, рельеф, погода и спокойное отношение к безопасности.\n\nОсновные районы полетов - Юца, Пятигорск и Северный Кавказ. Локации для программ и выездов подбираются по сезону, погоде и уровню группы, чтобы полеты были не только красивыми, но и правильными по условиям.",
        10
    );

    $statsId = insertSection(
        $connection,
        'stats',
        'Опыт',
        null,
        false,
        'Коротко о том, на чем держится обучение',
        null,
        20
    );
    insertItem($connection, $statsId, '20+ лет', 'в парапланеризме', null, 10);
    insertItem($connection, $statsId, 'Кавказ', 'как главный регион полетов', null, 20);
    insertItem($connection, $statsId, 'С нуля', 'до уверенной базы и роста навыка', null, 30);
    insertItem($connection, $statsId, 'Безопасность', 'как главный принцип обучения', null, 40);

    $audienceId = insertSection(
        $connection,
        'cards_grid',
        'Для кого',
        null,
        false,
        'Формат для новичков, продолжающих и самостоятельных пилотов',
        null,
        30
    );
    insertItem($connection, $audienceId, 'Начинающим', 'Тем, кто хочет начать с нуля, здесь все выстроено спокойно и последовательно: от знакомства с крылом и наземки до теории и первых полетов.', null, 10);
    insertItem($connection, $audienceId, 'Продолжающим', 'Если база уже есть, дальше идет работа над динамиком, термиками, анализом погоды и уверенностью в полете.', null, 20);
    insertItem($connection, $audienceId, 'Самостоятельным пилотам', 'Для опытных пилотов доступны выезды по новым локациям Кавказа - с сопровождением и живым знанием региона.', null, 30);

    $programsId = insertSection(
        $connection,
        'cards_grid',
        'Направления',
        'Направления',
        true,
        'Не аттракцион, а настоящая летная практика',
        null,
        40
    );
    insertItem($connection, $programsId, 'Обучение с нуля', 'В программе - наземная подготовка, техника старта, посадки, теория и первые осознанные шаги в небе.', null, 10);
    insertItem($connection, $programsId, 'Повышение уровня', 'Дальше - работа над динамиком, термиками, маршрутным мышлением и исправлением типичных ошибок пилота.', null, 20);
    insertItem($connection, $programsId, 'Туры и выезды', 'Горные поездки по Кавказу с подбором локаций под сезон, прогноз и уровень группы.', null, 30);

    $locationsId = insertSection(
        $connection,
        'locations_grid',
        'Локации',
        'Локации',
        true,
        'Лучшие места Кавказа для обучения, роста и сильных впечатлений',
        null,
        50
    );
    insertItem($connection, $locationsId, 'Юца', 'Базовая точка для обучения, тренировок и регулярной практики.', null, 10);
    insertItem($connection, $locationsId, 'Пятигорск и КМВ', 'Удобная база для логистики, проживания и выездов по прогнозу.', null, 20);
    insertItem($connection, $locationsId, 'Чегем', 'Горная классика с мощной атмосферой и ярким характером полетов.', null, 30);
    insertItem($connection, $locationsId, 'Даргавс', 'Масштабный рельеф, простор и настоящее ощущение высоты.', null, 40);
    insertItem($connection, $locationsId, 'Джилы-Су', 'Одна из самых впечатляющих локаций региона и по видам, и по пути.', null, 50);
    insertItem($connection, $locationsId, 'Дигория', 'Место, где полет легко превращается в настоящее путешествие.', null, 60);

    $timelineId = insertSection(
        $connection,
        'timeline',
        'Как проходит обучение',
        null,
        false,
        'Последовательно, понятно и без спешки',
        null,
        60
    );
    insertItem($connection, $timelineId, 'Знакомство', 'Определяем ваш уровень, цели и удобный формат участия.', null, 10);
    insertItem($connection, $timelineId, 'Наземная подготовка', 'Учимся понимать крыло, старт и базовые движения.', null, 20);
    insertItem($connection, $timelineId, 'Теория', 'Разбираем погоду, аэрологию, безопасность и логику полета.', null, 30);
    insertItem($connection, $timelineId, 'Первые полеты', 'Переходим к практике с контролем и радиоведением.', null, 40);
    insertItem($connection, $timelineId, 'Рост навыка', 'Постепенно добавляем новые задачи и более сложные условия.', null, 50);

    $approachId = insertSection(
        $connection,
        'cards_two_columns',
        'Подход',
        null,
        false,
        'Спокойный ритм, честные условия и то самое воздушное настроение Кавказа',
        null,
        70
    );
    insertItem($connection, $approachId, 'Реальный опыт', 'За плечами много лет практики в горах, на разных стартах и в разных сезонах.', null, 10);
    insertItem($connection, $approachId, 'Индивидуальный подход', 'Формат строится не под поток, а под уровень, темп и задачи конкретного человека.', null, 20);
    insertItem($connection, $approachId, 'Честный выбор условий', 'Если погода не подходит, в воздух никто не идет ради галочки.', null, 30);
    insertItem($connection, $approachId, 'Атмосфера сообщества', 'Здесь важны не только полеты, но и сообщество: горы, выезды и люди, с которыми хочется увидеться снова.', null, 40);

    $toursId = insertSection(
        $connection,
        'highlight',
        'Туры и сборы',
        null,
        false,
        'Ближайшие выезды под сезон, погоду и уровень группы',
        null,
        80
    );
    insertItem($connection, $toursId, 'Актуальные даты', 'Даты, продолжительность и стоимость сборов лучше уточнять напрямую: программа зависит от сезона, погодного окна и состава группы. Позже здесь можно будет добавить 2-3 карточки с конкретными выездами, когда появится подтвержденное расписание.', null, 10);

    $moodId = insertSection(
        $connection,
        'gallery',
        'Атмосфера',
        null,
        false,
        'Полет здесь - это не только навык, но и чувство пространства',
        null,
        90
    );
    insertItem($connection, $moodId, 'Голубое небо и белые облака', 'То самое ощущение, ради которого едут в горы: ясный воздух, большой простор и полет, который запоминается не только на фото.', 'https://images.pexels.com/photos/33375458/pexels-photo-33375458.jpeg?auto=compress&cs=tinysrgb&w=1200', 10);
    insertItem($connection, $moodId, 'Кавказские вершины', 'Снежные пики, хребты и большие долины вокруг делают каждый выезд не только летным, но и настоящим путешествием.', 'https://images.pexels.com/photos/8578705/pexels-photo-8578705.jpeg?auto=compress&cs=tinysrgb&w=1200', 20);
    insertItem($connection, $moodId, 'Нормальное человеческое общение', 'Без суеты, показного героизма и лишнего пафоса. С вниманием к уровню, погоде и тому, чтобы в полете было спокойно.', 'https://images.pexels.com/photos/35926053/pexels-photo-35926053.jpeg?auto=compress&cs=tinysrgb&w=1200', 30);

    $faqId = insertSection(
        $connection,
        'faq',
        'FAQ',
        null,
        false,
        'Частые вопросы',
        null,
        100
    );
    insertItem($connection, $faqId, 'Можно ли без опыта?', 'Да, обучение подходит и тем, кто никогда раньше не летал.', null, 10);
    insertItem($connection, $faqId, 'Когда лучше приезжать?', 'Это зависит от вашей цели: обучение, динамик, термики или выезд в горы.', null, 20);
    insertItem($connection, $faqId, 'Это безопасно?', 'Полеты проводятся только при подходящих условиях и с учетом уровня участника.', null, 30);
    insertItem($connection, $faqId, 'Можно приехать одному?', 'Да, можно приехать индивидуально или присоединиться к группе.', null, 40);

    $connection->commit();

    echo "Landing content seeded successfully.\n";
} catch (Throwable $exception) {
    $connection->rollBack();
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

function fetchCurrentSettings(PDO $connection): array
{
    $statement = $connection->query('SELECT * FROM site_settings WHERE id = 1');
    $settings = $statement->fetch();

    return is_array($settings) ? $settings : [];
}

function valueOrNull(array $data, string $key): ?string
{
    if (!array_key_exists($key, $data)) {
        return null;
    }

    $value = trim((string) $data[$key]);

    return $value === '' ? null : $value;
}

function insertContact(PDO $connection, string $type, string $label, string $value, string $url, int $sortOrder): void
{
    $statement = $connection->prepare(
        'INSERT INTO contacts (type, label, value, url, sort_order, is_visible)
         VALUES (:type, :label, :value, :url, :sort_order, 1)'
    );
    $statement->execute([
        ':type' => $type,
        ':label' => $label,
        ':value' => $value,
        ':url' => $url,
        ':sort_order' => $sortOrder
    ]);
}

function insertSection(
    PDO $connection,
    string $type,
    string $label,
    ?string $menuTitle,
    bool $showInMenu,
    string $title,
    ?string $description,
    int $sortOrder
): int {
    $statement = $connection->prepare(
        'INSERT INTO sections (
            type,
            label,
            menu_title,
            show_in_menu,
            title,
            description,
            sort_order,
            is_published
         )
         VALUES (
            :type,
            :label,
            :menu_title,
            :show_in_menu,
            :title,
            :description,
            :sort_order,
            1
         )'
    );
    $statement->execute([
        ':type' => $type,
        ':label' => $label,
        ':menu_title' => $menuTitle,
        ':show_in_menu' => $showInMenu ? 1 : 0,
        ':title' => $title,
        ':description' => $description,
        ':sort_order' => $sortOrder
    ]);

    return (int) $connection->lastInsertId();
}

function insertItem(
    PDO $connection,
    int $sectionId,
    string $title,
    string $description,
    ?string $imagePath,
    int $sortOrder
): void {
    $statement = $connection->prepare(
        'INSERT INTO section_items (
            section_id,
            title,
            description,
            image_path,
            sort_order,
            is_visible
         )
         VALUES (
            :section_id,
            :title,
            :description,
            :image_path,
            :sort_order,
            1
         )'
    );
    $statement->execute([
        ':section_id' => $sectionId,
        ':title' => $title,
        ':description' => $description,
        ':image_path' => $imagePath,
        ':sort_order' => $sortOrder
    ]);
}
