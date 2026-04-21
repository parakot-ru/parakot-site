<?php

declare(strict_types=1);

$bootstrapPath = dirname(__DIR__) . '/src/bootstrap.php';

if (!is_file($bootstrapPath)) {
    $bootstrapPath = __DIR__ . '/src/bootstrap.php';
}

require_once $bootstrapPath;

sendCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    Response::noContent();
    exit;
}

$segments = routeSegments();
$lastSegment = $segments === [] ? '' : end($segments);
$connection = null;

try {
    if ($method === 'POST' && $segments === ['login']) {
        $payload = requireJsonBody();
        $email = strtolower(requiredString($payload, 'email'));
        $password = requiredString($payload, 'password');
        $connection = Database::connection();
        $user = findAdminByEmail($connection, $email);

        if ($user === [] || (int) $user['is_active'] !== 1 || !password_verify($password, $user['password_hash'])) {
            Response::json([
                'ok' => false,
                'error' => 'Invalid email or password.',
            ], 401);
            exit;
        }

        $token = createAdminToken($connection, (int) $user['id']);

        Response::json([
            'ok' => true,
            'data' => [
                'token' => $token,
                'user' => publicAdminUser($user),
            ],
        ]);
        exit;
    }

    if ($method === 'GET' && ($lastSegment === '' || $lastSegment === 'health')) {
        Response::json([
            'ok' => true,
            'service' => 'parakot-api',
            'environment' => Env::get('APP_ENV', 'production'),
        ]);
        exit;
    }

    if ($method === 'GET' && $lastSegment === 'db-ping') {
        $connection = Database::connection();
        $statement = $connection->query('SELECT 1 AS ping');

        Response::json([
            'ok' => true,
            'database' => $statement->fetch(),
        ]);
        exit;
    }

    if ($method === 'GET' && $lastSegment === 'content') {
        $connection = Database::connection();

        Response::json([
            'ok' => true,
            'data' => [
                'settings' => fetchSettings($connection),
                'contacts' => fetchContacts($connection, true),
                'sections' => fetchSections($connection, true),
            ],
        ]);
        exit;
    }

    if ($method === 'POST' && $lastSegment === 'leads') {
        $input = json_decode((string) file_get_contents('php://input'), true);

        if (!is_array($input)) {
            Response::json([
                'ok' => false,
                'error' => 'Invalid JSON body.',
            ], 400);
            exit;
        }

        $name = trim((string) ($input['name'] ?? ''));
        $contact = trim((string) ($input['contact'] ?? ''));
        $topic = trim((string) ($input['topic'] ?? ''));
        $message = trim((string) ($input['message'] ?? ''));

        if ($name === '' || $contact === '') {
            Response::json([
                'ok' => false,
                'error' => 'Fields "name" and "contact" are required.',
            ], 422);
            exit;
        }

        $connection = Database::connection();
        $statement = $connection->prepare(
            'INSERT INTO leads (name, contact, topic, message) VALUES (:name, :contact, :topic, :message)'
        );
        $statement->execute([
            ':name' => $name,
            ':contact' => $contact,
            ':topic' => $topic !== '' ? $topic : null,
            ':message' => $message !== '' ? $message : null,
        ]);
        $leadId = (int) $connection->lastInsertId();
        $settings = fetchSettings($connection);
        $notificationSent = sendLeadNotification($settings, [
            'id' => $leadId,
            'name' => $name,
            'contact' => $contact,
            'topic' => $topic,
            'message' => $message,
        ]);

        Response::json([
            'ok' => true,
            'lead_id' => $leadId,
            'notification_sent' => $notificationSent,
            'message' => 'Lead stored successfully.',
        ], 201);
        exit;
    }

    $connection = Database::connection();
    $currentUser = requireAdminUser($connection);

    if ($method === 'GET' && $segments === ['me']) {
        Response::json([
            'ok' => true,
            'data' => publicAdminUser($currentUser),
        ]);
        exit;
    }

    if ($method === 'POST' && $segments === ['logout']) {
        revokeCurrentToken($connection);

        Response::json([
            'ok' => true,
            'data' => null,
        ]);
        exit;
    }

    if ($method === 'GET' && $segments === ['settings']) {
        Response::json([
            'ok' => true,
            'data' => fetchSettings($connection),
        ]);
        exit;
    }

    if (($method === 'PUT' || $method === 'PATCH') && $segments === ['settings']) {
        $payload = requireJsonBody();
        $data = [
            ':site_title' => requiredString($payload, 'site_title'),
            ':seo_title' => nullableString($payload, 'seo_title'),
            ':seo_description' => nullableString($payload, 'seo_description'),
            ':hero_background' => nullableString($payload, 'hero_background'),
            ':recipient_email' => nullableString($payload, 'recipient_email'),
            ':recipient_email_cc' => nullableString($payload, 'recipient_email_cc'),
        ];

        $statement = $connection->prepare(
            'UPDATE site_settings
             SET site_title = :site_title,
                 seo_title = :seo_title,
                 seo_description = :seo_description,
                 hero_background = :hero_background,
                 recipient_email = :recipient_email,
                 recipient_email_cc = :recipient_email_cc
             WHERE id = 1'
        );
        $statement->execute($data);

        Response::json([
            'ok' => true,
            'data' => fetchSettings($connection),
        ]);
        exit;
    }

    if ($method === 'GET' && $segments === ['contacts']) {
        Response::json([
            'ok' => true,
            'data' => fetchContacts($connection, false),
        ]);
        exit;
    }

    if ($method === 'POST' && $segments === ['contacts']) {
        $payload = requireJsonBody();
        $statement = $connection->prepare(
            'INSERT INTO contacts (type, label, value, url, sort_order, is_visible)
             VALUES (:type, :label, :value, :url, :sort_order, :is_visible)'
        );
        $statement->execute([
            ':type' => requiredString($payload, 'type'),
            ':label' => requiredString($payload, 'label'),
            ':value' => nullableString($payload, 'value'),
            ':url' => nullableString($payload, 'url'),
            ':sort_order' => intValue($payload, 'sort_order', 0),
            ':is_visible' => boolToInt($payload, 'is_visible', true),
        ]);

        $contact = findById($connection, 'contacts', (int) $connection->lastInsertId());
        Response::json([
            'ok' => true,
            'data' => $contact,
        ], 201);
        exit;
    }

    if (($method === 'PUT' || $method === 'PATCH') && count($segments) === 2 && $segments[0] === 'contacts') {
        $contactId = requirePositiveInt($segments[1], 'contact id');
        $payload = requireJsonBody();
        ensureRecordExists($connection, 'contacts', $contactId);

        $statement = $connection->prepare(
            'UPDATE contacts
             SET type = :type,
                 label = :label,
                 value = :value,
                 url = :url,
                 sort_order = :sort_order,
                 is_visible = :is_visible
             WHERE id = :id'
        );
        $statement->execute([
            ':id' => $contactId,
            ':type' => requiredString($payload, 'type'),
            ':label' => requiredString($payload, 'label'),
            ':value' => nullableString($payload, 'value'),
            ':url' => nullableString($payload, 'url'),
            ':sort_order' => intValue($payload, 'sort_order', 0),
            ':is_visible' => boolToInt($payload, 'is_visible', true),
        ]);

        Response::json([
            'ok' => true,
            'data' => findById($connection, 'contacts', $contactId),
        ]);
        exit;
    }

    if ($method === 'DELETE' && count($segments) === 2 && $segments[0] === 'contacts') {
        $contactId = requirePositiveInt($segments[1], 'contact id');
        ensureRecordExists($connection, 'contacts', $contactId);
        deleteById($connection, 'contacts', $contactId);
        Response::noContent();
        exit;
    }

    if ($method === 'GET' && $segments === ['sections']) {
        Response::json([
            'ok' => true,
            'data' => fetchSections($connection, false),
        ]);
        exit;
    }

    if ($method === 'POST' && $segments === ['sections']) {
        $payload = requireJsonBody();
        $statement = $connection->prepare(
            'INSERT INTO sections
             (type, label, menu_title, show_in_menu, title, description, image_path, sort_order, is_published)
             VALUES
             (:type, :label, :menu_title, :show_in_menu, :title, :description, :image_path, :sort_order, :is_published)'
        );
        $statement->execute([
            ':type' => requiredString($payload, 'type'),
            ':label' => requiredString($payload, 'label'),
            ':menu_title' => nullableString($payload, 'menu_title'),
            ':show_in_menu' => boolToInt($payload, 'show_in_menu', false),
            ':title' => requiredString($payload, 'title'),
            ':description' => nullableString($payload, 'description'),
            ':image_path' => nullableString($payload, 'image_path'),
            ':sort_order' => intValue($payload, 'sort_order', 0),
            ':is_published' => boolToInt($payload, 'is_published', true),
        ]);

        Response::json([
            'ok' => true,
            'data' => fetchSectionById($connection, (int) $connection->lastInsertId()),
        ], 201);
        exit;
    }

    if (($method === 'PUT' || $method === 'PATCH') && count($segments) === 2 && $segments[0] === 'sections') {
        $sectionId = requirePositiveInt($segments[1], 'section id');
        $payload = requireJsonBody();
        ensureRecordExists($connection, 'sections', $sectionId);

        $statement = $connection->prepare(
            'UPDATE sections
             SET type = :type,
                 label = :label,
                 menu_title = :menu_title,
                 show_in_menu = :show_in_menu,
                 title = :title,
                 description = :description,
                 image_path = :image_path,
                 sort_order = :sort_order,
                 is_published = :is_published
             WHERE id = :id'
        );
        $statement->execute([
            ':id' => $sectionId,
            ':type' => requiredString($payload, 'type'),
            ':label' => requiredString($payload, 'label'),
            ':menu_title' => nullableString($payload, 'menu_title'),
            ':show_in_menu' => boolToInt($payload, 'show_in_menu', false),
            ':title' => requiredString($payload, 'title'),
            ':description' => nullableString($payload, 'description'),
            ':image_path' => nullableString($payload, 'image_path'),
            ':sort_order' => intValue($payload, 'sort_order', 0),
            ':is_published' => boolToInt($payload, 'is_published', true),
        ]);

        Response::json([
            'ok' => true,
            'data' => fetchSectionById($connection, $sectionId),
        ]);
        exit;
    }

    if ($method === 'DELETE' && count($segments) === 2 && $segments[0] === 'sections') {
        $sectionId = requirePositiveInt($segments[1], 'section id');
        ensureRecordExists($connection, 'sections', $sectionId);
        deleteById($connection, 'sections', $sectionId);
        Response::noContent();
        exit;
    }

    if ($method === 'POST' && count($segments) === 3 && $segments[0] === 'sections' && $segments[2] === 'items') {
        $sectionId = requirePositiveInt($segments[1], 'section id');
        $payload = requireJsonBody();
        ensureRecordExists($connection, 'sections', $sectionId);

        $statement = $connection->prepare(
            'INSERT INTO section_items
             (section_id, title, description, image_path, link_url, meta_json, sort_order, is_visible)
             VALUES
             (:section_id, :title, :description, :image_path, :link_url, :meta_json, :sort_order, :is_visible)'
        );
        $statement->execute([
            ':section_id' => $sectionId,
            ':title' => requiredString($payload, 'title'),
            ':description' => nullableString($payload, 'description'),
            ':image_path' => nullableString($payload, 'image_path'),
            ':link_url' => nullableString($payload, 'link_url'),
            ':meta_json' => encodeMetaJson($payload),
            ':sort_order' => intValue($payload, 'sort_order', 0),
            ':is_visible' => boolToInt($payload, 'is_visible', true),
        ]);

        Response::json([
            'ok' => true,
            'data' => findById($connection, 'section_items', (int) $connection->lastInsertId()),
        ], 201);
        exit;
    }

    if (($method === 'PUT' || $method === 'PATCH') && count($segments) === 2 && $segments[0] === 'section-items') {
        $itemId = requirePositiveInt($segments[1], 'section item id');
        $payload = requireJsonBody();
        $existingItem = ensureRecordExists($connection, 'section_items', $itemId);

        $sectionId = array_key_exists('section_id', $payload)
            ? requirePositiveInt((string) $payload['section_id'], 'section id')
            : (int) $existingItem['section_id'];
        ensureRecordExists($connection, 'sections', $sectionId);

        $statement = $connection->prepare(
            'UPDATE section_items
             SET section_id = :section_id,
                 title = :title,
                 description = :description,
                 image_path = :image_path,
                 link_url = :link_url,
                 meta_json = :meta_json,
                 sort_order = :sort_order,
                 is_visible = :is_visible
             WHERE id = :id'
        );
        $statement->execute([
            ':id' => $itemId,
            ':section_id' => $sectionId,
            ':title' => requiredString($payload, 'title'),
            ':description' => nullableString($payload, 'description'),
            ':image_path' => nullableString($payload, 'image_path'),
            ':link_url' => nullableString($payload, 'link_url'),
            ':meta_json' => encodeMetaJson($payload),
            ':sort_order' => intValue($payload, 'sort_order', 0),
            ':is_visible' => boolToInt($payload, 'is_visible', true),
        ]);

        Response::json([
            'ok' => true,
            'data' => findById($connection, 'section_items', $itemId),
        ]);
        exit;
    }

    if ($method === 'DELETE' && count($segments) === 2 && $segments[0] === 'section-items') {
        $itemId = requirePositiveInt($segments[1], 'section item id');
        ensureRecordExists($connection, 'section_items', $itemId);
        deleteById($connection, 'section_items', $itemId);
        Response::noContent();
        exit;
    }

    if ($method === 'GET' && $segments === ['leads']) {
        $statement = $connection->query('SELECT * FROM leads ORDER BY created_at DESC, id DESC');

        Response::json([
            'ok' => true,
            'data' => $statement->fetchAll(),
        ]);
        exit;
    }

    if (($method === 'PUT' || $method === 'PATCH') && count($segments) === 2 && $segments[0] === 'leads') {
        $leadId = requirePositiveInt($segments[1], 'lead id');
        $payload = requireJsonBody();
        $status = requiredString($payload, 'status');
        ensureRecordExists($connection, 'leads', $leadId);

        $statement = $connection->prepare('UPDATE leads SET status = :status WHERE id = :id');
        $statement->execute([
            ':id' => $leadId,
            ':status' => $status,
        ]);

        Response::json([
            'ok' => true,
            'data' => findById($connection, 'leads', $leadId),
        ]);
        exit;
    }

    Response::json([
        'ok' => false,
        'error' => 'Route not found.',
    ], 404);
} catch (Throwable $exception) {
    $debug = Env::get('APP_DEBUG', '0') === '1';

    Response::json([
        'ok' => false,
        'error' => $debug ? $exception->getMessage() : 'Internal server error.',
    ], 500);
}

