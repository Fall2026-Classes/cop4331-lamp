<?php
//  POST    /api/auth/register - register user

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}

$body = getRequestBody();

if (isset($body['username']) && isset($body['password'])) {
    $username    = clean($body['username']);
    $password = $body['password'];
    $firstName = clean($body['first_name'] ?? '');
    $lastName = clean($body['last_name'] ?? '');
    $userRole = clean($body['user_role'] ?? 'user');

    if (!$username || !$password) {
        respond(400, ['error' => 'Username and password are required']);
    }

    // Check if username exists already
    $stmt = $db->prepare('SELECT 1 FROM Users WHERE Login = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if($user){
        respond(400, ['error' => 'User already exists with that username']);
    }

    $dateCreated = date('Y-m-d H:i:s');
    $dateUpdated = date('Y-m-d H:i:s');

    $stmt = $db->prepare('INSERT INTO Users (FirstName, LastName, Login, Password, DateCreated, DateUpdated, UserRole) VALUES (:firstname, :lastname, :login, :password, :datecreated, :dateupdated, :userrole)');
    $stmt->execute([':firstname' => $firstName, ':lastname' => $lastName, ':login' => $username, ':password' => $password, ':datecreated' => $dateCreated, ':dateupdated' => $dateUpdated, ':userrole' => $userRole]);

    respond(201, ['message' => 'User created successfully']);
}