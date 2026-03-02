-- ============================================================================
-- Phase 6: Profile Delete (Soft + Hard, GDPR) — Table + Stored Procedures
-- ============================================================================

-- 1. Deletion Certificate Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `partner_admin_deletion_certificate` (
  `certificate_id`        INT(11) NOT NULL AUTO_INCREMENT,
  `certificate_code`      VARCHAR(50) NOT NULL,
  `account_id`            INT(11) NOT NULL,
  `account_code`          VARCHAR(50) DEFAULT NULL,
  `profile_id`            INT(11) DEFAULT NULL,
  `partner_id`            INT(11) NOT NULL,
  `account_holder_name`   VARCHAR(200) DEFAULT NULL,
  `account_holder_email`  VARCHAR(255) DEFAULT NULL,
  `deletion_type`         ENUM('hard_delete','anonymize') NOT NULL,
  `deletion_reason_type`  VARCHAR(100) DEFAULT NULL,
  `deletion_reason_notes` TEXT DEFAULT NULL,
  `deleted_by`            VARCHAR(50) NOT NULL,
  `deleted_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tables_deleted`        TEXT DEFAULT NULL,
  `photo_blobs_deleted`   TEXT DEFAULT NULL,
  `data_categories`       TEXT DEFAULT NULL,
  `legal_basis`           VARCHAR(100) DEFAULT 'GDPR Art. 17 - Right to Erasure',
  `certificate_status`    ENUM('issued','revoked') DEFAULT 'issued',
  `created_at`            DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`certificate_id`),
  UNIQUE KEY `uk_certificate_code` (`certificate_code`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_partner_id` (`partner_id`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 2. SP: partner_admin_hard_delete_profile
-- ============================================================================
-- Cascading permanent delete of ALL profile + account + login data.
-- Creates a deletion certificate BEFORE deleting data.
-- Returns: certificate record + photo blob paths for Azure cleanup.
-- ============================================================================
DROP PROCEDURE IF EXISTS `partner_admin_hard_delete_profile`;

DELIMITER $$

CREATE PROCEDURE `partner_admin_hard_delete_profile`(
    IN p_account_id INT,
    IN p_partner_id INT,
    IN p_deleted_user VARCHAR(50),
    IN p_reason_type VARCHAR(100),
    IN p_reason_notes TEXT
)
BEGIN
    DECLARE v_profile_id INT DEFAULT NULL;
    DECLARE v_account_code VARCHAR(50) DEFAULT NULL;
    DECLARE v_holder_name VARCHAR(200) DEFAULT NULL;
    DECLARE v_holder_email VARCHAR(255) DEFAULT NULL;
    DECLARE v_cert_code VARCHAR(50);
    DECLARE v_cert_id INT;
    DECLARE v_tables_json TEXT;
    DECLARE v_photo_paths TEXT;
    DECLARE v_data_cats TEXT DEFAULT '';
    DECLARE v_reg_partner INT DEFAULT NULL;
    DECLARE v_account_exists INT DEFAULT 0;
    DECLARE v_cnt INT DEFAULT 0;

    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME DEFAULT NOW();

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        INSERT INTO partner_admin_error_log (error_code, error_message, context_user, source_name, partner_id, start_time)
        VALUES (CONCAT('PA_HDEL_900_', error_code), error_message, p_deleted_user, 'partner_admin_hard_delete_profile', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_HDEL_900_DB_ERROR' AS error_code, error_message,
               NULL AS certificate_id;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS certificate_id;
    END;

    -- ── Validation ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_account_exists FROM account WHERE account_id = p_account_id;
    IF v_account_exists = 0 THEN
        SET error_code = 'PA_HDEL_001_NOT_FOUND';
        SET error_message = 'Account not found';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found';
    END IF;

    SELECT registered_partner_id INTO v_reg_partner FROM account WHERE account_id = p_account_id;
    IF v_reg_partner != p_partner_id THEN
        SET error_code = 'PA_HDEL_002_UNAUTHORIZED';
        SET error_message = 'Account does not belong to this partner';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not belong to this partner';
    END IF;

    -- ── Capture data before deletion ────────────────────────────────────────
    SELECT account_code, CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')), email
    INTO v_account_code, v_holder_name, v_holder_email
    FROM account WHERE account_id = p_account_id;

    SELECT profile_id INTO v_profile_id
    FROM profile_personal WHERE account_id = p_account_id LIMIT 1;

    -- Collect photo blob paths (for Azure cleanup after SP returns)
    IF v_profile_id IS NOT NULL THEN
        SELECT GROUP_CONCAT(relative_path SEPARATOR '||') INTO v_photo_paths
        FROM profile_photo WHERE profile_id = v_profile_id AND relative_path IS NOT NULL;
    END IF;

    -- ── Count records per table (for certificate) ───────────────────────────
    SET v_tables_json = '{';

    IF v_profile_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_cnt FROM profile_favorites WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, '"profile_favorites":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_views WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_views":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_contacted WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_contacted":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_saved_for_later WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_saved_for_later":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_photo WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_photo":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_hobby_interest WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_hobby_interest":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_lifestyle WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_lifestyle":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_property WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_property":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_family_reference WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_family_reference":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_employment WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_employment":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_education WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_education":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_contact WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_contact":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_address WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_address":', v_cnt);

        SELECT COUNT(*) INTO v_cnt FROM profile_search_preference WHERE profile_id = v_profile_id;
        SET v_tables_json = CONCAT(v_tables_json, ',"profile_search_preference":', v_cnt);

        SET v_tables_json = CONCAT(v_tables_json, ',"profile_personal":1');
    END IF;

    SET v_tables_json = CONCAT(v_tables_json, ',"login":1,"account":1}');

    SET v_data_cats = 'personal, address, contact, education, employment, family, hobby, lifestyle, property, photos, search_preference, favorites, views, contacted, saved_for_later, login, account';

    -- ── Generate certificate code ───────────────────────────────────────────
    SET v_cert_code = CONCAT('GDPR-DEL-', YEAR(NOW()), '-', LPAD((SELECT COALESCE(MAX(certificate_id), 0) + 1 FROM partner_admin_deletion_certificate), 5, '0'));

    -- ── BEGIN TRANSACTION ───────────────────────────────────────────────────
    START TRANSACTION;

    -- Insert certificate FIRST (before data is gone)
    INSERT INTO partner_admin_deletion_certificate (
        certificate_code, account_id, account_code, profile_id, partner_id,
        account_holder_name, account_holder_email, deletion_type,
        deletion_reason_type, deletion_reason_notes, deleted_by, deleted_at,
        tables_deleted, photo_blobs_deleted, data_categories, legal_basis
    ) VALUES (
        v_cert_code, p_account_id, v_account_code, v_profile_id, p_partner_id,
        v_holder_name, v_holder_email, 'hard_delete',
        p_reason_type, p_reason_notes, p_deleted_user, NOW(),
        v_tables_json, v_photo_paths, v_data_cats, 'GDPR Art. 17 - Right to Erasure'
    );

    SET v_cert_id = LAST_INSERT_ID();

    -- ── Activity log ────────────────────────────────────────────────────────
    INSERT INTO activity_log (log_type, message, created_by, start_time, activity_type, activity_details)
    VALUES ('GDPR', CONCAT('Hard delete: account_id=', p_account_id, ', profile_id=', COALESCE(v_profile_id, 'NULL'), ', cert=', v_cert_code),
            p_deleted_user, start_time, 'HARD_DELETE', CONCAT('Reason: ', COALESCE(p_reason_type, ''), ' - ', COALESCE(p_reason_notes, '')));

    -- ── Delete from all tables (child → parent) ────────────────────────────
    IF v_profile_id IS NOT NULL THEN
        DELETE FROM profile_favorites WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        DELETE FROM profile_views WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        DELETE FROM profile_contacted WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        DELETE FROM profile_saved_for_later WHERE from_profile_id = v_profile_id OR to_profile_id = v_profile_id;
        DELETE FROM profile_photo WHERE profile_id = v_profile_id;
        DELETE FROM profile_hobby_interest WHERE profile_id = v_profile_id;
        DELETE FROM profile_lifestyle WHERE profile_id = v_profile_id;
        DELETE FROM profile_property WHERE profile_id = v_profile_id;
        DELETE FROM profile_family_reference WHERE profile_id = v_profile_id;
        DELETE FROM profile_employment WHERE profile_id = v_profile_id;
        DELETE FROM profile_education WHERE profile_id = v_profile_id;
        DELETE FROM profile_contact WHERE profile_id = v_profile_id;
        DELETE FROM profile_address WHERE profile_id = v_profile_id;
        DELETE FROM profile_search_preference WHERE profile_id = v_profile_id;
        DELETE FROM profile_personal WHERE profile_id = v_profile_id;
    END IF;

    DELETE FROM login WHERE account_id = p_account_id;
    DELETE FROM account WHERE account_id = p_account_id;

    COMMIT;

    -- ── Return certificate + photo paths ────────────────────────────────────
    SELECT 'success' AS status, NULL AS error_type, NULL AS error_code, NULL AS error_message,
           v_cert_id AS certificate_id, v_cert_code AS certificate_code,
           v_photo_paths AS photo_blob_paths;

END$$

DELIMITER ;


-- 3. SP: partner_admin_anonymize_profile
-- ============================================================================
-- GDPR pseudonymization: masks PII, keeps statistical data, issues certificate.
-- No records deleted — data is masked in place.
-- ============================================================================
DROP PROCEDURE IF EXISTS `partner_admin_anonymize_profile`;

DELIMITER $$

CREATE PROCEDURE `partner_admin_anonymize_profile`(
    IN p_account_id INT,
    IN p_partner_id INT,
    IN p_deleted_user VARCHAR(50),
    IN p_reason_type VARCHAR(100),
    IN p_reason_notes TEXT
)
BEGIN
    DECLARE v_profile_id INT DEFAULT NULL;
    DECLARE v_account_code VARCHAR(50) DEFAULT NULL;
    DECLARE v_holder_name VARCHAR(200) DEFAULT NULL;
    DECLARE v_holder_email VARCHAR(255) DEFAULT NULL;
    DECLARE v_cert_code VARCHAR(50);
    DECLARE v_cert_id INT;
    DECLARE v_reg_partner INT DEFAULT NULL;
    DECLARE v_account_exists INT DEFAULT 0;
    DECLARE v_photo_paths TEXT;

    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME DEFAULT NOW();

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        INSERT INTO partner_admin_error_log (error_code, error_message, context_user, source_name, partner_id, start_time)
        VALUES (CONCAT('PA_ANON_900_', error_code), error_message, p_deleted_user, 'partner_admin_anonymize_profile', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_ANON_900_DB_ERROR' AS error_code, error_message,
               NULL AS certificate_id;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS certificate_id;
    END;

    -- ── Validation ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_account_exists FROM account WHERE account_id = p_account_id;
    IF v_account_exists = 0 THEN
        SET error_code = 'PA_ANON_001_NOT_FOUND';
        SET error_message = 'Account not found';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found';
    END IF;

    SELECT registered_partner_id INTO v_reg_partner FROM account WHERE account_id = p_account_id;
    IF v_reg_partner != p_partner_id THEN
        SET error_code = 'PA_ANON_002_UNAUTHORIZED';
        SET error_message = 'Account does not belong to this partner';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not belong to this partner';
    END IF;

    -- ── Capture data before masking ─────────────────────────────────────────
    SELECT account_code, CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')), email
    INTO v_account_code, v_holder_name, v_holder_email
    FROM account WHERE account_id = p_account_id;

    SELECT profile_id INTO v_profile_id
    FROM profile_personal WHERE account_id = p_account_id LIMIT 1;

    -- Collect photo blob paths (for Azure cleanup)
    IF v_profile_id IS NOT NULL THEN
        SELECT GROUP_CONCAT(relative_path SEPARATOR '||') INTO v_photo_paths
        FROM profile_photo WHERE profile_id = v_profile_id AND relative_path IS NOT NULL;
    END IF;

    -- ── Generate certificate code ───────────────────────────────────────────
    SET v_cert_code = CONCAT('GDPR-ANO-', YEAR(NOW()), '-', LPAD((SELECT COALESCE(MAX(certificate_id), 0) + 1 FROM partner_admin_deletion_certificate), 5, '0'));

    -- ── BEGIN TRANSACTION ───────────────────────────────────────────────────
    START TRANSACTION;

    -- Insert certificate FIRST
    INSERT INTO partner_admin_deletion_certificate (
        certificate_code, account_id, account_code, profile_id, partner_id,
        account_holder_name, account_holder_email, deletion_type,
        deletion_reason_type, deletion_reason_notes, deleted_by, deleted_at,
        tables_deleted, photo_blobs_deleted, data_categories, legal_basis
    ) VALUES (
        v_cert_code, p_account_id, v_account_code, v_profile_id, p_partner_id,
        v_holder_name, v_holder_email, 'anonymize',
        p_reason_type, p_reason_notes, p_deleted_user, NOW(),
        '{"masked":"profile_personal, account"}', v_photo_paths,
        'personal (PII masked), account (PII masked), photos (blobs deleted)',
        'GDPR Art. 17 - Right to Erasure (Pseudonymization)'
    );

    SET v_cert_id = LAST_INSERT_ID();

    -- ── Mask PII in profile_personal ────────────────────────────────────────
    IF v_profile_id IS NOT NULL THEN
        UPDATE profile_personal SET
            first_name = '[REDACTED]',
            last_name = '[REDACTED]',
            middle_name = NULL,
            email_id = NULL,
            phone_mobile = NULL,
            phone_home = NULL,
            phone_emergency = NULL,
            whatsapp_number = NULL,
            linkedin = NULL,
            facebook = NULL,
            instagram = NULL,
            short_summary = NULL,
            is_active = 0,
            modified_date = NOW(),
            modified_user = p_deleted_user
        WHERE profile_id = v_profile_id;

        -- Delete photo records + blobs will be cleaned by API
        DELETE FROM profile_photo WHERE profile_id = v_profile_id;
    END IF;

    -- ── Mask PII in account ─────────────────────────────────────────────────
    UPDATE account SET
        first_name = '[REDACTED]',
        last_name = '[REDACTED]',
        middle_name = NULL,
        email = NULL,
        primary_phone = NULL,
        is_active = 0,
        is_deleted = 1,
        deleted_date = NOW(),
        deleted_user = p_deleted_user,
        deleted_reason = CONCAT('Anonymized: ', COALESCE(p_reason_type, '')),
        modified_date = NOW(),
        modified_user = p_deleted_user
    WHERE account_id = p_account_id;

    -- ── Deactivate login ────────────────────────────────────────────────────
    UPDATE login SET
        is_active = 0,
        modified_date = NOW(),
        modified_user = p_deleted_user
    WHERE account_id = p_account_id;

    -- ── Activity log ────────────────────────────────────────────────────────
    INSERT INTO activity_log (log_type, message, created_by, start_time, activity_type, activity_details)
    VALUES ('GDPR', CONCAT('Anonymize: account_id=', p_account_id, ', profile_id=', COALESCE(v_profile_id, 'NULL'), ', cert=', v_cert_code),
            p_deleted_user, start_time, 'ANONYMIZE', CONCAT('Reason: ', COALESCE(p_reason_type, ''), ' - ', COALESCE(p_reason_notes, '')));

    COMMIT;

    -- ── Return certificate + photo paths ────────────────────────────────────
    SELECT 'success' AS status, NULL AS error_type, NULL AS error_code, NULL AS error_message,
           v_cert_id AS certificate_id, v_cert_code AS certificate_code,
           v_photo_paths AS photo_blob_paths;

END$$

DELIMITER ;


-- 4. SP: partner_admin_restore_account
-- ============================================================================
-- Reverses a soft delete. Reactivates account + login + profile.
-- ============================================================================
DROP PROCEDURE IF EXISTS `partner_admin_restore_account`;

DELIMITER $$

CREATE PROCEDURE `partner_admin_restore_account`(
    IN p_account_id INT,
    IN p_partner_id INT,
    IN p_restored_user VARCHAR(50)
)
BEGIN
    DECLARE v_profile_id INT DEFAULT NULL;
    DECLARE v_reg_partner INT DEFAULT NULL;
    DECLARE v_is_deleted INT DEFAULT 0;
    DECLARE v_account_exists INT DEFAULT 0;

    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME DEFAULT NOW();

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_REST_900_DB_ERROR' AS error_code, error_message,
               NULL AS account_id;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS account_id;
    END;

    -- ── Validation ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_account_exists FROM account WHERE account_id = p_account_id;
    IF v_account_exists = 0 THEN
        SET error_code = 'PA_REST_001_NOT_FOUND';
        SET error_message = 'Account not found';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found';
    END IF;

    SELECT registered_partner_id, COALESCE(is_deleted, 0) INTO v_reg_partner, v_is_deleted
    FROM account WHERE account_id = p_account_id;

    IF v_reg_partner != p_partner_id THEN
        SET error_code = 'PA_REST_002_UNAUTHORIZED';
        SET error_message = 'Account does not belong to this partner';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not belong to this partner';
    END IF;

    IF v_is_deleted = 0 THEN
        SET error_code = 'PA_REST_003_NOT_DELETED';
        SET error_message = 'Account is not deleted — cannot restore';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is not deleted';
    END IF;

    SELECT profile_id INTO v_profile_id
    FROM profile_personal WHERE account_id = p_account_id LIMIT 1;

    -- ── BEGIN TRANSACTION ───────────────────────────────────────────────────
    START TRANSACTION;

    UPDATE account SET
        is_deleted = 0,
        is_active = 1,
        deleted_date = NULL,
        deleted_user = NULL,
        deleted_reason = NULL,
        modified_date = NOW(),
        modified_user = p_restored_user
    WHERE account_id = p_account_id;

    UPDATE login SET
        is_active = 1,
        modified_date = NOW(),
        modified_user = p_restored_user
    WHERE account_id = p_account_id;

    IF v_profile_id IS NOT NULL THEN
        UPDATE profile_personal SET
            is_active = 1,
            modified_date = NOW(),
            modified_user = p_restored_user
        WHERE profile_id = v_profile_id;
    END IF;

    -- ── Activity log ────────────────────────────────────────────────────────
    INSERT INTO activity_log (log_type, message, created_by, start_time, activity_type, activity_details)
    VALUES ('ACCOUNT', CONCAT('Restore: account_id=', p_account_id, ', profile_id=', COALESCE(v_profile_id, 'NULL')),
            p_restored_user, start_time, 'RESTORE', 'Account restored from soft-delete');

    COMMIT;

    SELECT 'success' AS status, NULL AS error_type, NULL AS error_code, NULL AS error_message,
           p_account_id AS account_id;

END$$

DELIMITER ;
