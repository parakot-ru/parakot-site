<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

$connection = Database::connection();
$connection->beginTransaction();

try {
    $sectionId = findServicesSectionId($connection);

    if ($sectionId === null) {
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
                "services",
                :label,
                :menu_title,
                1,
                :title,
                :description,
                35,
                1
             )'
        );
        $statement->execute(sectionPayload());
        $sectionId = (int) $connection->lastInsertId();
    } else {
        $statement = $connection->prepare(
            'UPDATE sections
             SET type = "services",
                 label = :label,
                 menu_title = :menu_title,
                 show_in_menu = 1,
                 title = :title,
                 description = :description,
                 sort_order = 35,
                 is_published = 1
             WHERE id = :id'
        );
        $statement->execute(sectionPayload([':id' => $sectionId]));
        $deleteItems = $connection->prepare('DELETE FROM section_items WHERE section_id = :section_id');
        $deleteItems->execute([':section_id' => $sectionId]);
    }

    insertService(
        $connection,
        $sectionId,
        'Начальный курс',
        'Базовая программа для старта с нуля: наземная подготовка, теория, первые полеты и спокойный разбор каждого шага.',
        'от 35 000 ₽',
        'https://images.pexels.com/photos/33375458/pexels-photo-33375458.jpeg?auto=compress&cs=tinysrgb&w=1200',
        10
    );
    insertService(
        $connection,
        $sectionId,
        'Курс со школьным снаряжением',
        'Формат для тех, кто еще не покупал комплект. Стоимость зависит от доступности крыла, подвески, запаски и длительности курса.',
        'ориентир 55 000 ₽',
        'https://images.pexels.com/photos/8578705/pexels-photo-8578705.jpeg?auto=compress&cs=tinysrgb&w=1200',
        20
    );
    insertService(
        $connection,
        $sectionId,
        'Повышение уровня',
        'Индивидуальные занятия для пилотов с базой: динамик, термики, прогноз, ошибки старта и посадки, уверенность в воздухе.',
        'от 3 500 ₽ / занятие',
        'https://images.pexels.com/photos/35926053/pexels-photo-35926053.jpeg?auto=compress&cs=tinysrgb&w=1200',
        30
    );
    insertService(
        $connection,
        $sectionId,
        'Туры и выезды по Кавказу',
        'Юца, Чегем, Даргавс, Джилы-Су, Дигория и другие маршруты под сезон, прогноз, уровень группы и логистику.',
        'по запросу',
        'https://images.pexels.com/photos/618833/pexels-photo-618833.jpeg?auto=compress&cs=tinysrgb&w=1200',
        40
    );

    $connection->commit();
    echo "Services section seeded successfully.\n";
} catch (Throwable $exception) {
    $connection->rollBack();
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

function findServicesSectionId(PDO $connection): ?int
{
    $statement = $connection->prepare(
        'SELECT id FROM sections WHERE type = "services" OR label = "Услуги и цены" LIMIT 1'
    );
    $statement->execute();
    $row = $statement->fetch();

    return is_array($row) ? (int) $row['id'] : null;
}

function sectionPayload(array $extra = []): array
{
    return array_merge([
        ':label' => 'Услуги и цены',
        ':menu_title' => 'Цены',
        ':title' => 'Курсы, занятия и выезды',
        ':description' => 'Ориентиры по открытым прайсам парапланерных школ Кавказа. Финальную стоимость лучше подтвердить перед записью: она зависит от снаряжения, прогноза, локации и состава группы.',
    ], $extra);
}

function insertService(
    PDO $connection,
    int $sectionId,
    string $title,
    string $description,
    string $price,
    string $imagePath,
    int $sortOrder
): void {
    $statement = $connection->prepare(
        'INSERT INTO section_items (
            section_id,
            title,
            description,
            image_path,
            meta_json,
            sort_order,
            is_visible
         )
         VALUES (
            :section_id,
            :title,
            :description,
            :image_path,
            :meta_json,
            :sort_order,
            1
         )'
    );
    $statement->execute([
        ':section_id' => $sectionId,
        ':title' => $title,
        ':description' => $description,
        ':image_path' => $imagePath,
        ':meta_json' => json_encode(['price' => $price], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':sort_order' => $sortOrder,
    ]);
}