function sendCorsHeaders(): void
{
    $allowedOrigins = Env::get('CORS_ALLOWED_ORIGINS', '*');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($allowedOrigins === '*') {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin !== '') {
        $origins = array_map('trim', explode(',', $allowedOrigins));

        if (in_array($origin, $origins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

function bearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (strpos($header, 'Bearer ') !== 0) {
        return null;
    }

    return trim(substr($header, 7));
}

function requireAdminUser(PDO $connection): array
{
    $token = bearerToken();

    if ($token === null || strlen($token) < 32) {
        Response::json([
            'ok' => false,
            'error' => 'Unauthorized.',
        ], 401);
        exit;
    }

    $statement = $connection->prepare(
        'SELECT admin_users.*
         FROM admin_tokens
         INNER JOIN admin_users ON admin_users.id = admin_tokens.user_id
         WHERE admin_tokens.token_hash = :token_hash
           AND admin_tokens.expires_at > NOW()
           AND admin_users.is_active = 1
         LIMIT 1'
    );
    $statement->execute([
        ':token_hash' => hash('sha256', $token),
    ]);

    $user = $statement->fetch();

    if (!is_array($user)) {
        Response::json([
            'ok' => false,
            'error' => 'Unauthorized.',
        ], 401);
        exit;
    }

    return $user;
}

function findAdminByEmail(PDO $connection, string $email): array
{
    $statement = $connection->prepare('SELECT * FROM admin_users WHERE email = :email LIMIT 1');
    $statement->execute([':email' => $email]);
    $user = $statement->fetch();

    return is_array($user) ? $user : [];
}

function createAdminToken(PDO $connection, int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $statement = $connection->prepare(
        'INSERT INTO admin_tokens (user_id, token_hash, expires_at)
         VALUES (:user_id, :token_hash, DATE_ADD(NOW(), INTERVAL 14 DAY))'
    );
    $statement->execute([
        ':user_id' => $userId,
        ':token_hash' => hash('sha256', $token),
    ]);

    return $token;
}

function revokeCurrentToken(PDO $connection): void
{
    $token = bearerToken();

    if ($token === null) {
        return;
    }

    $statement = $connection->prepare('DELETE FROM admin_tokens WHERE token_hash = :token_hash');
    $statement->execute([
        ':token_hash' => hash('sha256', $token),
    ]);
}

function publicAdminUser(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
    ];
}

/**
 * @return string[]
 */
function routeSegments(): array
{
    $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($requestUri, PHP_URL_PATH);
    $path = is_string($path) ? trim($path, '/') : '';
    $segments = $path === '' ? [] : array_values(array_filter(explode('/', $path)));

    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $scriptDirectory = trim((string) dirname($scriptName), '/.');
    $scriptSegments = $scriptDirectory === '' ? [] : array_values(array_filter(explode('/', $scriptDirectory)));

    foreach ($scriptSegments as $scriptSegment) {
        if ($segments !== [] && $segments[0] === $scriptSegment) {
            array_shift($segments);
        }
    }

    if ($segments !== [] && end($segments) === 'index.php') {
        array_pop($segments);
    }

    return array_values($segments);
}

/**
 * @return array<string, mixed>
 */
function requireJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);

    if (!is_array($input)) {
        throw new InvalidArgumentException('Invalid JSON body.');
    }

    return $input;
}

