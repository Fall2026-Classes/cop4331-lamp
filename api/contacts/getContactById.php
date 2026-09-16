<?php
//  GET     /api/contacts/getContactById?id=1 - return the requested user by id

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

// Get ID from URL parameters
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

if ($id <= 0){
    respond(400, ['error' => 'A valid id is required, example api/endpoint?id=1']);
}

// If the user's role is admin, lookup using entire contacts table rather can scoped by UID
if ($userRole === 'admin'){
    $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE ID = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
} else {
    $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE ID = :id AND UserID = :uid LIMIT 1');
    $stmt->execute([':id' => $id, ':uid' => $userId]);
}

// Retreive the result of the SQL command's execution
$contact = $stmt->fetch();

// If the result is null, then return 404 NOT FOUND and conclude the request. 
if (!$contact) {
    respond(404, ['error' => 'Contact not found']);
}

// Otherwise respond with the contacts's data in JSON with a 200 OK
respond(200, $contact);