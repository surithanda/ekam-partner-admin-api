-- ============================================================================
-- Partner Admin — Audit Stored Procedures (2 SPs)
-- Insert and list audit log entries
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_insert_audit_log
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_insert_audit_log`$$
CREATE PROCEDURE `partner_admin_insert_audit_log`(
  IN p_partner_id INT,
  IN p_user_id INT,
  IN p_username VARCHAR(255),
  IN p_user_role VARCHAR(50),
  IN p_action VARCHAR(100),
  IN p_entity_type VARCHAR(100),
  IN p_entity_id INT,
  IN p_endpoint VARCHAR(255),
  IN p_request_body TEXT,
  IN p_previous_data TEXT,
  IN p_new_data TEXT,
  IN p_ip_address VARCHAR(50),
  IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_error_code VARCHAR(50) DEFAULT NULL;
    DECLARE v_error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_error_message = MESSAGE_TEXT,
            v_error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_ALCR_900_DB_ERROR', v_error_code, v_error_message, p_username, 'partner_admin_insert_audit_log', p_partner_id, NOW());
    END;

    INSERT INTO partner_admin_audit_log
      (partner_id, user_id, username, user_role, action, entity_type, entity_id, endpoint, request_body, previous_data, new_data, ip_address, user_agent)
    VALUES
      (p_partner_id, p_user_id, p_username, p_user_role, p_action, p_entity_type, p_entity_id, p_endpoint, p_request_body, p_previous_data, p_new_data, p_ip_address, p_user_agent);
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_audit_logs
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_audit_logs`$$
CREATE PROCEDURE `partner_admin_get_audit_logs`(
    IN p_partner_id INT, IN p_page INT, IN p_limit INT,
    IN p_action VARCHAR(100), IN p_username VARCHAR(255),
    IN p_entity_type VARCHAR(100), IN p_date_from DATE, IN p_date_to DATE
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE v_offset INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_ALLI_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_audit_logs', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_ALLI_900_DB_ERROR' AS error_code, error_message;
    END;

    SET v_offset = (p_page - 1) * p_limit;

    SELECT COUNT(*) as total
    FROM partner_admin_audit_log
    WHERE partner_id = p_partner_id
      AND (p_action IS NULL OR action = p_action)
      AND (p_username IS NULL OR username = p_username)
      AND (p_entity_type IS NULL OR entity_type = p_entity_type)
      AND (p_date_from IS NULL OR DATE(created_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(created_at) <= p_date_to);

    SELECT audit_id, partner_id, user_id, username, user_role, action,
           entity_type, entity_id, endpoint, request_body, previous_data, new_data,
           ip_address, user_agent, created_at
    FROM partner_admin_audit_log
    WHERE partner_id = p_partner_id
      AND (p_action IS NULL OR action = p_action)
      AND (p_username IS NULL OR username = p_username)
      AND (p_entity_type IS NULL OR entity_type = p_entity_type)
      AND (p_date_from IS NULL OR DATE(created_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(created_at) <= p_date_to)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset;
END$$

DELIMITER ;
