-- ============================================================================
-- Partner Admin — Utility Stored Procedures
-- Helper SPs used by all other SPs and the Node.js API layer
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_log_error
-- 7-param signature used by 48+ SPs for error logging.
-- Inserts NULL for request_data and stack_trace.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_log_error`$$
CREATE PROCEDURE `partner_admin_log_error`(
    IN p_error_code VARCHAR(50),
    IN p_sql_errno INT,
    IN p_error_message VARCHAR(500),
    IN p_context_user VARCHAR(150),
    IN p_source_name VARCHAR(100),
    IN p_partner_id INT,
    IN p_start_time DATETIME
)
BEGIN
    INSERT INTO partner_admin_error_log (error_code, sql_errno, error_message, context_user, source_name, partner_id, request_data, stack_trace, start_time)
    VALUES (p_error_code, p_sql_errno, p_error_message, p_context_user, p_source_name, p_partner_id, NULL, NULL, p_start_time);
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_log_api_error
-- 9-param signature used by Node.js API layer (errorHandler middleware).
-- Includes request_data and stack_trace.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_log_api_error`$$
CREATE PROCEDURE `partner_admin_log_api_error`(
    IN p_error_code VARCHAR(50),
    IN p_sql_errno INT,
    IN p_error_message VARCHAR(500),
    IN p_context_user VARCHAR(150),
    IN p_source_name VARCHAR(100),
    IN p_partner_id INT,
    IN p_request_data LONGTEXT,
    IN p_stack_trace TEXT,
    IN p_start_time DATETIME
)
BEGIN
    INSERT INTO partner_admin_error_log (error_code, sql_errno, error_message, context_user, source_name, partner_id, request_data, stack_trace, start_time)
    VALUES (p_error_code, p_sql_errno, p_error_message, p_context_user, p_source_name, p_partner_id, p_request_data, p_stack_trace, p_start_time);
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_log_activity
-- Logs activity with automatic execution_ms calculation.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_log_activity`$$
CREATE PROCEDURE `partner_admin_log_activity`(
    IN p_action_type VARCHAR(20),
    IN p_description VARCHAR(500),
    IN p_context_user VARCHAR(150),
    IN p_source_name VARCHAR(100),
    IN p_details TEXT,
    IN p_partner_id INT,
    IN p_start_time DATETIME,
    IN p_end_time DATETIME
)
BEGIN
    INSERT INTO partner_admin_activity_log (action_type, description, context_user, source_name, details, partner_id, start_time, end_time, execution_ms)
    VALUES (p_action_type, p_description, p_context_user, p_source_name, p_details, p_partner_id, p_start_time, p_end_time,
            TIMESTAMPDIFF(MICROSECOND, p_start_time, p_end_time) / 1000);
END$$

DELIMITER ;
