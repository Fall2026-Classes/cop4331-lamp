<?php
//  POST    /api/auth/login - login user

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/password.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}

$body = getRequestBody();

if (isset($body['login']) && isset($body['password'])) {
    $login    = clean($body['login']);
    // Don't clean() the password: stripping characters would change what gets hashed/compared
    $password = (string) $body['password'];

    if (!$login || $password === '') {
        respond(400, ['error' => 'Login and password are required']);
    }

    // Look the user up by login only; the password is checked against the stored hash below
    $stmt = $db->prepare('SELECT ID, firstName, lastName, Password, IsEnabled FROM Users WHERE Login = :login LIMIT 1');
    $stmt->execute([':login' => $login]);
    $user = $stmt->fetch();

    if (!$user || !verifyAndUpgradePassword($db, (int) $user['ID'], $password, $user['Password'])) {
        respond(401, [
            'id'        => 0,
            'firstName' => '',
            'lastName'  => '',
            'error'     => 'No Records Found'
        ]);
    }

    // Block disabled accounts from logging in
    if ((int) $user['IsEnabled'] !== 1) {
        respond(403, [
            'id'        => 0,
            'firstName' => '',
            'lastName'  => '',
            'error'     => 'This account has been disabled'
        ]);
    }

    respond(200, [
        'id'        => (int) $user['ID'],
        'firstName' => $user['firstName'],
        'lastName'  => $user['lastName'],
        'token'     => (string) $user['ID'],
        'error'     => ''
    ]);
}
