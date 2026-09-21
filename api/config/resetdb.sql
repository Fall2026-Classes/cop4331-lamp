-- ============================================================
--  resetdb.sql
--  Project: COP 4331 LAMP Stack Demo (Contacts Manager)
--  Path:    api/config/resetdb.sql
--
--  Drops and recreates ContactsAppDB, seeds sample data, and
--  creates the unprivileged application user.
--
--  Run as root:   mysql -u root -p < resetdb.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `ContactsAppDB`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ContactsAppDB`;

-- Drop children before parents (FK dependency)
DROP TABLE IF EXISTS `Contacts`;
DROP TABLE IF EXISTS `Users`;


-- ============================================================
--  Users
-- ============================================================
CREATE TABLE `Users` (
    `ID`          INT           NOT NULL AUTO_INCREMENT,
    `FirstName`   VARCHAR(50)   NOT NULL DEFAULT '',
    `LastName`    VARCHAR(50)   NOT NULL DEFAULT '',
    `Login`       VARCHAR(50)   NOT NULL,
    `Password`    VARCHAR(255)  NOT NULL DEFAULT '',
    `UserRole`    ENUM('user','admin') NOT NULL DEFAULT 'user',
    `DateCreated` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `DateUpdated` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`ID`),
    UNIQUE KEY `uq_users_login` (`Login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  Contacts
--  UserID is a foreign key to Users.ID.
--  Deleting a user deletes that user's contacts.
-- ============================================================
CREATE TABLE `Contacts` (
    `ID`             INT          NOT NULL AUTO_INCREMENT,
    `UserID`         INT          NOT NULL,
    `FirstName`      VARCHAR(50)  NOT NULL DEFAULT '',
    `LastName`       VARCHAR(50)  NOT NULL DEFAULT '',
    `E-mailAddress`  VARCHAR(100) NOT NULL DEFAULT '',
    `PhoneNumber`    VARCHAR(25)  NOT NULL DEFAULT '',
    `DateCreated`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `DateUpdated`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`ID`),
    KEY `idx_contacts_userid` (`UserID`),
    KEY `idx_contacts_lastname` (`LastName`),
    CONSTRAINT `fk_contacts_user`
        FOREIGN KEY (`UserID`) REFERENCES `Users` (`ID`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  Seed: Users
--  Passwords are plaintext for the Project 1 demo.
-- ============================================================
INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`, `UserRole`) VALUES
('Rick', 'Leinecker', 'RickL',  'COP4331', 'user'),
('Sam',  'Hill',      'SamH',   'Test',    'user'),
('Ada',  'Lovelace',  'AdaL',   'Analyt1cal', 'user'),
('Site', 'Admin',     'admin',  'Admin4331', 'admin');


-- ============================================================
--  Seed: Contacts
-- ============================================================
INSERT INTO `Contacts` (`UserID`, `FirstName`, `LastName`, `E-mailAddress`, `PhoneNumber`) VALUES
(1, 'Grace',   'Hopper',   'ghopper@navy.mil',        '407-555-0101'),
(1, 'Alan',    'Turing',   'aturing@bletchley.org',   '407-555-0102'),
(1, 'Katherine','Johnson', 'kjohnson@nasa.gov',       '321-555-0103'),
(1, 'Linus',   'Torvalds', 'linus@kernel.org',        '407-555-0104'),
(2, 'Margaret','Hamilton', 'mhamilton@mit.edu',       '617-555-0105'),
(2, 'Dennis',  'Ritchie',  'dmr@bell-labs.com',       '908-555-0106'),
(3, 'Charles', 'Babbage',  'cbabbage@analytical.uk',  '407-555-0107');


-- ============================================================
--  Application user (unprivileged)
--  Only CRUD on ContactsAppDB. No DDL, no access to other
--  databases, no GRANT option.
--  This password must match DB_PASSWORD in your .env file.
-- ============================================================
DROP USER IF EXISTS 'ContactsAppUser'@'localhost';
CREATE USER 'ContactsAppUser'@'localhost' IDENTIFIED BY 'WeLoveCOP4331!';
GRANT SELECT, INSERT, UPDATE, DELETE ON `ContactsAppDB`.* TO 'ContactsAppUser'@'localhost';

FLUSH PRIVILEGES;


-- ============================================================
--  Verification (what the TA will ask you to run)
-- ============================================================
SHOW TABLES;
DESCRIBE `Users`;
DESCRIBE `Contacts`;
SELECT * FROM `Users`;
SELECT * FROM `Contacts`;
