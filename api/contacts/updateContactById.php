<?php
//  PUT     /api/contacts/updateContactById?id=1 - update the contact specified by ID

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
$userRole = getUserRole($db, $userId);

if ($method !== 'PUT') {
    respond(405, ['error' => 'Method not allowed']);
}

// Get ID from URL parameters
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($id <= 0){
    respond(400, ['error' => 'A valid id is required, example api/endpoint?id=1']);
}

if ($userRole === 'admin'){
    respond(401, ['error' => 'Unauthorized, Admins cannot manage contacts']);
}

// Perform initial check to see if entry at ID exists and is owned by the requesting user
$check = $db->prepare('SELECT ID FROM Contacts WHERE ID = :id AND UserID = :uid LIMIT 1');
$check->execute([':id' => $id, ':uid' => $userId]);

// If no contacts return, exit with a 404 NOT FOUND 
if (!$check->fetch()) {
    respond(404, ['error' => 'Contact not found']);
}

// Store the params in the request body of the HTTP request, not the returned DB object
$body  = getRequestBody();

// Extract the vlues from the body
$firstName = clean($body['first_name'] ?? '');
$lastName = clean($body['last_name'] ?? '');
$email = clean($body['email'] ?? '');
$phone = clean($body['phone'] ?? '');

// Assume that any property can or cannot be changed so no need to check if values in request exist
// Store and prepare the SQL command to run against the DB
$stmt = $db->prepare('UPDATE Contacts SET FirstName = :firstname, LastName = :lastname, `E-mailAddress` = :email, PhoneNumber = :phone WHERE ID = :id AND UserID = :uid');
// Execute the SQL command against the DB, passing in the params from the request
$stmt->execute([':firstname' => $firstName, ':lastname' => $lastName, ':email' => $email, ':phone' => $phone, ':id' => $id, ':uid' => $userId]);

// Return a 200 to indicate a successful update
respond(200, ['message' => 'Contact updated successfully']);