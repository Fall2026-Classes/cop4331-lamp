<?php
//  GET     /api/contacts/getContactByQuery?q=term - return the users matching the search term

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();
$userRole = getUserRole($db, $userId);

if ($method !== 'GET') {
    respond(405, ['error' => 'Method not allowed']);
}

// Get search term from URL parameters
$search = isset($_GET['q'])  ? trim($_GET['q'])  : (isset($_GET['search']) ? trim($_GET['search']) : null);

if ($search === null || $search === '') {
    respond(400, ['error' => 'A valid query is required, example api/endpoint?q=term']);
}

// String prep the search param for SQL
$like = '%' . $search . '%';

// If the user's role is admin, lookup using entire contacts table rather can scoped by UID
if ($userRole === 'admin'){
    $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE FirstName LIKE :q ORDER BY LastName, FirstName');
    $stmt->execute([':uid' => $userId, ':q' => $like]);
} else {
    $stmt = $db->prepare('SELECT ID as id, FirstName as firstName, LastName as lastName, `E-mailAddress` as email, PhoneNumber as phone FROM Contacts WHERE UserID = :uid AND FirstName LIKE :q ORDER BY LastName, FirstName');
    $stmt->execute([':uid' => $userId, ':q' => $like]);
}

// Retreive the result of the SQL command's execution
$rows = $stmt->fetchAll();

// If the result is empty, then return 200 OK and conclude the request but just return an empty array indicating no matches.
if (empty($rows)) {
    respond(200, ['contacts' => []]);
}

// Otherwise respond with all the returned contacts's data in JSON with a 200 OK
respond(200, ['contacts' => $rows]);