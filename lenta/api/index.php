<?php

declare(strict_types=1);

sendCorsHeaders();
loadEnv(__DIR__ . '/.env');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    noContent();
    exit;
}

$path = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$segments = array_values(array_filter(explode('/', $path)));
$lastSegment = $segments === [] ? '' : end($segments);

if ($lastSegment === 'health') {
    jsonResponse([
        'ok' => true,
        'service' => 'parakot-lenta-api',
        'configured' => isConfigured(),
    ]);
    exit;
}

if ($lastSegment !== 'posts') {
    jsonResponse([
        'ok' => false,
        'error' => 'Not found.',
    ], 404);
    exit;
}

try {
    if (!isConfigured()) {
        jsonResponse([
            'ok' => true,
            'configured' => false,
            'message' => 'VK_ACCESS_TOKEN and VK_OWNER_ID are not configured yet.',
            'data' => [
                'posts' => [],
                'next_offset' => 0,
                'has_more' => false,
            ],
        ]);
        exit;
    }

    $count = clampInt($_GET['count'] ?? 10, 1, 10, 10);
    $offset = clampInt($_GET['offset'] ?? 0, 0, 1000, 0);

    $payload = fetchVkWall($count, $offset);
    $posts = array_map('normalizeVkPost', $payload['items'] ?? []);
    $total = (int) ($payload['count'] ?? 0);
    $nextOffset = $offset + count($posts);

    jsonResponse([
        'ok' => true,
        'configured' => true,
        'data' => [
            'posts' => $posts,
            'next_offset' => $nextOffset,
            'has_more' => $nextOffset < $total && count($posts) > 0,
        ],
    ]);
} catch (Throwable $exception) {
    jsonResponse([
        'ok' => false,
        'error' => $exception->getMessage(),
    ], 500);
}

/**
 * @return array<string, mixed>
 */
function fetchVkWall(int $count, int $offset): array
{
    $cacheKey = sprintf('wall-%s-%d-%d.json', preg_replace('/[^0-9-]/', '', envValue('VK_OWNER_ID', '')), $count, $offset);
    $cachePath = sys_get_temp_dir() . '/parakot-lenta-' . $cacheKey;
    $ttl = clampInt(envValue('VK_CACHE_TTL', '600'), 30, 86400, 600);

    if (is_file($cachePath) && time() - filemtime($cachePath) < $ttl) {
        $cached = json_decode((string) file_get_contents($cachePath), true);

        if (is_array($cached)) {
            return $cached;
        }
    }

    $params = [
        'owner_id' => envValue('VK_OWNER_ID', ''),
        'count' => (string) $count,
        'offset' => (string) $offset,
        'filter' => 'owner',
        'access_token' => envValue('VK_ACCESS_TOKEN', ''),
        'v' => envValue('VK_API_VERSION', '5.199'),
    ];

    $url = 'https://api.vk.com/method/wall.get?' . http_build_query($params);
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 12,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\n",
        ],
    ]);
    $raw = file_get_contents($url, false, $context);

    if ($raw === false) {
        throw new RuntimeException('VK request failed.');
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        throw new RuntimeException('VK returned invalid JSON.');
    }

    if (isset($decoded['error'])) {
        $message = (string) ($decoded['error']['error_msg'] ?? 'VK API error.');
        throw new RuntimeException($message);
    }

    $response = $decoded['response'] ?? [];

    if (!is_array($response)) {
        throw new RuntimeException('VK response is incomplete.');
    }

    file_put_contents($cachePath, json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    return $response;
}

/**
 * @param array<string, mixed> $post
 * @return array<string, mixed>
 */
function normalizeVkPost(array $post): array
{
    $ownerId = (string) ($post['owner_id'] ?? '');
    $postId = (string) ($post['id'] ?? '');

    return [
        'id' => $postId,
        'date' => (int) ($post['date'] ?? 0),
        'text' => trim((string) ($post['text'] ?? '')),
        'url' => $ownerId !== '' && $postId !== '' ? "https://vk.com/wall{$ownerId}_{$postId}" : '',
        'media' => normalizeAttachments($post['attachments'] ?? []),
    ];
}

/**
 * @param mixed $attachments
 * @return array<int, array<string, string>>
 */
function normalizeAttachments($attachments): array
{
    if (!is_array($attachments)) {
        return [];
    }

    $media = [];

    foreach ($attachments as $attachment) {
        if (!is_array($attachment)) {
            continue;
        }

        $type = (string) ($attachment['type'] ?? '');

        if ($type === 'photo' && isset($attachment['photo']) && is_array($attachment['photo'])) {
            $photo = $attachment['photo'];
            $image = largestImage($photo['sizes'] ?? []);

            if ($image !== '') {
                $media[] = [
                    'type' => 'photo',
                    'preview' => $image,
                    'url' => $image,
                    'alt' => 'Фото из поста VK',
                ];
            }
        }

        if ($type === 'video' && isset($attachment['video']) && is_array($attachment['video'])) {
            $video = $attachment['video'];
            $preview = largestImage($video['image'] ?? []);
            $ownerId = (string) ($video['owner_id'] ?? '');
            $videoId = (string) ($video['id'] ?? '');

            $media[] = [
                'type' => 'video',
                'preview' => $preview,
                'url' => $ownerId !== '' && $videoId !== '' ? "https://vk.com/video{$ownerId}_{$videoId}" : '',
                'alt' => (string) ($video['title'] ?? 'Видео VK'),
            ];
        }
    }

    return $media;
}

/**
 * @param mixed $sizes
 */
function largestImage($sizes): string
{
    if (!is_array($sizes)) {
        return '';
    }

    $bestUrl = '';
    $bestArea = 0;

    foreach ($sizes as $size) {
        if (!is_array($size)) {
            continue;
        }

        $url = (string) ($size['url'] ?? '');
        $area = (int) ($size['width'] ?? 0) * (int) ($size['height'] ?? 0);

        if ($url !== '' && $area >= $bestArea) {
            $bestUrl = $url;
            $bestArea = $area;
        }
    }

    return $bestUrl;
}

function clampInt($value, int $min, int $max, int $fallback): int
{
    $parsed = filter_var($value, FILTER_VALIDATE_INT);

    if ($parsed === false) {
        return $fallback;
    }

    return min($max, max($min, (int) $parsed));
}

function isConfigured(): bool
{
    return envValue('VK_ACCESS_TOKEN', '') !== '' && envValue('VK_OWNER_ID', '') !== '';
}

function envValue(string $key, string $default = ''): string
{
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

function loadEnv(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $_ENV[trim($key)] = trim($value);
    }
}

/**
 * @param array<string, mixed> $payload
 */
function jsonResponse(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}

function noContent(): void
{
    http_response_code(204);
}

function sendCorsHeaders(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
