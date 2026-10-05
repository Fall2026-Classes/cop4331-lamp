<?php
// ============================================================
//  api/config/userStatus.php — Enabled/disabled account helpers
//
//  Uses the Users.IsEnabled column (1 = enabled, 0 = disabled).
//  Include AFTER helpers.php so respond() is available:
//
//      require_once __DIR__ . '/../config/db.php';
//      require_once __DIR__ . '/../config/helpers.php';
//      require_once __DIR__ . '/../config/userStatus.php';
// ============================================================

require_once __DIR__ . '/helpers.php';

/**
 * Returns the user's IsEnabled value (1 or 0), or null if the user does not exist.
 *
 * @param PDO $db
 * @param int $userId
 * @return int|null
 */
function getUserIsEnabled(PDO $db, $userId) {
    $stmt = $db->prepare('SELECT IsEnabled FROM Users WHERE ID = :uid LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    $value = $stmt->fetchColumn();

    return $value === false ? null : (int) $value;
}

/**
 * True only if the user exists and IsEnabled = 1.
 *
 * @param PDO $db
 * @param int $userId
 * @return bool
 */
function isUserEnabled(PDO $db, $userId) {
    return getUserIsEnabled($db, $userId) === 1;
}

/**
 * Call right after requireAuth(). Stops the request when the caller
 * no longer exists (401) or has been disabled by an admin (403).
 *
 * @param PDO $db
 * @param int $userId  The ID returned by requireAuth()
 */
function requireEnabledUser(PDO $db, $userId) {
    $isEnabled = getUserIsEnabled($db, $userId);

    if ($isEnabled === null) {
        respond(401, ['error' => 'Unauthorized']);
    }

    if ($isEnabled !== 1) {
        respond(403, ['error' => 'Forbidden, this account has been disabled']);
    }
}