/**
 * @param array<string, mixed> $payload
 */
function requiredString(array $payload, string $key): string
{
    $value = trim((string) ($payload[$key] ?? ''));

    if ($value === '') {
        throw new InvalidArgumentException(sprintf('Field "%s" is required.', $key));
    }

    return $value;
}

/**
 * @param array<string, mixed> $payload
 */
function nullableString(array $payload, string $key): ?string
{
    if (!array_key_exists($key, $payload)) {
        return null;
    }

    $value = trim((string) $payload[$key]);

    return $value === '' ? null : $value;
}

/**
 * @param array<string, mixed> $payload
 */
function intValue(array $payload, string $key, int $default = 0): int
{
    if (!array_key_exists($key, $payload) || $payload[$key] === '') {
        return $default;
    }

    return (int) $payload[$key];
}

/**
 * @param array<string, mixed> $payload
 */
function boolToInt(array $payload, string $key, bool $default = false): int
{
    if (!array_key_exists($key, $payload)) {
        return $default ? 1 : 0;
    }

    $value = $payload[$key];

    if (is_bool($value)) {
        return $value ? 1 : 0;
    }

    return in_array((string) $value, ['1', 'true', 'yes', 'on'], true) ? 1 : 0;
}

/**
 * @param mixed $value
 */
