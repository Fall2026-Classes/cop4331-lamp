<?php
//  POST    /api/auth/login - login user

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}

$body = getRequestBody();

if (isset($body['login']) && isset($body['password'])) {
    $login    = clean($body['login']);
    $password = clean($body['password']);

    if (!$login || !$password) {
        respond(400, ['error' => 'Login and password are required']);
    }

    $stmt = $db->prepare('SELECT ID, firstName, lastName FROM Users WHERE Login = :login AND Password = :pass LIMIT 1');
    $stmt->execute([':login' => $login, ':pass' => $password]);
    $user = $stmt->fetch();

    if ($user) {
        respond(200, [
            'id'        => (int) $user['ID'],
            'firstName' => $user['firstName'],
            'lastName'  => $user['lastName'],
            'token'     => (string) $user['ID'],
            'error'     => ''
        ]);
    } else {
        respond(401, [
            'id'        => 0,
            'firstName' => '',
            'lastName'  => '',
            'error'     => 'No Records Found'
        ]);
    }
}