<?php
// ============================================================
//  api/config/password.php — Password hashing helpers
//
//  Uses PHP's password_hash() (bcrypt). It generates a random salt for
//  every password and stores the salt inside the resulting hash string,
//  so no separate salt column is needed. Users.Password VARCHAR(255) fits.
// ============================================================

/**
 * Salt + hash a plaintext password for storage.
 *
 * @param string $plain
 * @return string
 */
function hashPassword($plain) {
    return password_hash($plain, PASSWORD_DEFAULT);
}

/**
 * True if the stored value is a password_hash() hash rather than legacy plaintext.
 *
 * @param string $stored
 * @return bool
 */
function isPasswordHash($stored) {
    // 'algo' is null (PHP 7.4+) or 0 (older PHP) when the string is not a known hash
    $algo = password_get_info((string) $stored)['algo'];
    return $algo !== null && $algo !== 0;
}

/**
 * Checks a login attempt against the stored password.
 *
 * Legacy plaintext passwords (seed data / accounts created before hashing)
 * are still accepted once, and are re-saved as a hash immediately, so the
 * database migrates itself as users log in.
 *
 * @param PDO    $db
 * @param int    $userId
 * @param string $plain   Password from the request
 * @param string $stored  Users.Password value
 * @return bool
 */
function verifyAndUpgradePassword(PDO $db, $userId, $plain, $stored) {
    $stored = (string) $stored;

    if (isPasswordHash($stored)) {
        if (!password_verify($plain, $stored)) {
            return false;
        }
        // Re-hash if PHP's default algorithm/cost has changed since it was stored
        if (password_needs_rehash($stored, PASSWORD_DEFAULT)) {
            savePasswordHash($db, $userId, $plain);
        }
        return true;
    }

    // Legacy plaintext: constant-time compare, then upgrade to a hash
    if ($stored !== '' && hash_equals($stored, $plain)) {
        savePasswordHash($db, $userId, $plain);
        return true;
    }

    return false;
}

/**
 * Hashes and stores a new password for a user.
 *
 * @param PDO    $db
 * @param int    $userId
 * @param string $plain
 */
function savePasswordHash(PDO $db, $userId, $plain) {
    $stmt = $db->prepare('UPDATE Users SET Password = :password WHERE ID = :id');
    $stmt->execute([':password' => hashPassword($plain), ':id' => $userId]);
}