function requirePositiveInt($value, string $label): int
{
    $number = (int) $value;

    if ($number <= 0) {
        throw new InvalidArgumentException(sprintf('Invalid %s.', $label));
    }

    return $number;
}

function encodeMetaJson(array $payload): ?string
{
    if (!array_key_exists('meta_json', $payload)) {
        return null;
    }

    $value = $payload['meta_json'];

    if ($value === null || $value === '') {
        return null;
    }

    if (is_string($value)) {
        return $value;
    }

    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function fetchSettings(PDO $connection): array
{
    $statement = $connection->query('SELECT * FROM site_settings WHERE id = 1');
    $settings = $statement->fetch();

    return is_array($settings) ? $settings : [];
}

/**
 * @param array<string, mixed> $settings
 * @param array<string, mixed> $lead
 */
function sendLeadNotification(array $settings, array $lead): bool
{
    $recipient = trim((string) ($settings['recipient_email'] ?? Env::get('LEADS_EMAIL', '')));

    if ($recipient === '') {
        return false;
    }

    $subject = sprintf('Новая заявка с сайта Паракот #%d', (int) $lead['id']);
    $body = implode("\n", [
        'Новая заявка с сайта Паракот',
        '',
        'Имя: ' . (string) $lead['name'],
        'Контакт: ' . (string) $lead['contact'],
        'Что интересует: ' . valueOrDash((string) $lead['topic']),
        '',
        'Комментарий:',
        valueOrDash((string) $lead['message']),
        '',
        'Заявка сохранена в админке сайта.',
    ]);

    $fromEmail = Env::get('MAIL_FROM_EMAIL', 'no-reply@parakot.konekon.ru');
    $fromName = Env::get('MAIL_FROM_NAME', 'Parakot');
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . formatEmailHeader($fromName, $fromEmail),
    ];

    $cc = trim((string) ($settings['recipient_email_cc'] ?? Env::get('LEADS_EMAIL_CC', '')));

    if ($cc !== '') {
        $headers[] = 'Cc: ' . $cc;
    }

    $encodedSubject = function_exists('mb_encode_mimeheader')
        ? mb_encode_mimeheader($subject, 'UTF-8')
        : '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $extraParams = filter_var($fromEmail, FILTER_VALIDATE_EMAIL)
        ? '-f' . $fromEmail
        : '';
    $sent = $extraParams !== ''
        ? mail($recipient, $encodedSubject, $body, implode("\r\n", $headers), $extraParams)
        : mail($recipient, $encodedSubject, $body, implode("\r\n", $headers));

    if (!$sent) {
        error_log(sprintf('Lead notification #%d was not sent to %s.', (int) $lead['id'], $recipient));
    }

    return $sent;
}

