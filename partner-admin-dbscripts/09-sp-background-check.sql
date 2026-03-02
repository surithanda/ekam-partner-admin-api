-- ============================================================================
-- Partner Admin — Background Check Stored Procedures (2 SPs)
-- Get profile for check, log background check request
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_get_profile_for_check
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profile_for_check`$$
CREATE PROCEDURE `partner_admin_get_profile_for_check`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_BCGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_for_check', NULL, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_BCGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT pp.profile_id, pp.first_name, pp.last_name, pp.birth_date, pp.phone_mobile,
           pp.email_id, pp.gender, a.account_code, a.driving_license,
           pa.address_line1, pa.city, pa.state, pa.country_id, pa.zip
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    LEFT JOIN profile_address pa ON pp.profile_id = pa.profile_id
    WHERE pp.profile_id = p_profile_id
    LIMIT 1;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_log_background_check_request
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_log_background_check_request`$$
CREATE PROCEDURE `partner_admin_log_background_check_request`(
  IN p_profile_id INT,
  IN p_check_type VARCHAR(100),
  IN p_requested_by VARCHAR(255),
  IN p_notes TEXT
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
        CALL partner_admin_log_error('PA_BCIN_900_DB_ERROR', error_code, error_message, p_requested_by, 'partner_admin_log_background_check_request', NULL, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_BCIN_900_DB_ERROR' AS error_code, error_message;
    END;

    SET start_time = NOW();

    INSERT INTO activity_log (log_type, message, created_at, created_by, activity_type, activity_details)
    VALUES ('BACKGROUND_CHECK', CONCAT('Background check initiated for profile ', p_profile_id),
            NOW(), p_requested_by, p_check_type, p_notes);

    CALL partner_admin_log_activity('BACKGROUND_CHECK', CONCAT('Background check initiated: profile ', p_profile_id, ', type: ', p_check_type), p_requested_by, 'partner_admin_log_background_check_request', p_notes, NULL, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message;
END$$

DELIMITER ;
