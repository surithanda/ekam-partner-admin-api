-- ============================================================================
-- Partner Admin — Account Management Stored Procedures
-- Contains:
--   3 NEW partner_admin_* SPs (created for this module)
--   4 EXISTING eb_* / get_* SPs (pre-existing, reused by this module)
-- ============================================================================

DELIMITER $$

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION A — NEW PARTNER ADMIN SPs (3)                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- -----------------------------------------------------------------------------
-- 1. partner_admin_get_accounts_by_partner
--    Paginated list with search/status filter, includes profile count per account
--    Used by: GET /api/accounts/list
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_accounts_by_partner`$$
CREATE PROCEDURE `partner_admin_get_accounts_by_partner`(
    IN p_partner_id INT,
    IN p_page INT,
    IN p_limit INT,
    IN p_search VARCHAR(255),
    IN p_status INT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE v_offset INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_ACLI_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_accounts_by_partner', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_ACLI_900_DB_ERROR' AS error_code, error_message;
    END;

    SET v_offset = (p_page - 1) * p_limit;

    -- Total count
    SELECT COUNT(*) AS total
    FROM account a
    WHERE a.registered_partner_id = p_partner_id
      AND (a.is_deleted IS NULL OR a.is_deleted = 0)
      AND (p_search IS NULL OR p_search = '' OR
           a.first_name LIKE CONCAT('%', p_search, '%')
           OR a.last_name LIKE CONCAT('%', p_search, '%')
           OR a.email LIKE CONCAT('%', p_search, '%')
           OR a.account_code LIKE CONCAT('%', p_search, '%')
           OR a.primary_phone LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR a.is_active = p_status);

    -- Paginated results with profile count
    SELECT
        a.account_id,
        a.account_code,
        a.email,
        a.first_name,
        a.last_name,
        a.middle_name,
        a.primary_phone,
        a.primary_phone_country,
        a.gender,
        a.birth_date,
        a.city,
        a.state,
        a.country,
        a.is_active,
        a.created_date,
        a.photo,
        (SELECT COUNT(*) FROM profile_personal pp WHERE pp.account_id = a.account_id) AS profile_count,
        (SELECT COALESCE(l.is_active, 0) FROM login l WHERE l.account_id = a.account_id LIMIT 1) AS login_active
    FROM account a
    WHERE a.registered_partner_id = p_partner_id
      AND (a.is_deleted IS NULL OR a.is_deleted = 0)
      AND (p_search IS NULL OR p_search = '' OR
           a.first_name LIKE CONCAT('%', p_search, '%')
           OR a.last_name LIKE CONCAT('%', p_search, '%')
           OR a.email LIKE CONCAT('%', p_search, '%')
           OR a.account_code LIKE CONCAT('%', p_search, '%')
           OR a.primary_phone LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR a.is_active = p_status)
    ORDER BY a.created_date DESC
    LIMIT p_limit OFFSET v_offset;
END$$

-- -----------------------------------------------------------------------------
-- 2. partner_admin_get_account_by_id
--    Single account with login info + profiles list
--    Used by: POST /api/accounts/detail
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_account_by_id`$$
CREATE PROCEDURE `partner_admin_get_account_by_id`(
    IN p_account_id INT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_ACGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_account_by_id', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_ACGT_900_DB_ERROR' AS error_code, error_message;
    END;

    -- Account details + login status
    SELECT
        a.*,
        (SELECT l.login_id FROM login l WHERE l.account_id = a.account_id LIMIT 1) AS login_id,
        (SELECT l.user_name FROM login l WHERE l.account_id = a.account_id LIMIT 1) AS login_username,
        (SELECT COALESCE(l.is_active, 0) FROM login l WHERE l.account_id = a.account_id LIMIT 1) AS login_active,
        (SELECT COUNT(*) FROM profile_personal pp WHERE pp.account_id = a.account_id) AS profile_count
    FROM account a
    WHERE a.account_id = p_account_id
      AND (a.is_deleted IS NULL OR a.is_deleted = 0);

    -- Profiles for this account
    SELECT
        pp.profile_id,
        pp.first_name,
        pp.last_name,
        pp.gender,
        pp.birth_date,
        pp.phone_mobile,
        pp.email_id,
        pp.is_active,
        pp.created_date,
        (SELECT url FROM profile_photo ph WHERE ph.profile_id = pp.profile_id AND ph.photo_type = 1 AND (ph.softdelete IS NULL OR ph.softdelete = 0) LIMIT 1) AS profile_photo_url
    FROM profile_personal pp
    WHERE pp.account_id = p_account_id
    ORDER BY pp.created_date DESC;
END$$

-- -----------------------------------------------------------------------------
-- 3. partner_admin_soft_delete_account
--    Soft-delete: sets is_deleted=1, deactivates account + login
--    Used by: POST /api/accounts/delete
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_soft_delete_account`$$
CREATE PROCEDURE `partner_admin_soft_delete_account`(
    IN p_account_id INT,
    IN p_deleted_user VARCHAR(50),
    IN p_deleted_reason VARCHAR(255)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE account_exists INT DEFAULT 0;
    DECLARE start_time DATETIME DEFAULT NOW();

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_ACDL_900_DB_ERROR', error_code, error_message, p_deleted_user, 'partner_admin_soft_delete_account', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_ACDL_900_DB_ERROR' AS error_code, error_message,
               NULL AS account_id;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        CALL partner_admin_log_error(error_code, NULL, error_message, p_deleted_user, 'partner_admin_soft_delete_account', NULL, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS account_id;
    END;

    -- Validate account exists
    SELECT COUNT(*) INTO account_exists
    FROM account
    WHERE account_id = p_account_id
      AND (is_deleted IS NULL OR is_deleted = 0);

    IF account_exists = 0 THEN
        SET error_code = 'PA_ACDL_001_NOT_FOUND';
        SET error_message = 'Account not found or already deleted';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found or already deleted';
    END IF;

    START TRANSACTION;

    -- Soft-delete account
    UPDATE account
    SET is_deleted = 1,
        deleted_date = NOW(),
        deleted_user = p_deleted_user,
        deleted_reason = p_deleted_reason,
        is_active = 0,
        deactivated_date = NOW(),
        deactivated_user = p_deleted_user,
        deactivation_reason = COALESCE(p_deleted_reason, 'Account deleted'),
        modified_date = NOW(),
        modified_user = p_deleted_user
    WHERE account_id = p_account_id;

    -- Deactivate login
    UPDATE login
    SET is_active = 0,
        deactivation_date = NOW(),
        modified_date = NOW(),
        modified_user = p_deleted_user
    WHERE account_id = p_account_id;

    COMMIT;

    CALL partner_admin_log_activity('DELETE', CONCAT('Account soft-deleted: ', p_account_id), p_deleted_user, 'partner_admin_soft_delete_account', CONCAT('Account ID: ', p_account_id, ', Reason: ', COALESCE(p_deleted_reason, 'N/A')), NULL, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           p_account_id AS account_id;
END$$


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION B — EXISTING SPs REUSED BY ACCOUNT MODULE (4)                  ║
-- ║  These already exist in the database. Included here for reference only.  ║
-- ║  Uses: eb_* prefix (customer-facing) and get_* prefix (utility)         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- -----------------------------------------------------------------------------
-- 4. eb_account_login_create (EXISTING — reference copy)
--    Creates account + login in a single transaction.
--    Auto-generates account_code (YYYYMMDD-HHmmss-N).
--    Uses email as login username. Validates email, password, name, age >= 20,
--    duplicate email/phone. Links to partner via p_partner_id.
--    Used by: POST /api/accounts/create  →  accountAdo.createAccountWithLogin()
--    Params (23): p_email, p_user_pwd, p_first_name, p_middle_name, p_last_name,
--      p_birth_date, p_gender, p_primary_phone, p_primary_phone_country,
--      p_primary_phone_type, p_secondary_phone, p_secondary_phone_country,
--      p_secondary_phone_type, p_address_line1, p_address_line2, p_city, p_state,
--      p_zip, p_country, p_photo, p_secret_question, p_secret_answer, p_partner_id
--    Returns: status, error_type, account_id, account_code, email, error_code, error_message
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `eb_account_login_create`$$
CREATE PROCEDURE `eb_account_login_create`(
    IN p_email VARCHAR(150),
    IN p_user_pwd VARCHAR(150),
    IN p_first_name VARCHAR(45),
    IN p_middle_name VARCHAR(45),
    IN p_last_name VARCHAR(45),
    IN p_birth_date DATE,
    IN p_gender INT,
    IN p_primary_phone VARCHAR(10),
    IN p_primary_phone_country VARCHAR(5),
    IN p_primary_phone_type INT,
    IN p_secondary_phone VARCHAR(10),
    IN p_secondary_phone_country VARCHAR(5),
    IN p_secondary_phone_type INT,
    IN p_address_line1 VARCHAR(45),
    IN p_address_line2 VARCHAR(45),
    IN p_city VARCHAR(45),
    IN p_state VARCHAR(45),
    IN p_zip VARCHAR(45),
    IN p_country VARCHAR(45),
    IN p_photo VARCHAR(45),
    IN p_secret_question VARCHAR(45),
    IN p_secret_answer VARCHAR(45),
    IN p_partner_id INT
)
BEGIN
    DECLARE custom_error BOOLEAN DEFAULT FALSE;
    DECLARE error_code VARCHAR(100) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE new_account_id INT;
    DECLARE sno VARCHAR(25) DEFAULT '';
    DECLARE account_code VARCHAR(50);
    DECLARE min_birth_date DATE;
    DECLARE start_time DATETIME;
    DECLARE end_time DATETIME;
    DECLARE execution_time INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL common_log_error(error_code, error_message, p_email, 'ACCOUNT_LOGIN_CREATE', start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               NULL AS account_id, NULL AS account_code, NULL AS email,
               error_code, error_message;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        CALL common_log_error(error_code, error_message, p_email, 'ACCOUNT_LOGIN_CREATE', start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               NULL AS account_id, NULL AS account_code, NULL AS email,
               error_code, error_message;
    END;

    SET start_time = NOW();
    START TRANSACTION;
    SET min_birth_date = DATE_SUB(CURDATE(), INTERVAL 20 YEAR);

    -- Validation
    IF p_email IS NULL OR p_email = '' THEN
        SET error_code = '45001_MISSING_EMAIL';
        SET error_message = 'Email is required';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF p_user_pwd IS NULL OR p_user_pwd = '' THEN
        SET error_code = '45002_MISSING_PASSWORD';
        SET error_message = 'Password is required';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF p_first_name IS NULL OR p_first_name = '' THEN
        SET error_code = '45003_MISSING_FIRST_NAME';
        SET error_message = 'First name is required';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF p_last_name IS NULL OR p_last_name = '' THEN
        SET error_code = '45004_MISSING_LAST_NAME';
        SET error_message = 'Last name is required';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF p_birth_date > CURDATE() THEN
        SET error_code = '45007_INVALID_BIRTH_DATE';
        SET error_message = 'Birth date cannot be in the future';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF p_birth_date > min_birth_date THEN
        SET error_code = '45008_UNDERAGE';
        SET error_message = 'User must be at least 20 years old';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF EXISTS (SELECT 1 FROM account a WHERE a.email = p_email) THEN
        SET error_code = '45005_DUPLICATE_EMAIL';
        SET error_message = 'Email already exists';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF EXISTS (SELECT 1 FROM account a WHERE a.primary_phone = p_primary_phone) THEN
        SET error_code = '45006_DUPLICATE_PHONE';
        SET error_message = 'Primary phone number already exists';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    -- Generate account code
    SELECT COUNT(*) + 1 INTO sno
    FROM account
    WHERE DATE_FORMAT(created_date, '%Y-%m-%d') = DATE_FORMAT(NOW(), '%Y-%m-%d');

    SET account_code = CONCAT(DATE_FORMAT(NOW(), '%Y%m%d-%H%i%s'), CONCAT('-', sno));

    -- Insert account
    INSERT INTO account (
        account_code, email, first_name, middle_name, last_name,
        primary_phone, primary_phone_country, primary_phone_type,
        secondary_phone, secondary_phone_country, secondary_phone_type,
        birth_date, gender, address_line1, address_line2,
        city, state, zip, country, photo,
        secret_question, secret_answer, registered_partner_id
    ) VALUES (
        account_code, p_email, p_first_name, p_middle_name, p_last_name,
        p_primary_phone, p_primary_phone_country, p_primary_phone_type,
        p_secondary_phone, p_secondary_phone_country, p_secondary_phone_type,
        p_birth_date, p_gender, p_address_line1, p_address_line2,
        p_city, p_state, p_zip, p_country, p_photo,
        p_secret_question, p_secret_answer, p_partner_id
    );

    SET new_account_id = LAST_INSERT_ID();

    -- Insert login (email as username)
    INSERT INTO login (account_id, user_name, password)
    VALUES (new_account_id, p_email, p_user_pwd);

    COMMIT;

    SET end_time = NOW();
    SET execution_time = TIMESTAMPDIFF(MICROSECOND, start_time, end_time) / 1000;

    CALL common_log_activity(
        'CREATE', CONCAT('Account created: ', p_email), p_email,
        'ACCOUNT_LOGIN_CREATE',
        CONCAT('Account ID: ', new_account_id, ', Account Code: ', account_code),
        start_time, end_time
    );

    SELECT 'success' AS status, NULL AS error_type,
           new_account_id AS account_id, account_code, p_email AS email,
           NULL AS error_code, NULL AS error_message;
END$$

-- -----------------------------------------------------------------------------
-- 5. eb_account_update (EXISTING — reference copy)
--    Updates account fields using COALESCE (null = no change).
--    Identifies account by account_code + email.
--    Used by: POST /api/accounts/update  →  accountAdo.updateAccount()
--    Params (20): p_account_code, p_email, p_first_name, p_middle_name,
--      p_last_name, p_primary_phone, p_primary_phone_country, p_primary_phone_type,
--      p_birth_date, p_gender, p_address_line1, p_address_line2, p_city, p_state,
--      p_zip, p_country, p_photo, p_secondary_phone, p_secondary_phone_country,
--      p_secondary_phone_type
--    Returns: affected_rows, status, account_code, email, error_code, error_message
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `eb_account_update`$$
CREATE PROCEDURE `eb_account_update`(
    IN p_account_code VARCHAR(36),
    IN p_email VARCHAR(150),
    IN p_first_name VARCHAR(50),
    IN p_middle_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_primary_phone VARCHAR(20),
    IN p_primary_phone_country VARCHAR(5),
    IN p_primary_phone_type VARCHAR(20),
    IN p_birth_date DATE,
    IN p_gender VARCHAR(10),
    IN p_address_line1 VARCHAR(100),
    IN p_address_line2 VARCHAR(100),
    IN p_city VARCHAR(50),
    IN p_state VARCHAR(50),
    IN p_zip VARCHAR(10),
    IN p_country VARCHAR(50),
    IN p_photo VARCHAR(255),
    IN p_secondary_phone VARCHAR(20),
    IN p_secondary_phone_country VARCHAR(5),
    IN p_secondary_phone_type VARCHAR(20)
)
BEGIN
    UPDATE account
    SET
        first_name = COALESCE(p_first_name, first_name),
        middle_name = COALESCE(p_middle_name, middle_name),
        last_name = COALESCE(p_last_name, last_name),
        primary_phone = COALESCE(p_primary_phone, primary_phone),
        primary_phone_country = COALESCE(p_primary_phone_country, primary_phone_country),
        primary_phone_type = COALESCE(p_primary_phone_type, primary_phone_type),
        birth_date = COALESCE(p_birth_date, birth_date),
        gender = COALESCE(p_gender, gender),
        address_line1 = COALESCE(p_address_line1, address_line1),
        address_line2 = COALESCE(p_address_line2, address_line2),
        city = COALESCE(p_city, city),
        state = COALESCE(p_state, state),
        zip = COALESCE(p_zip, zip),
        country = COALESCE(p_country, country),
        photo = COALESCE(p_photo, photo),
        secondary_phone = COALESCE(p_secondary_phone, secondary_phone),
        secondary_phone_country = COALESCE(p_secondary_phone_country, secondary_phone_country),
        secondary_phone_type = COALESCE(p_secondary_phone_type, secondary_phone_type),
        modified_date = NOW(),
        modified_user = 'SYSTEM'
    WHERE account_code = p_account_code
    AND email = p_email;

    COMMIT;

    SELECT ROW_COUNT() AS affected_rows, 'success' AS status, NULL AS error_type,
           p_account_code, p_email AS email, NULL AS error_code, NULL AS error_message;
END$$

-- -----------------------------------------------------------------------------
-- 6. eb_enable_disable_account (EXISTING — reference copy)
--    Toggles account + login active status. Sets activation/deactivation dates.
--    Used by: POST /api/accounts/toggle-status  →  accountAdo.toggleAccountStatus()
--    Params (4): p_account_id, p_is_active, p_reason, p_modified_user
--    Returns: account_id, message (result set 1); error_code, error_message (result set 2)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `eb_enable_disable_account`$$
CREATE PROCEDURE `eb_enable_disable_account`(
    IN p_account_id INT,
    IN p_is_active TINYINT,
    IN p_reason VARCHAR(255),
    IN p_modified_user VARCHAR(50)
)
BEGIN
    DECLARE custom_error BOOLEAN DEFAULT FALSE;
    DECLARE error_code VARCHAR(100) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE account_exists INT DEFAULT 0;
    DECLARE start_time DATETIME DEFAULT NOW();
    DECLARE end_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF error_code IS NULL THEN
            GET DIAGNOSTICS CONDITION 1
                @sqlstate = RETURNED_SQLSTATE,
                @errno = MYSQL_ERRNO,
                @text = MESSAGE_TEXT;
            SET error_code = CONCAT('SQL_ERROR_', @errno);
            SET error_message = @text;
        ELSE
            SET error_message = error_message;
        END IF;
        ROLLBACK;
        CALL common_log_error(error_code, error_message, p_modified_user, 'ENABLE_DISABLE_ACCOUNT', start_time);
        SELECT NULL AS account_id;
        SELECT error_code AS error_code, error_message AS error_message;
        RESIGNAL;
    END;

    IF p_account_id IS NULL THEN
        SET error_code = '45010_MISSING_ACCOUNT_ID';
        SET error_message = 'Account ID is required';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    IF p_is_active IS NULL THEN
        SET error_code = '45060_MISSING_IS_ACTIVE';
        SET error_message = 'Active status is required';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    SELECT COUNT(*) INTO account_exists
    FROM account
    WHERE account_id = p_account_id
    AND (is_deleted IS NULL OR is_deleted = 0);

    IF account_exists = 0 THEN
        SET error_code = '45011_ACCOUNT_NOT_FOUND';
        SET error_message = 'Account not found';
        SET custom_error = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;

    START TRANSACTION;

    UPDATE account
    SET is_active = p_is_active,
        modified_date = NOW(),
        modified_user = p_modified_user,
        activation_date = CASE WHEN p_is_active = 1 THEN NOW() ELSE activation_date END,
        activated_user = CASE WHEN p_is_active = 1 THEN p_modified_user ELSE activated_user END,
        deactivated_date = CASE WHEN p_is_active = 0 THEN NOW() ELSE deactivated_date END,
        deactivated_user = CASE WHEN p_is_active = 0 THEN p_modified_user ELSE deactivated_user END,
        deactivation_reason = CASE WHEN p_is_active = 0 THEN p_reason ELSE deactivation_reason END
    WHERE account_id = p_account_id;

    UPDATE login
    SET is_active = p_is_active,
        active_date = NOW(),
        modified_date = NOW(),
        modified_user = p_modified_user
    WHERE account_id = p_account_id
    LIMIT 1;

    COMMIT;

    SET end_time = NOW();

    CALL common_log_activity(
        CASE WHEN p_is_active = 1 THEN 'ENABLE' ELSE 'DISABLE' END,
        CASE WHEN p_is_active = 1 THEN 'Account enabled' ELSE 'Account disabled' END,
        p_modified_user, 'ENABLE_DISABLE_ACCOUNT',
        CONCAT('Account ID: ', p_account_id, CASE WHEN p_is_active = 0 AND p_reason IS NOT NULL THEN CONCAT(', Reason: ', p_reason) ELSE '' END),
        start_time, end_time
    );

    SELECT p_account_id AS account_id,
           CASE WHEN p_is_active = 1 THEN 'Account enabled successfully' ELSE 'Account disabled successfully' END AS message;
    SELECT NULL AS error_code, NULL AS error_message;
END$$

-- -----------------------------------------------------------------------------
-- 7. get_accountDetails (EXISTING — reference copy)
--    Gets full account details by email address.
--    Used by: (reference only — admin module uses partner_admin_get_account_by_id instead)
--    Params (1): email_id
--    Returns: All account columns, or error_code/error_message if not found
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `get_accountDetails`$$
CREATE PROCEDURE `get_accountDetails`(IN email_id VARCHAR(150))
BEGIN
    DECLARE error_code VARCHAR(100) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    SET error_code = '45015_EMAIL_DOES_NOT_EXIST';
    SET error_message = 'Email doesn\'t exists';

    IF EXISTS (SELECT * FROM account WHERE email = email_id) THEN
        SELECT
            `account`.`account_code`,
            `account`.`account_id`,
            `account`.`email`,
            `account`.`primary_phone`,
            `account`.`primary_phone_country`,
            `account`.`primary_phone_type`,
            `account`.`secondary_phone`,
            `account`.`secondary_phone_country`,
            `account`.`secondary_phone_type`,
            `account`.`first_name`,
            `account`.`last_name`,
            `account`.`middle_name`,
            `account`.`birth_date`,
            `account`.`gender`,
            `account`.`address_line1`,
            `account`.`address_line2`,
            `account`.`city`,
            `account`.`state`,
            `account`.`zip`,
            `account`.`country`,
            `account`.`photo`,
            `account`.`secret_question`,
            `account`.`secret_answer`,
            `account`.`created_date`,
            `account`.`created_user`,
            `account`.`modified_date`,
            `account`.`modified_user`,
            `account`.`is_active`,
            `account`.`activation_date`,
            `account`.`activated_user`,
            `account`.`deactivated_date`,
            `account`.`deactivated_user`,
            `account`.`deactivation_reason`,
            `account`.`is_deleted`,
            `account`.`deleted_date`,
            `account`.`deleted_user`,
            `account`.`deleted_reason`
        FROM `matrimony_services`.`account`
        WHERE email = email_id;
    ELSE
        SELECT error_code AS error_code, error_message AS error_message;
    END IF;
END$$

DELIMITER ;
