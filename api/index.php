<?php
// ============================================================
//  api/index.php — Unified Contacts Manager RESTful API
//
//  GET    /api/index.php?ping=1   — status ping health check
//  POST   /api/index.php (login)  — authenticate user
//  GET    /api/index.php          — list all contacts for user
//  GET    /api/index.php?q=term   — partial search contacts
//  GET    /api/index.php?id=1     — get single contacts by ID

//  POST   /api/index.php (color)  — create new color
//  PUT    /api/index.php?id=1     — update color by ID
//  DELETE /api/index.php?id=1     — delete color by ID
// ============================================================

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// 1. Unauthenticated Health Check (Ping)
if ($method === 'GET' && (isset($_GET['ping']) || (isset($_GET['action']) && $_GET['action'] === 'ping'))) {
    respond(200, ['status' => 'OK', 'timestamp' => time()]);
}

// 2. Unauthenticated Login (POST with login & password in body)
if ($method === 'POST') {
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
}

// 3. All other routes require an authenticated user
$userId = requireAuth();

switch ($method) {

    // ── GET: search, list, or single contact ──────────────────
    case 'GET':
        // Store the params in the request URL
        // If the URL is GET /api/index.php?id=1, $id == 1
        $id     = isset($_GET['id']) ? (int) $_GET['id'] : null;
        // If the URL is GET /api/index.php?search=mandy, $search == mandy
        $search = isset($_GET['q'])  ? trim($_GET['q'])  : (isset($_GET['search']) ? trim($_GET['search']) : null);
        // For both of the above vars, we check if the url contains either of those paramaters, and if either is not encluded, then that one is assigned null value

        // If ID is not null, meaning it is included in the URLs paramaters, then
        if ($id) {
            // Store and prepare the SQL command to run against the DB
            $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE ID = :id AND UserID = :uid LIMIT 1');
            // Execute the SQL command against the DB, passing in the params of :id from $id and :uid from $userId
            $stmt->execute([':id' => $id, ':uid' => $userId]);
            // Retreive the result of the SQL command's execution
            $contact = $stmt->fetch();
            // If the result is null, then return 404 NOT FOUND and conclude the request. 
            if (!$contact) {
                respond(404, ['error' => 'Contact not found']);
            }
            // Otherwise respond with the contacts's data in JSON with a 200 OK
            respond(200, $contact);
        }

        // Search contacts (partial match). If the search param does not equal empty string or null, then
        if ($search !== null && $search !== '') {
            // String prep the search param for SQL
            $like = '%' . $search . '%';
            // Store and prepare the SQL command to run against the DB
            $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE UserID = :uid AND FirstName LIKE :q ORDER BY LastName, FirstName');
            // Execute the SQL command against the DB, passing in the params of :uid from $userId and :q from $like
            $stmt->execute([':uid' => $userId, ':q' => $like]);
            // Retreive the result of the SQL command's execution
            $rows = $stmt->fetchAll();
            // If the result is empty, then return 200 OK and conclude the request but just return an empty array indicating no matches.
            if (empty($rows)) {
                respond(200, ['contacts' => []]);
            }
            // Otherwise respond with all the returned contacts's data in JSON with a 200 OK
            respond(200, ['contacts' => $rows]);
        }

        // List all contacts
        // Store and prepare the SQL command to run against the DB
        $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE UserID = :uid ORDER BY LastName, FirstName');
        // Execute the SQL command against the DB, passing in the params of :uid from $userId
        $stmt->execute([':uid' => $userId]);
        // Retreive the result of the SQL command's execution
        $rows = $stmt->fetchAll();
        // Respond with all the returned contacts's data in JSON with a 200 OK no matter how many there are
        respond(200, ['contacts' => $rows]);
        break;

    // ── POST: create contact ───────────────────────────────────
    case 'POST':
        $body  = getRequestBody();
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

        $stmt = $db->prepare('INSERT INTO Contacts (UserID, FirstName, LastName, `E-mailAddress`, PhoneNumber) VALUES (:uid, :firstname, :lastname, :email, :phone)');
        $stmt->execute([':uid' => $userId, ':firstname' => $firstName, ':lastname' => $lastName, ':email' => $email, ':phone' => $phone]);

        // Return a 201 to indicate a successful creation and return only the ID of the created contact
        respond(201, ['id' => (int) $db->lastInsertId()]);
        break;

    // ── PUT: update color ─────────────────────────────────────
    case 'PUT':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if (!$id) {
            respond(400, ['error' => 'Color ID is required — use ?id=']);
        }

        $check = $db->prepare('SELECT ID FROM Colors WHERE ID = :id AND UserID = :uid LIMIT 1');
        $check->execute([':id' => $id, ':uid' => $userId]);
        if (!$check->fetch()) {
            respond(404, ['error' => 'Color not found']);
        }

        $body  = getRequestBody();
        $color = clean($body['color'] ?? $body['name'] ?? '');
        if (!$color) {
            respond(400, ['error' => 'Color name is required']);
        }

        $stmt = $db->prepare('UPDATE Colors SET Name = :name WHERE ID = :id AND UserID = :uid');
        $stmt->execute([':name' => $color, ':id' => $id, ':uid' => $userId]);

        respond(200, ['message' => 'Color updated', 'error' => '']);
        break;

    // ── DELETE: delete color ──────────────────────────────────
    case 'DELETE':
        $id   = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $name = isset($_GET['name']) ? clean($_GET['name']) : '';

        if ($id > 0) {
            $stmt = $db->prepare('DELETE FROM Colors WHERE ID = :id AND UserID = :uid');
            $stmt->execute([':id' => $id, ':uid' => $userId]);
        } elseif ($name !== '') {
            $stmt = $db->prepare('DELETE FROM Colors WHERE Name = :name AND UserID = :uid LIMIT 1');
            $stmt->execute([':name' => $name, ':uid' => $userId]);
        } else {
            respond(400, ['error' => 'Color ID or Name is required — use ?id= or ?name=']);
        }

        if ($stmt->rowCount() === 0) {
            respond(404, ['error' => 'Color not found']);
        }

        respond(200, ['message' => 'Color deleted', 'error' => '']);
        break;

    default:
        respond(405, ['error' => 'Method not allowed']);
}
