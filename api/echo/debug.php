<?php
//  GET    /api/echo/debug - status health check

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    respond(405, ['error' => 'Method not allowed']);
}

respond(200, ['status' => 'OK', 'timestamp' => time()]);