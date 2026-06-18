<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

const OPTIMIZE_LOGO_MAX_WIDTH = 640;
const OPTIMIZE_SECTION_MAX_WIDTH = 2200;
const OPTIMIZE_CARD_MAX_WIDTH = 1600;
const OPTIMIZE_WEBP_QUALITY = 82;

$apply = in_array('--apply', $argv, true);
$cleanupUnused = in_array('--cleanup-unused', $argv, true);
$connection = Database::connection();
$references = collectUploadReferences($connection);
$optimizedByUrl = [];
$changed = [];
$skipped = [];

foreach ($references as $reference) {
    $url = $reference['url'];

    if (isset($optimizedByUrl[$url])) {
        $newUrl = $optimizedByUrl[$url];
    } else {
        $result = optimizeUploadUrl($url, (int) $reference['max_width'], $apply);

        if ($result['status'] !== 'changed') {
            $skipped[] = $result + ['source' => $reference['source']];
            continue;
        }

        $newUrl = $result['new_url'];
        $optimizedByUrl[$url] = $newUrl;
        $changed[] = $result + ['source' => $reference['source']];
    }

    if ($apply) {
        applyReferenceUpdate($connection, $reference, $newUrl);
    }
}

if ($apply) {
    foreach ($optimizedByUrl as $oldUrl => $newUrl) {
        deleteOldUploadIfUnused($connection, $oldUrl);
    }
}

$cleanup = [];
if ($cleanupUnused) {
    $cleanup = cleanupUnusedUploads($connection, $apply);
}

echo ($apply ? 'Applied' : 'Dry run') . " upload optimization\n";
echo 'Changed: ' . count($changed) . "\n";
echo 'Skipped: ' . count($skipped) . "\n";
echo 'Unused cleanup: ' . count($cleanup) . "\n";

foreach ($changed as $item) {
    echo sprintf(
        "CHANGED %s %s -> %s (%s -> %s bytes)\n",
        $item['source'],
        $item['url'],
        $item['new_url'],
        $item['old_size'],
        $item['new_size']
    );
}

foreach ($skipped as $item) {
    echo sprintf(
        "SKIPPED %s %s (%s)\n",
        $item['source'],
        $item['url'],
        $item['reason']
    );
}

foreach ($cleanup as $item) {
    echo sprintf(
        "%s unused %s\n",
        $apply ? 'DELETED' : 'WOULD DELETE',
        $item
    );
}

function collectUploadReferences(PDO $connection): array
{
    $references = [];

    $settings = $connection->query('SELECT id, logo_url, hero_background FROM site_settings')->fetchAll();
    foreach ($settings as $row) {
        addReference($references, 'site_settings', (int) $row['id'], 'logo_url', (string) ($row['logo_url'] ?? ''), OPTIMIZE_LOGO_MAX_WIDTH);
        addReference($references, 'site_settings', (int) $row['id'], 'hero_background', (string) ($row['hero_background'] ?? ''), OPTIMIZE_SECTION_MAX_WIDTH);
    }

    $sections = $connection->query('SELECT id, image_path, meta_json FROM sections')->fetchAll();
    foreach ($sections as $row) {
        addReference($references, 'sections', (int) $row['id'], 'image_path', (string) ($row['image_path'] ?? ''), OPTIMIZE_SECTION_MAX_WIDTH);

        foreach (uploadUrlsFromText((string) ($row['meta_json'] ?? '')) as $url) {
            addReference($references, 'sections', (int) $row['id'], 'meta_json', $url, OPTIMIZE_SECTION_MAX_WIDTH);
        }
    }

    $items = $connection->query('SELECT id, image_path FROM section_items')->fetchAll();
    foreach ($items as $row) {
        addReference($references, 'section_items', (int) $row['id'], 'image_path', (string) ($row['image_path'] ?? ''), OPTIMIZE_CARD_MAX_WIDTH);
    }

    return $references;
}

