-- ============================================================================
-- Partner Admin — Profile Stored Procedures (18 SPs)
-- List, get, create, update, toggle, lookups, sub-profile sections
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_get_profiles_by_partner
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profiles_by_partner`$$
CREATE PROCEDURE `partner_admin_get_profiles_by_partner`(
    IN p_partner_id INT, IN p_page INT, IN p_limit INT,
    IN p_search VARCHAR(255), IN p_status INT, IN p_gender INT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE v_offset INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFLI_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profiles_by_partner', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFLI_900_DB_ERROR' AS error_code, error_message;
    END;

    SET v_offset = (p_page - 1) * p_limit;

    SELECT COUNT(*) as total
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id
      AND (p_search IS NULL OR p_search = '' OR
           pp.first_name LIKE CONCAT('%', p_search, '%')
           OR pp.last_name LIKE CONCAT('%', p_search, '%')
           OR pp.email_id LIKE CONCAT('%', p_search, '%')
           OR a.account_code LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR pp.is_active = p_status)
      AND (p_gender IS NULL OR pp.gender = p_gender);

    SELECT pp.profile_id, pp.account_id, pp.first_name, pp.last_name, pp.middle_name,
           pp.gender, pp.birth_date, pp.phone_mobile, pp.email_id, pp.marital_status,
           pp.is_active, pp.created_date, a.account_code, a.photo,
           (SELECT url FROM profile_photo ph WHERE ph.profile_id = pp.profile_id AND ph.photo_type = 1 AND (ph.softdelete IS NULL OR ph.softdelete = 0) LIMIT 1) as profile_photo_url
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id
      AND (p_search IS NULL OR p_search = '' OR
           pp.first_name LIKE CONCAT('%', p_search, '%')
           OR pp.last_name LIKE CONCAT('%', p_search, '%')
           OR pp.email_id LIKE CONCAT('%', p_search, '%')
           OR a.account_code LIKE CONCAT('%', p_search, '%'))
      AND (p_status IS NULL OR pp.is_active = p_status)
      AND (p_gender IS NULL OR pp.gender = p_gender)
    ORDER BY pp.created_date DESC
    LIMIT p_limit OFFSET v_offset;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_profile_by_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profile_by_id`$$
