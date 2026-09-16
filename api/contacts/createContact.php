<?php
//  POST     /api/contacts/createContact - creates a new contact owned by the requesting user

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
$userRole = getUserRole($db, $userId);

if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}

if ($userRole === 'admin'){
    respond(401, ['error' => 'Unauthorized, Admins cannot manage contacts']);
}

// Store the params in the request body
$body  = getRequestBody();

// Extract the vlues from the body
$firstName = clean($body['first_name'] ?? '');
$lastName = clean($body['last_name'] ?? '');
$email = clean($body['email'] ?? '');
$phone = clean($body['phone'] ?? '');

// If there is no first name send a 400 BAD REQUEST indicating first name is mandatory
if (!$firstName) {
    respond(400, ['error' => 'The first name of the contact is a required field']);
}
// If there is no phone number send a 400 BAD REQUEST indicating phone number is mandatory
if (!$phone) {
    respond(400, ['error' => 'The phone number of the contact is a required field']);
}

// Store and prepare the SQL command to run against the DB
$stmt = $db->prepare('INSERT INTO Contacts (UserID, FirstName, LastName, `E-mailAddress`, PhoneNumber) VALUES (:uid, :firstname, :lastname, :email, :phone)');

// Execute the SQL command against the DB, passing in the params from the request body
$stmt->execute([':uid' => $userId, ':firstname' => $firstName, ':lastname' => $lastName, ':email' => $email, ':phone' => $phone]);

// Return a 201 to indicate a successful creation and return only the ID of the created contact
respond(201, ['id' => (int) $db->lastInsertId()]);