function addReference(array &$references, string $table, int $id, string $column, string $url, int $maxWidth): void
{
    if ($url === '' || !isUploadUrl($url)) {
        return;
    }

    $references[] = [
        'source' => sprintf('%s.%s#%d', $table, $column, $id),
        'table' => $table,
        'id' => $id,
        'column' => $column,
        'url' => $url,
        'max_width' => $maxWidth,
    ];
}

function uploadUrlsFromText(string $value): array
{
    preg_match_all('#https?://[^"\']+/uploads/[A-Za-z0-9._-]+|/uploads/[A-Za-z0-9._-]+#', $value, $matches);

    return array_values(array_unique($matches[0] ?? []));
}

function optimizeUploadUrl(string $url, int $maxWidth, bool $apply): array
{
    $path = localUploadPath($url);

    if ($path === null || !is_file($path)) {
        return ['status' => 'skipped', 'url' => $url, 'reason' => 'file-not-found'];
    }

    $mimeType = mime_content_type($path) ?: '';
    if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        return ['status' => 'skipped', 'url' => $url, 'reason' => 'unsupported-mime'];
    }

    $size = filesize($path) ?: 0;
    $dimensions = getimagesize($path);
    $width = is_array($dimensions) ? (int) ($dimensions[0] ?? 0) : 0;

    if ($mimeType === 'image/webp' && $width > 0 && $width <= $maxWidth && $size <= 750 * 1024) {
        return ['status' => 'skipped', 'url' => $url, 'reason' => 'already-optimized'];
    }

    $newPath = preg_replace('/\.[A-Za-z0-9]+$/', '', $path) . '-optimized.webp';
    if (!is_string($newPath) || $newPath === $path) {
        return ['status' => 'skipped', 'url' => $url, 'reason' => 'bad-target-path'];
    }

    if ($apply && !compressImageToWebp($path, $mimeType, $newPath, $maxWidth)) {
        return ['status' => 'skipped', 'url' => $url, 'reason' => 'compression-failed'];
    }

    $newSize = $apply && is_file($newPath) ? (filesize($newPath) ?: 0) : estimateWebpSize($size);

    return [
        'status' => 'changed',
        'url' => $url,
        'new_url' => uploadUrlForPath($url, $newPath),
        'old_size' => $size,
        'new_size' => $newSize,
    ];
}

function compressImageToWebp(string $sourcePath, string $mimeType, string $destinationPath, int $maxWidth): bool
{
    $source = null;

    if ($mimeType === 'image/jpeg') {
        $source = imagecreatefromjpeg($sourcePath) ?: null;
    } elseif ($mimeType === 'image/png') {
        $source = imagecreatefrompng($sourcePath) ?: null;
    } elseif ($mimeType === 'image/webp') {
        $source = imagecreatefromwebp($sourcePath) ?: null;
    }

    if ($source === null) {
        return false;
    }

    $source = orientJpegImage($source, $sourcePath, $mimeType);
    $width = imagesx($source);
    $height = imagesy($source);
    $targetWidth = min($width, $maxWidth);
    $targetHeight = (int) round($height * ($targetWidth / $width));

    if ($targetWidth === $width) {
        $target = $source;
    } else {
        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 255, 255, 255, 127);
        imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $transparent);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
    }

    $saved = imagewebp($target, $destinationPath, OPTIMIZE_WEBP_QUALITY);

    if ($target !== $source) {
        imagedestroy($target);
    }
    imagedestroy($source);

    if ($saved) {
        @chmod($destinationPath, 0644);
    }

    return $saved && is_file($destinationPath);
}

function orientJpegImage($image, string $sourcePath, string $mimeType)
{
    if ($mimeType !== 'image/jpeg' || !function_exists('exif_read_data')) {
        return $image;
    }

    $exif = @exif_read_data($sourcePath);
    $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
    $angle = 0;

    if ($orientation === 3) {
        $angle = 180;
    } elseif ($orientation === 6) {
        $angle = 270;
    } elseif ($orientation === 8) {
        $angle = 90;
    }

    if ($angle === 0) {
        return $image;
    }

    $rotated = imagerotate($image, $angle, 0);
    if ($rotated === false) {
        return $image;
    }

    imagedestroy($image);

    return $rotated;
}