CREATE PROCEDURE `partner_admin_get_profile_by_id`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_by_id', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT pp.*, a.account_code, a.photo, a.registered_partner_id
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE pp.profile_id = p_profile_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_full_profile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_full_profile`$$
CREATE PROCEDURE `partner_admin_get_full_profile`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_901_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_full_profile', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_901_DB_ERROR' AS error_code, error_message;
    END;

    SELECT pp.*, a.account_code, a.photo, a.registered_partner_id, a.email as account_email
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE pp.profile_id = p_profile_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_generate_account_code
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_generate_account_code`$$
CREATE PROCEDURE `partner_admin_generate_account_code`(IN p_partner_alias VARCHAR(10))
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE v_prefix VARCHAR(3);
    DECLARE v_next_num INT DEFAULT 1001;
    DECLARE v_last_code VARCHAR(50);
    DECLARE v_num_part INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFCR_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_generate_account_code', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFCR_900_DB_ERROR' AS error_code, error_message;
    END;

    SET v_prefix = UPPER(LEFT(COALESCE(p_partner_alias, 'EKM'), 3));

    SELECT account_code INTO v_last_code
    FROM account
    WHERE account_code LIKE CONCAT(v_prefix, '%')
    ORDER BY account_id DESC LIMIT 1;

    IF v_last_code IS NOT NULL THEN
        SET v_num_part = CAST(REPLACE(v_last_code, v_prefix, '') AS UNSIGNED);
        IF v_num_part IS NOT NULL AND v_num_part >= 1001 THEN
            SET v_next_num = v_num_part + 1;
        END IF;
    END IF;

    SELECT CONCAT(v_prefix, v_next_num) as account_code;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_create_account
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_create_account`$$
CREATE PROCEDURE `partner_admin_create_account`(
  IN p_account_code VARCHAR(50),
  IN p_email VARCHAR(255),
  IN p_primary_phone VARCHAR(50),
  IN p_primary_phone_country VARCHAR(10),
  IN p_primary_phone_type INT,
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_middle_name VARCHAR(100),
  IN p_birth_date DATE,
  IN p_gender INT,
  IN p_address_line1 VARCHAR(500),
  IN p_city VARCHAR(100),
  IN p_state VARCHAR(100),
  IN p_zip VARCHAR(20),
  IN p_country VARCHAR(100),
  IN p_registered_partner_id INT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE new_account_id INT;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFCR_900_DB_ERROR', error_code, error_message, p_email, 'partner_admin_create_account', p_registered_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_PFCR_900_DB_ERROR' AS error_code, error_message,
               NULL AS insertId;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        CALL partner_admin_log_error(error_code, NULL, error_message, p_email, 'partner_admin_create_account', p_registered_partner_id, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS insertId;
    END;

    SET start_time = NOW();
    START TRANSACTION;

    IF p_first_name IS NULL OR p_first_name = '' THEN
        SET error_code = 'PA_PFCR_001_MISSING_FIRST_NAME';
        SET error_message = 'First name is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'First name is required';
    END IF;

    IF p_last_name IS NULL OR p_last_name = '' THEN
        SET error_code = 'PA_PFCR_002_MISSING_LAST_NAME';
        SET error_message = 'Last name is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Last name is required';
    END IF;

    IF p_email IS NULL OR p_email = '' THEN
        SET error_code = 'PA_PFCR_003_MISSING_EMAIL';
        SET error_message = 'Email is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email is required';
    END IF;

    IF p_birth_date IS NOT NULL AND p_birth_date > CURDATE() THEN
        SET error_code = 'PA_PFCR_007_INVALID_BIRTH_DATE';
        SET error_message = 'Birth date cannot be in the future';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Birth date cannot be in the future';
    END IF;

    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM account WHERE email = p_email) THEN
        SET error_code = 'PA_PFCR_400_DUPLICATE_EMAIL';
        SET error_message = 'Email already exists';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already exists';
    END IF;

    IF p_primary_phone IS NOT NULL AND p_primary_phone != '' AND EXISTS (SELECT 1 FROM account WHERE primary_phone = p_primary_phone) THEN
        SET error_code = 'PA_PFCR_401_DUPLICATE_PHONE';
        SET error_message = 'Phone number already exists';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phone number already exists';
    END IF;

    INSERT INTO account (account_code, email, primary_phone, primary_phone_country,
      primary_phone_type, first_name, last_name, middle_name, birth_date, gender,
      address_line1, city, state, zip, country, registered_partner_id, created_date, is_active)
    VALUES (p_account_code, p_email, p_primary_phone, p_primary_phone_country,
      p_primary_phone_type, p_first_name, p_last_name, p_middle_name, p_birth_date, p_gender,
      p_address_line1, p_city, p_state, p_zip, p_country, p_registered_partner_id, NOW(), 1);

    SET new_account_id = LAST_INSERT_ID();
    COMMIT;

    CALL partner_admin_log_activity('CREATE', CONCAT('Account created: ', p_email), p_email, 'partner_admin_create_account', CONCAT('Account ID: ', new_account_id, ', Code: ', p_account_code), p_registered_partner_id, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           new_account_id AS insertId;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_create_profile_personal
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_create_profile_personal`$$
CREATE PROCEDURE `partner_admin_create_profile_personal`(
  IN p_account_id INT,
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_middle_name VARCHAR(100),
  IN p_gender INT,
  IN p_birth_date DATE,
  IN p_phone_mobile VARCHAR(50),
  IN p_email_id VARCHAR(255),
  IN p_marital_status INT,
  IN p_religion INT,
  IN p_nationality INT,
  IN p_caste INT,
  IN p_height_inches DECIMAL(5,2),
  IN p_weight DECIMAL(5,2),
  IN p_complexion INT,
  IN p_profession INT,
  IN p_created_user VARCHAR(100),
  IN p_short_summary TEXT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE new_profile_id INT;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFCR_902_PROFILE_CREATE_FAILED', error_code, error_message, p_email_id, 'partner_admin_create_profile_personal', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_PFCR_902_PROFILE_CREATE_FAILED' AS error_code, error_message,
               NULL AS insertId;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        CALL partner_admin_log_error(error_code, NULL, error_message, p_email_id, 'partner_admin_create_profile_personal', NULL, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               NULL AS insertId;
    END;

    SET start_time = NOW();

    IF p_account_id IS NULL THEN
        SET error_code = 'PA_PFCR_901_ACCOUNT_CREATE_FAILED';
        SET error_message = 'Account ID is required to create profile';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account ID is required to create profile';
    END IF;

    IF p_first_name IS NULL OR p_first_name = '' THEN
        SET error_code = 'PA_PFCR_001_MISSING_FIRST_NAME';
        SET error_message = 'First name is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'First name is required';
    END IF;

    INSERT INTO profile_personal (account_id, first_name, last_name, middle_name, gender,
      birth_date, phone_mobile, email_id, marital_status, religion, nationality, caste,
      height_inches, weight, complexion, profession, created_user, is_active, short_summary)
    VALUES (p_account_id, p_first_name, p_last_name, p_middle_name, p_gender,
      p_birth_date, p_phone_mobile, p_email_id, p_marital_status, p_religion, p_nationality,
      p_caste, p_height_inches, p_weight, p_complexion, p_profession, p_created_user, 1, p_short_summary);

    SET new_profile_id = LAST_INSERT_ID();

    CALL partner_admin_log_activity('CREATE', CONCAT('Profile created for account: ', p_account_id), p_email_id, 'partner_admin_create_profile_personal', CONCAT('Profile ID: ', new_profile_id), NULL, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           new_profile_id AS insertId;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_create_login
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_create_login`$$
CREATE PROCEDURE `partner_admin_create_login`(
  IN p_account_id INT,
  IN p_username VARCHAR(255),
  IN p_password VARCHAR(255)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE new_login_id INT;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFCR_903_LOGIN_CREATE_FAILED', error_code, error_message, p_username, 'partner_admin_create_login', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_PFCR_903_LOGIN_CREATE_FAILED' AS error_code, error_message,
               NULL AS insertId;
    END;

    SET start_time = NOW();

    INSERT INTO login (account_id, user_name, password, is_active, created_date)
    VALUES (p_account_id, p_username, p_password, 1, NOW());

    SET new_login_id = LAST_INSERT_ID();

    CALL partner_admin_log_activity('CREATE', CONCAT('Login created for account: ', p_account_id), p_username, 'partner_admin_create_login', CONCAT('Login ID: ', new_login_id), NULL, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           new_login_id AS insertId;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_update_profile_personal
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_update_profile_personal`$$
CREATE PROCEDURE `partner_admin_update_profile_personal`(
  IN p_profile_id INT,
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_middle_name VARCHAR(100),
  IN p_gender INT,
  IN p_birth_date DATE,
  IN p_phone_mobile VARCHAR(50),
  IN p_phone_home VARCHAR(50),
  IN p_email_id VARCHAR(255),
  IN p_marital_status INT,
  IN p_religion INT,
  IN p_nationality INT,
  IN p_caste INT,
  IN p_height_inches DECIMAL(5,2),
  IN p_weight DECIMAL(5,2),
  IN p_complexion INT,
  IN p_profession INT,
  IN p_disability INT,
  IN p_linkedin VARCHAR(500),
  IN p_facebook VARCHAR(500),
  IN p_instagram VARCHAR(500),
  IN p_whatsapp_number VARCHAR(50),
  IN p_is_active TINYINT,
  IN p_short_summary TEXT,
  IN p_updated_user VARCHAR(100)
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
        CALL partner_admin_log_error('PA_PFUP_900_DB_ERROR', error_code, error_message, p_updated_user, 'partner_admin_update_profile_personal', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_PFUP_900_DB_ERROR' AS error_code, error_message,
               0 AS affected;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        CALL partner_admin_log_error(error_code, NULL, error_message, p_updated_user, 'partner_admin_update_profile_personal', NULL, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               0 AS affected;
    END;

    SET start_time = NOW();

    IF p_profile_id IS NULL THEN
        SET error_code = 'PA_PFUP_100_NOT_FOUND';
        SET error_message = 'Profile ID is required';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Profile ID is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM profile_personal WHERE profile_id = p_profile_id) THEN
        SET error_code = 'PA_PFUP_100_NOT_FOUND';
        SET error_message = 'Profile not found';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Profile not found';
    END IF;

    UPDATE profile_personal SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      middle_name = COALESCE(p_middle_name, middle_name),
      gender = COALESCE(p_gender, gender),
      birth_date = COALESCE(p_birth_date, birth_date),
      phone_mobile = COALESCE(p_phone_mobile, phone_mobile),
      phone_home = COALESCE(p_phone_home, phone_home),
      email_id = COALESCE(p_email_id, email_id),
      marital_status = COALESCE(p_marital_status, marital_status),
      religion = COALESCE(p_religion, religion),
      nationality = COALESCE(p_nationality, nationality),
      caste = COALESCE(p_caste, caste),
      height_inches = COALESCE(p_height_inches, height_inches),
      weight = COALESCE(p_weight, weight),
      complexion = COALESCE(p_complexion, complexion),
      profession = COALESCE(p_profession, profession),
      disability = COALESCE(p_disability, disability),
      linkedin = COALESCE(p_linkedin, linkedin),
      facebook = COALESCE(p_facebook, facebook),
      instagram = COALESCE(p_instagram, instagram),
      whatsapp_number = COALESCE(p_whatsapp_number, whatsapp_number),
      is_active = COALESCE(p_is_active, is_active),
      short_summary = COALESCE(p_short_summary, short_summary),
      updated_user = COALESCE(p_updated_user, 'admin'),
      updated_date = NOW()
    WHERE profile_id = p_profile_id;

    SET affected_rows = ROW_COUNT();

    CALL partner_admin_log_activity('UPDATE', CONCAT('Profile updated: ', p_profile_id), p_updated_user, 'partner_admin_update_profile_personal', NULL, NULL, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           affected_rows AS affected;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_toggle_profile_status
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_toggle_profile_status`$$
CREATE PROCEDURE `partner_admin_toggle_profile_status`(
  IN p_profile_id INT,
  IN p_is_active TINYINT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFTG_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_toggle_profile_status', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_PFTG_900_DB_ERROR' AS error_code, error_message,
               0 AS affected;
    END;

    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        CALL partner_admin_log_error(error_code, NULL, error_message, NULL, 'partner_admin_toggle_profile_status', NULL, start_time);
        SELECT 'fail' AS status, 'Validation Exception' AS error_type,
               error_code, error_message,
               0 AS affected;
    END;

    SET start_time = NOW();

    IF NOT EXISTS (SELECT 1 FROM profile_personal WHERE profile_id = p_profile_id) THEN
        SET error_code = 'PA_PFTG_100_NOT_FOUND';
        SET error_message = 'Profile not found for status toggle';
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Profile not found for status toggle';
    END IF;

    UPDATE profile_personal SET is_active = p_is_active, updated_date = NOW() WHERE profile_id = p_profile_id;

    CALL partner_admin_log_activity(IF(p_is_active, 'ACTIVATE', 'DEACTIVATE'), CONCAT('Profile status toggled: ', p_profile_id), NULL, 'partner_admin_toggle_profile_status', NULL, NULL, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           ROW_COUNT() AS affected;
END$$

-- -----------------------------------------------------------------------------
-- Profile sub-section read SPs
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profile_address`$$
CREATE PROCEDURE `partner_admin_get_profile_address`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_902_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_address', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_902_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_address WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_education`$$
CREATE PROCEDURE `partner_admin_get_profile_education`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_903_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_education', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_903_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_education WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_employment`$$
CREATE PROCEDURE `partner_admin_get_profile_employment`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_904_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_employment', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_904_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_employment WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_family`$$
CREATE PROCEDURE `partner_admin_get_profile_family`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_905_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_family', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_905_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_family_reference WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_photos`$$
CREATE PROCEDURE `partner_admin_get_profile_photos`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_906_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_photos', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_906_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_photo WHERE profile_id = p_profile_id AND (softdelete IS NULL OR softdelete = 0);
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_lifestyle`$$
CREATE PROCEDURE `partner_admin_get_profile_lifestyle`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_907_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_lifestyle', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_907_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_lifestyle WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_hobby_interest`$$
CREATE PROCEDURE `partner_admin_get_profile_hobby_interest`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_908_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_hobby_interest', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_908_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_hobby_interest WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_property`$$
CREATE PROCEDURE `partner_admin_get_profile_property`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_909_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_property', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_909_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_property WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_favorites`$$
CREATE PROCEDURE `partner_admin_get_profile_favorites`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_911_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_favorites', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_911_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_favorites WHERE profile_id = p_profile_id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_profile_views`$$
CREATE PROCEDURE `partner_admin_get_profile_views`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_912_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_views', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_912_DB_ERROR' AS error_code, error_message;
    END;
    SELECT * FROM profile_views WHERE to_profile_id = p_profile_id ORDER BY profile_view_date DESC;
END$$

-- -----------------------------------------------------------------------------
-- Lookup SPs
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_gender_lookups`$$
CREATE PROCEDURE `partner_admin_get_gender_lookups`()
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFGT_913_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_gender_lookups', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PFGT_913_DB_ERROR' AS error_code, error_message;
    END;
    SELECT id, name, description
    FROM lookup_table
    WHERE category = 'gender' AND isactive = 1
    ORDER BY id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_lookup_values`$$
CREATE PROCEDURE `partner_admin_get_lookup_values`(IN p_category VARCHAR(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci)
BEGIN
  SELECT id, name, description, category
  FROM lookup_table
  WHERE category = p_category AND isactive = 1
  ORDER BY id;
END$$

DROP PROCEDURE IF EXISTS `partner_admin_get_all_lookups`$$
CREATE PROCEDURE `partner_admin_get_all_lookups`()
BEGIN
  SELECT * FROM lookup_table ORDER BY lookup_type, lookup_value;
END$$

DELIMITER ;
