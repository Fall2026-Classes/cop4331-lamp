<?php
//  PUT    /api/users/updateUserStatusById?id=1 - enable or disable a user (admin only)
//
//  Body (JSON):
//      { "isEnabled": 0 }      // 1 = enable, 0 = disable (true/false also accepted)

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/userStatus.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
requireEnabledUser($db, $userId);
$userRole = getUserRole($db, $userId);

if ($method !== 'PUT') {
    respond(405, ['error' => 'Method not allowed']);
}

if ($userRole !== 'admin') {
    respond(401, ['error' => 'Unauthorized, standard users cannot change user status']);
}

// Get the target user's ID from URL parameters
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($id <= 0) {
    respond(400, ['error' => 'A valid id is required, example api/endpoint?id=1']);
}

// Stop an admin from locking themselves out
if ($id === $userId) {
    respond(400, ['error' => 'You cannot change the status of your own account']);
}

// Read the requested value from the body: accepts 1/0, "1"/"0", true/false
$body  = getRequestBody();
$value = array_key_exists('isEnabled', $body) ? $body['isEnabled'] : null;
$bool  = $value === null ? null : filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

if ($bool === null) {
    respond(400, ['error' => 'A valid isEnabled value is required: {"isEnabled": 1} or {"isEnabled": 0}']);
}

$isEnabled = $bool ? 1 : 0;

// Make sure the target user exists
$check = $db->prepare('SELECT ID FROM Users WHERE ID = :id LIMIT 1');
$check->execute([':id' => $id]);

if (!$check->fetch()) {
    respond(404, ['error' => 'User not found']);
}

// Update the flag
$stmt = $db->prepare('UPDATE Users SET IsEnabled = :isEnabled WHERE ID = :id');
$stmt->execute([':isEnabled' => $isEnabled, ':id' => $id]);

respond(200, [
    'message'   => $isEnabled ? 'User enabled successfully' : 'User disabled successfully',
    'id'        => $id,
    'isEnabled' => $isEnabled
]);
