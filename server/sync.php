<?php
// gSpot sync: one JSON blob, one row. GET returns it, POST replaces it and bumps rev. Auth = X-Token header.
require __DIR__ . '/config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ALLOW_ORIGIN);
header('Access-Control-Allow-Headers: Content-Type, X-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
if (!hash_equals(SYNC_TOKEN, $_SERVER['HTTP_X_TOKEN'] ?? '')) { http_response_code(401); echo '{"error":"bad token"}'; exit; }
try {
  $db = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || !array_key_exists('data', $body)) { http_response_code(400); echo '{"error":"bad body"}'; exit; }
    $db->prepare('INSERT INTO gspot_state (id, rev, data, updated_at) VALUES (1, 1, ?, NOW())
                  ON DUPLICATE KEY UPDATE rev = rev + 1, data = VALUES(data), updated_at = NOW()')
       ->execute([json_encode($body['data'])]);
  }
  $row = $db->query('SELECT rev, data, updated_at FROM gspot_state WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
  echo $row ? json_encode(['rev' => (int)$row['rev'], 'updated_at' => $row['updated_at'], 'data' => json_decode($row['data'])])
            : '{"rev":0,"data":null}';
} catch (Exception $e) {
  http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
}
