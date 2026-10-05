<?php
//  GET    /api/users/getAllUsers - list every user and their enabled status (admin only)

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/userStatus.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
requireEnabledUser($db, $userId);
$userRole = getUserRole($db, $userId);

if ($method !== 'GET') {
    respond(405, ['error' => 'Method not allowed']);
}

if ($userRole !== 'admin') {
    respond(401, ['error' => 'Unauthorized, standard users cannot view users']);
}

// Every user plus how many contacts they own. Password is never returned.
$stmt = $db->prepare(
    'SELECT u.ID AS id, u.FirstName AS firstName, u.LastName AS lastName, u.Login AS login,
            u.UserRole AS role, u.IsEnabled AS isEnabled,
            u.DateCreated AS dateCreated, u.DateUpdated AS dateUpdated,
            (SELECT COUNT(*) FROM Contacts c WHERE c.UserID = u.ID) AS contactCount
     FROM Users u
     ORDER BY u.LastName, u.FirstName'
);
$stmt->execute();
$rows = $stmt->fetchAll();

// Cast numeric fields so the frontend gets real numbers, and flag the caller's own row
// (the status endpoint refuses to change your own account, so the UI can lock that toggle).
foreach ($rows as &$row) {
    $row['id']           = (int) $row['id'];
    $row['isEnabled']    = (int) $row['isEnabled'];
    $row['contactCount'] = (int) $row['contactCount'];
    $row['isSelf']       = $row['id'] === $userId;
}
unset($row);

respond(200, ['users' => $rows]);
