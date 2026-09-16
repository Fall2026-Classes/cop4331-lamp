<?php
//  DELETE     /api/contacts/deleteContactById?id=1 - delete the contact specified by ID

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
$userRole = getUserRole($db, $userId);

if ($method !== 'DELETE') {
    respond(405, ['error' => 'Method not allowed']);
}

// Get ID from URL parameters
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

if ($id <= 0){
    respond(400, ['error' => 'A valid id is required, example api/endpoint?id=1']);
}

if ($userRole === 'admin'){
    respond(401, ['error' => 'Unauthorized, Admins cannot manage contacts']);
}

// Store the params in the request URL
$id   = isset($_GET['id']) ? (int) $_GET['id'] : 0;

// If there is no first name send a 400 BAD REQUEST indicating first name is mandatory for this request
if (!$id) {
    respond(400, ['error' => 'Contact ID is required. Use the format ?id=']);
}

// Store and prepare the SQL command to run against the DB
$stmt = $db->prepare('DELETE FROM Contacts WHERE ID = :id AND UserID = :uid');

// Execute the SQL command against the DB, passing in the params from the request
$stmt->execute([':id' => $id, ':uid' => $userId]);

// Check if there is a contact matching that ID owned by that user to delete
if ($stmt->rowCount() === 0) {
    respond(404, ['error' => 'Contact not found']);
}

// Return a 200 to indicate a successful deletion
respond(200, ['message' => 'Contact deleted successfully']);