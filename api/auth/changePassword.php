<?php
//  POST    /api/auth/changePassword - change password of users

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}
    
respond(200, ['error' => 'TODO']);