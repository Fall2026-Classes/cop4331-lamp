<?php
//  PUT    /api/auth/changePassword?id=1 - change password of users

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

if ($userRole !== 'admin'){
    respond(401, ['error' => 'Unauthorized, standard users cannot create admins']);
}

// Get ID from URL parameters
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($id <= 0){
    respond(400, ['error' => 'A valid id is required, example api/endpoint?id=1']);
}

// Perform initial check to see if entry at ID exists and is owned by the requesting user
$check = $db->prepare('SELECT ID FROM Users WHERE ID = :id LIMIT 1');
$check->execute([':id' => $id]);

// If no contacts return, exit with a 404 NOT FOUND 
if (!$check->fetch()) {
    respond(404, ['error' => 'User not found']);
}

// Store the params in the request body of the HTTP request, not the returned DB object
$body  = getRequestBody();

// Extract the vlues from the body
$password = $body['password'];

// Assume that any property can or cannot be changed so no need to check if values in request exist
// Store and prepare the SQL command to run against the DB
$stmt = $db->prepare('UPDATE Users SET Password = :password WHERE ID = :id');
// Execute the SQL command against the DB, passing in the params from the request
$stmt->execute([':password' => $password, ':id' => $id]);

// Return a 200 to indicate a successful update
respond(200, ['message' => 'User updated successfully']);