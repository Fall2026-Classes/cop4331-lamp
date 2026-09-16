<?php
//  GET     /api/contacts/getAllContacts - lists all contacts owned by the requesting user

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
$userRole = getUserRole($db, $userId);

if ($method !== 'GET') {
    respond(405, ['error' => 'Method not allowed']);
}

// If the user's role is admin, lookup using entire contacts table rather can scoped by UID
if ($userRole === 'admin'){
    $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts ORDER BY LastName, FirstName');
    $stmt->execute();
} else {
    $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE UserID = :uid ORDER BY LastName, FirstName');
    $stmt->execute([':uid' => $userId]);
}

// Retreive the result of the SQL command's execution
$rows = $stmt->fetchAll();

// Respond with all the returned contacts's data in JSON with a 200 OK no matter how many there are
respond(200, ['contacts' => $rows]);