function applyReferenceUpdate(PDO $connection, array $reference, string $newUrl): void
{
    if ($reference['column'] === 'meta_json') {
        $statement = $connection->prepare('UPDATE sections SET meta_json = REPLACE(meta_json, :old_url, :new_url) WHERE id = :id');
        $statement->execute([
            ':id' => $reference['id'],
            ':old_url' => $reference['url'],
            ':new_url' => $newUrl,
        ]);
        return;
    }

    $allowed = [
        'site_settings.logo_url',
        'site_settings.hero_background',
        'sections.image_path',
        'section_items.image_path',
    ];
    $key = $reference['table'] . '.' . $reference['column'];

    if (!in_array($key, $allowed, true)) {
        throw new RuntimeException('Unexpected reference target: ' . $key);
    }

    $sql = sprintf('UPDATE %s SET %s = :new_url WHERE id = :id', $reference['table'], $reference['column']);
    $statement = $connection->prepare($sql);
    $statement->execute([
        ':id' => $reference['id'],
        ':new_url' => $newUrl,
    ]);
}

function deleteOldUploadIfUnused(PDO $connection, string $url): void
{
    $queries = [
        [
            'SELECT COUNT(*) FROM site_settings WHERE logo_url = :logo_url OR hero_background = :hero_background',
            [
                ':logo_url' => $url,
                ':hero_background' => $url,
            ],
        ],
        ['SELECT COUNT(*) FROM sections WHERE image_path = :url OR meta_json LIKE :like_url', [':url' => $url, ':like_url' => '%' . $url . '%']],
        ['SELECT COUNT(*) FROM section_items WHERE image_path = :url', [':url' => $url]],
    ];

    foreach ($queries as [$sql, $params]) {
        $statement = $connection->prepare($sql);
        $statement->execute($params);

        if ((int) $statement->fetchColumn() > 0) {
            return;
        }
    }

    $path = localUploadPath($url);
    if ($path !== null && is_file($path)) {
        @unlink($path);
    }
}

function cleanupUnusedUploads(PDO $connection, bool $apply): array
{
    $root = dirname(__DIR__, 2) . '/uploads';

    if (!is_dir($root)) {
        return [];
    }

    $referenced = referencedUploadFilenames($connection);
    $deleted = [];
    $files = glob($root . '/*');

    if ($files === false) {
        return [];
    }

    foreach ($files as $path) {
        if (!is_file($path)) {
            continue;
        }

        $filename = basename($path);

        if (isset($referenced[$filename])) {
            continue;
        }

        $deleted[] = $path;

        if ($apply) {
            @unlink($path);
        }
    }

    return $deleted;
}

function referencedUploadFilenames(PDO $connection): array
{
    $filenames = [];

    foreach (collectUploadReferences($connection) as $reference) {
        $path = parse_url($reference['url'], PHP_URL_PATH);
        $path = is_string($path) ? $path : $reference['url'];
        $filenames[basename($path)] = true;
    }

    return $filenames;
}

function localUploadPath(string $url): ?string
{
    $path = parse_url($url, PHP_URL_PATH);
    $path = is_string($path) ? $path : $url;

    if (!preg_match('#^/uploads/[A-Za-z0-9._-]+$#', $path)) {
        return null;
    }

    return dirname(__DIR__, 2) . $path;
}

function uploadUrlForPath(string $oldUrl, string $path): string
{
    $filename = basename($path);
    $oldPath = parse_url($oldUrl, PHP_URL_PATH);

    if (is_string($oldPath) && strpos($oldUrl, 'http') === 0) {
        return preg_replace('#/uploads/[^/]+$#', '/uploads/' . $filename, $oldUrl) ?? $oldUrl;
    }

    return '/uploads/' . $filename;
}

function isUploadUrl(string $url): bool
{
    $path = parse_url($url, PHP_URL_PATH);
    $path = is_string($path) ? $path : $url;

    return preg_match('#^/uploads/[A-Za-z0-9._-]+$#', $path) === 1;
}

function estimateWebpSize(int $size): int
{
    return (int) round($size * 0.35);
}