function valueOrDash(string $value): string
{
    $value = trim($value);

    return $value === '' ? '-' : $value;
}

function formatEmailHeader(string $name, string $email): string
{
    $name = trim($name);
    $email = trim($email);

    if ($name === '') {
        return $email;
    }

    $encodedName = function_exists('mb_encode_mimeheader')
        ? mb_encode_mimeheader($name, 'UTF-8')
        : '=?UTF-8?B?' . base64_encode($name) . '?=';

    return sprintf('%s <%s>', $encodedName, $email);
}

function fetchContacts(PDO $connection, bool $visibleOnly): array
{
    $sql = 'SELECT * FROM contacts';

    if ($visibleOnly) {
        $sql .= ' WHERE is_visible = 1';
    }

    $sql .= ' ORDER BY sort_order ASC, id ASC';

    $statement = $connection->query($sql);

    return $statement->fetchAll();
}

function fetchSections(PDO $connection, bool $publishedOnly): array
{
    $sql = 'SELECT * FROM sections';

    if ($publishedOnly) {
        $sql .= ' WHERE is_published = 1';
    }

    $sql .= ' ORDER BY sort_order ASC, id ASC';

    $sections = $connection->query($sql)->fetchAll();
    $items = fetchSectionItems($connection, null, $publishedOnly);
    $itemsBySection = [];

    foreach ($items as $item) {
        $sectionId = (int) $item['section_id'];

        if (!array_key_exists($sectionId, $itemsBySection)) {
            $itemsBySection[$sectionId] = [];
        }

        $itemsBySection[$sectionId][] = $item;
    }

    foreach ($sections as &$section) {
        $sectionId = (int) $section['id'];
        $section['items'] = array_key_exists($sectionId, $itemsBySection)
            ? $itemsBySection[$sectionId]
            : [];
    }
    unset($section);

    return $sections;
}

