-- ============================================================================
-- Partner Admin — Partner Stored Procedures (7 SPs)
-- Partner info, domains, countries, states
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_get_partner_by_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_partner_by_id`$$
CREATE PROCEDURE `partner_admin_get_partner_by_id`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PNGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_partner_by_id', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PNGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT rp.*, ac.api_key, ac.partner_root_domain, ac.partner_admin_url
    FROM registered_partner rp
    LEFT JOIN api_clients ac ON ac.partner_id = rp.reg_partner_id
    WHERE rp.reg_partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_partner_by_api_client
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_partner_by_api_client`$$
CREATE PROCEDURE `partner_admin_get_partner_by_api_client`(IN p_api_client_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PNGT_901_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_partner_by_api_client', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PNGT_901_DB_ERROR' AS error_code, error_message;
    END;

    SELECT rp.*, ac.api_key, ac.partner_root_domain, ac.partner_admin_url
    FROM api_clients ac
    JOIN registered_partner rp ON ac.partner_id = rp.reg_partner_id
    WHERE ac.id = p_api_client_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_partner_domain_links
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_partner_domain_links`$$
CREATE PROCEDURE `partner_admin_get_partner_domain_links`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PNGT_902_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_partner_domain_links', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PNGT_902_DB_ERROR' AS error_code, error_message;
    END;

    SELECT rp.business_website, rp.domain_root_url, rp.business_linkedin,
           rp.business_facebook, rp.business_whatsapp,
           ac.partner_root_domain, ac.partner_admin_url
    FROM registered_partner rp
    LEFT JOIN api_clients ac ON ac.partner_id = rp.reg_partner_id
    WHERE rp.reg_partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_all_partners
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_all_partners`$$
CREATE PROCEDURE `partner_admin_get_all_partners`()
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PNLI_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_all_partners', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PNLI_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT rp.reg_partner_id, rp.business_name, rp.alias, rp.business_website,
           rp.domain_root_url, rp.Is_active, rp.primary_contact_first_name,
           rp.primary_contact_last_name, rp.business_email,
           ac.partner_root_domain, ac.partner_admin_url
    FROM registered_partner rp
    LEFT JOIN api_clients ac ON ac.partner_id = rp.reg_partner_id
    ORDER BY rp.business_name;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_countries
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_countries`$$
CREATE PROCEDURE `partner_admin_get_countries`()
BEGIN
  SELECT * FROM country ORDER BY country_name;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_states
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_states`$$
CREATE PROCEDURE `partner_admin_get_states`(IN p_country_id INT)
BEGIN
  SELECT * FROM state WHERE country_id = p_country_id ORDER BY state_name;
END$$

DELIMITER ;
