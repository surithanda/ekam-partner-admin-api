-- ============================================================================
-- Partner Admin — Admin User Management Stored Procedures (6 SPs)
-- List, get by ID, create, update, toggle status, reset password
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_list_users
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_list_users`$$
CREATE PROCEDURE `partner_admin_list_users`(
    IN p_partner_id INT, IN p_page INT, IN p_limit INT, IN p_search VARCHAR(255)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE v_offset INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_USLI_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_list_users', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_USLI_900_DB_ERROR' AS error_code, error_message;
    END;

    SET v_offset = (p_page - 1) * p_limit;

    SELECT COUNT(*) as total
    FROM partner_admin_users
    WHERE partner_id = p_partner_id
      AND (p_search IS NULL OR p_search = '' OR
           username LIKE CONCAT('%', p_search, '%')
           OR email LIKE CONCAT('%', p_search, '%')
           OR first_name LIKE CONCAT('%', p_search, '%')
           OR last_name LIKE CONCAT('%', p_search, '%'));

    SELECT partner_admin_id, partner_id, username, email, first_name, last_name,
           role, is_active, last_login, created_at, updated_at
    FROM partner_admin_users
    WHERE partner_id = p_partner_id
      AND (p_search IS NULL OR p_search = '' OR
           username LIKE CONCAT('%', p_search, '%')
           OR email LIKE CONCAT('%', p_search, '%')
           OR first_name LIKE CONCAT('%', p_search, '%')
           OR last_name LIKE CONCAT('%', p_search, '%'))
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_partner_user_by_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_partner_user_by_id`$$
CREATE PROCEDURE `partner_admin_get_partner_user_by_id`(
  IN p_partner_admin_id INT,
  IN p_partner_id INT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_USGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_partner_user_by_id', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_USGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT partner_admin_id, partner_id, username, email, first_name, last_name,
           role, is_active, last_login, created_at, updated_at
    FROM partner_admin_users
    WHERE partner_admin_id = p_partner_admin_id AND partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_create_user
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_create_user`$$
CREATE PROCEDURE `partner_admin_create_user`(
  IN p_partner_id INT,
  IN p_username VARCHAR(255),
  IN p_password_hash VARCHAR(255),
  IN p_email VARCHAR(255),
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_role VARCHAR(50)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE new_user_id INT;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error(CONCAT('PA_USCR_900_DB_ERROR:', error_code), error_code, error_message, p_username, 'partner_admin_create_user', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_USCR_900_DB_ERROR' AS error_code, error_message,
               NULL AS insertId;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        CALL partner_admin_log_error(error_code, NULL, error_message, p_username, 'partner_admin_create_user', p_partner_id, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS insertId;
    END;

    SET start_time = NOW();
    START TRANSACTION;

    IF p_username IS NULL OR p_username = '' THEN
        SET error_code = 'PA_USCR_001_MISSING_USERNAME';
        SET error_message = 'Username is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username is required';
    END IF;

    IF p_password_hash IS NULL OR p_password_hash = '' THEN
        SET error_code = 'PA_USCR_002_MISSING_PASSWORD';
        SET error_message = 'Password is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Password is required';
    END IF;

    IF p_email IS NULL OR p_email = '' THEN
        SET error_code = 'PA_USCR_003_MISSING_EMAIL';
        SET error_message = 'Email is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email is required';
    END IF;

    IF p_first_name IS NULL OR p_first_name = '' OR p_last_name IS NULL OR p_last_name = '' THEN
        SET error_code = 'PA_USCR_004_MISSING_NAME';
        SET error_message = 'First and last name are required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'First and last name are required';
    END IF;

    IF p_role IS NULL OR p_role = '' THEN
        SET error_code = 'PA_USCR_005_MISSING_ROLE';
        SET error_message = 'Role is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role is required';
    END IF;

    IF p_role NOT IN ('account-admin', 'support-admin') THEN
        SET error_code = 'PA_USCR_200_INVALID_ROLE';
        SET error_message = 'Role must be account-admin or support-admin';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be account-admin or support-admin';
    END IF;

    IF EXISTS (SELECT 1 FROM partner_admin_users WHERE partner_id = p_partner_id AND username = p_username) THEN
        SET error_code = 'PA_USCR_400_DUPLICATE_USERNAME';
        SET error_message = 'Username already exists for this partner';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username already exists for this partner';
    END IF;

    IF EXISTS (SELECT 1 FROM partner_admin_users WHERE partner_id = p_partner_id AND email = p_email) THEN
        SET error_code = 'PA_USCR_401_DUPLICATE_EMAIL';
        SET error_message = 'Email already exists for this partner';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already exists for this partner';
    END IF;

    INSERT INTO partner_admin_users (partner_id, username, password_hash, email, first_name, last_name, role, is_active)
    VALUES (p_partner_id, p_username, p_password_hash, p_email, p_first_name, p_last_name, p_role, 1);

    SET new_user_id = LAST_INSERT_ID();
    COMMIT;

    CALL partner_admin_log_activity('CREATE', CONCAT('Admin user created: ', p_username), p_username, 'partner_admin_create_user', CONCAT('User ID: ', new_user_id), p_partner_id, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           new_user_id AS insertId;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_update_user
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_update_user`$$
CREATE PROCEDURE `partner_admin_update_user`(
  IN p_partner_admin_id INT,
  IN p_partner_id INT,
  IN p_email VARCHAR(255),
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_role VARCHAR(50)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE affected_rows INT DEFAULT 0;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_USUP_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_update_user', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_USUP_900_DB_ERROR' AS error_code, error_message,
               0 AS affected;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        CALL partner_admin_log_error(error_code, NULL, error_message, NULL, 'partner_admin_update_user', p_partner_id, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               0 AS affected;
    END;

    SET start_time = NOW();

    IF p_partner_admin_id IS NULL THEN
        SET error_code = 'PA_USUP_001_MISSING_ID';
        SET error_message = 'User ID is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User ID is required';
    END IF;

    IF p_role IS NOT NULL AND p_role != '' AND p_role NOT IN ('account-admin', 'support-admin') THEN
        SET error_code = 'PA_USUP_200_INVALID_ROLE';
        SET error_message = 'Invalid role for update';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid role for update';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM partner_admin_users WHERE partner_admin_id = p_partner_admin_id AND partner_id = p_partner_id) THEN
        SET error_code = 'PA_USUP_100_NOT_FOUND';
        SET error_message = 'Admin user not found';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admin user not found';
    END IF;

    UPDATE partner_admin_users
    SET email = COALESCE(p_email, email),
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        role = COALESCE(p_role, role)
    WHERE partner_admin_id = p_partner_admin_id AND partner_id = p_partner_id;

    SET affected_rows = ROW_COUNT();

    CALL partner_admin_log_activity('UPDATE', CONCAT('Admin user updated: ', p_partner_admin_id), NULL, 'partner_admin_update_user', NULL, p_partner_id, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           affected_rows AS affected;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_toggle_user_status
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_toggle_user_status`$$
CREATE PROCEDURE `partner_admin_toggle_user_status`(
  IN p_partner_admin_id INT,
  IN p_partner_id INT,
  IN p_is_active TINYINT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE affected_rows INT DEFAULT 0;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_USTG_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_toggle_user_status', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_USTG_900_DB_ERROR' AS error_code, error_message,
               0 AS affected;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        CALL partner_admin_log_error(error_code, NULL, error_message, NULL, 'partner_admin_toggle_user_status', p_partner_id, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               0 AS affected;
    END;

    SET start_time = NOW();

    IF NOT EXISTS (SELECT 1 FROM partner_admin_users WHERE partner_admin_id = p_partner_admin_id AND partner_id = p_partner_id) THEN
        SET error_code = 'PA_USTG_100_NOT_FOUND';
        SET error_message = 'Admin user not found for status toggle';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admin user not found for status toggle';
    END IF;

    UPDATE partner_admin_users
    SET is_active = p_is_active
    WHERE partner_admin_id = p_partner_admin_id AND partner_id = p_partner_id;

    SET affected_rows = ROW_COUNT();

    CALL partner_admin_log_activity(IF(p_is_active, 'ACTIVATE', 'DEACTIVATE'), CONCAT('Admin user status toggled: ', p_partner_admin_id), NULL, 'partner_admin_toggle_user_status', NULL, p_partner_id, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           affected_rows AS affected;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_reset_user_password
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_reset_user_password`$$
CREATE PROCEDURE `partner_admin_reset_user_password`(
  IN p_partner_admin_id INT,
  IN p_partner_id INT,
  IN p_password_hash VARCHAR(255)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE affected_rows INT DEFAULT 0;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_USRS_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_reset_user_password', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_USRS_900_DB_ERROR' AS error_code, error_message,
               0 AS affected;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        CALL partner_admin_log_error(error_code, NULL, error_message, NULL, 'partner_admin_reset_user_password', p_partner_id, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               0 AS affected;
    END;

    SET start_time = NOW();

    IF NOT EXISTS (SELECT 1 FROM partner_admin_users WHERE partner_admin_id = p_partner_admin_id AND partner_id = p_partner_id) THEN
        SET error_code = 'PA_USRS_100_NOT_FOUND';
        SET error_message = 'Admin user not found for password reset';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admin user not found for password reset';
    END IF;

    UPDATE partner_admin_users
    SET password_hash = p_password_hash,
        updated_at = NOW()
    WHERE partner_admin_id = p_partner_admin_id
      AND partner_id = p_partner_id;

    SET affected_rows = ROW_COUNT();

    CALL partner_admin_log_activity('RESET_PASSWORD', CONCAT('Password reset for user: ', p_partner_admin_id), NULL, 'partner_admin_reset_user_password', NULL, p_partner_id, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           affected_rows AS affected;
END$$

DELIMITER ;