function fetchSectionItems(PDO $connection, ?int $sectionId, bool $visibleOnly): array
{
    $conditions = [];
    $params = [];

    if ($sectionId !== null) {
        $conditions[] = 'section_id = :section_id';
        $params[':section_id'] = $sectionId;
    }

    if ($visibleOnly) {
        $conditions[] = 'is_visible = 1';
    }

    $sql = 'SELECT * FROM section_items';

    if ($conditions !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }

    $sql .= ' ORDER BY sort_order ASC, id ASC';

    $statement = $connection->prepare($sql);
    $statement->execute($params);

    return $statement->fetchAll();
}

function fetchSectionById(PDO $connection, int $sectionId): array
{
    $section = findById($connection, 'sections', $sectionId);
    $section['items'] = fetchSectionItems($connection, $sectionId, false);

    return $section;
}

function ensureRecordExists(PDO $connection, string $table, int $id): array
{
    $record = findById($connection, $table, $id);

    if ($record === []) {
        throw new RuntimeException(sprintf('Record not found in "%s".', $table), 404);
    }

    return $record;
}

function findById(PDO $connection, string $table, int $id): array
{
    $statement = $connection->prepare(sprintf('SELECT * FROM %s WHERE id = :id LIMIT 1', $table));
    $statement->execute([':id' => $id]);
    $record = $statement->fetch();

    return is_array($record) ? $record : [];
}

function deleteById(PDO $connection, string $table, int $id): void
{
    $statement = $connection->prepare(sprintf('DELETE FROM %s WHERE id = :id', $table));
    $statement->execute([':id' => $id]);
}
