-- ============================================================================
-- Partner Admin — Auth Stored Procedures (7 SPs)
-- Login, token validation, domain lookup, user lookup
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_get_api_client_by_key
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_api_client_by_key`$$
CREATE PROCEDURE `partner_admin_get_api_client_by_key`(IN p_api_key VARCHAR(255))
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_AUGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_api_client_by_key', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_AUGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT id, partner_name, api_key, is_active, partner_id, partner_root_domain,
           partner_admin_url, partner_pin
    FROM api_clients WHERE api_key = p_api_key;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_partner_user
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_partner_user`$$
CREATE PROCEDURE `partner_admin_get_partner_user`(
  IN p_username VARCHAR(255),
  IN p_partner_id INT
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_AUGT_900_DB_ERROR', error_code, error_message, p_username, 'partner_admin_get_partner_user', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_AUGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT partner_admin_id, partner_id, username, password_hash, email,
           first_name, last_name, role, is_active, last_login
    FROM partner_admin_users
    WHERE username = p_username AND partner_id = p_partner_id AND is_active = 1;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_update_last_login
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_update_last_login`$$
CREATE PROCEDURE `partner_admin_update_last_login`(IN p_partner_admin_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            error_message = MESSAGE_TEXT,
            error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_AUUP_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_update_last_login', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_AUUP_900_DB_ERROR' AS error_code, error_message;
    END;

    SET start_time = NOW();
    UPDATE partner_admin_users SET last_login = NOW() WHERE partner_admin_id = p_partner_admin_id;

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_partner_domains
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_partner_domains`$$
CREATE PROCEDURE `partner_admin_get_partner_domains`()
BEGIN
  SELECT ac.id, ac.partner_name, ac.api_key, ac.partner_root_domain, ac.partner_admin_url,
         rp.business_name, rp.business_website, rp.domain_root_url
  FROM api_clients ac
  LEFT JOIN registered_partner rp ON ac.partner_id = rp.reg_partner_id
  WHERE ac.is_active = 1;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_login_by_username
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_login_by_username`$$
CREATE PROCEDURE `partner_admin_get_login_by_username`(IN p_username VARCHAR(255))
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_AUGT_900_DB_ERROR', error_code, error_message, p_username, 'partner_admin_get_login_by_username', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_AUGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT l.*, a.registered_partner_id, a.first_name, a.last_name, a.email
    FROM login l
    JOIN account a ON l.account_id = a.account_id
    WHERE l.user_name = p_username AND l.is_active = 1;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_admin_user_by_username
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_admin_user_by_username`$$
CREATE PROCEDURE `partner_admin_get_admin_user_by_username`(IN p_username VARCHAR(255))
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_AUGT_900_DB_ERROR', error_code, error_message, p_username, 'partner_admin_get_admin_user_by_username', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_AUGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT * FROM admin_users WHERE username = p_username AND is_active = 1;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_insert_login_history
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_insert_login_history`$$
CREATE PROCEDURE `partner_admin_insert_login_history`(
    IN p_login_id INT, IN p_ip_address VARCHAR(255), IN p_browser_profile VARCHAR(500)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_AULG_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_insert_login_history', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_AULG_900_DB_ERROR' AS error_code, error_message;
    END;

    INSERT INTO login_history (login_id, ip_address, browser_profile, login_time)
    VALUES (p_login_id, p_ip_address, p_browser_profile, NOW());
END$$

DELIMITER ;
