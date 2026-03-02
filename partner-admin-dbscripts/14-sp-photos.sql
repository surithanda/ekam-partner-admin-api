-- ============================================================================
-- Partner Admin — Photo Stored Procedures (3 SPs)
-- Wrappers around eb_profile_photo_create, eb_profile_photo_delete, 
-- eb_profile_photo_get with partner_admin error handling pattern
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_create_profile_photo
-- Wrapper for eb_profile_photo_create with partner_admin error logging
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_create_profile_photo`$$
CREATE PROCEDURE `partner_admin_create_profile_photo`(
    IN p_profile_id INT,
    IN p_url VARCHAR(500),
    IN p_photo_type INT,
    IN p_caption VARCHAR(100),
    IN p_description VARCHAR(255),
    IN p_created_user VARCHAR(45)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PHCR_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_create_profile_photo', p_profile_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PHCR_900_DB_ERROR' AS error_code, error_message;
    END;

    -- Validate required fields
    IF p_profile_id IS NULL OR p_profile_id = 0 THEN
        SELECT 'fail' AS status, 'Validation' AS error_type, 'PA_PHCR_901_INVALID_PROFILE' AS error_code, 'Profile ID is required' AS error_message;
    ELSEIF p_url IS NULL OR p_url = '' THEN
        SELECT 'fail' AS status, 'Validation' AS error_type, 'PA_PHCR_902_INVALID_URL' AS error_code, 'Photo URL is required' AS error_message;
    ELSEIF p_photo_type IS NULL THEN
        SELECT 'fail' AS status, 'Validation' AS error_type, 'PA_PHCR_903_INVALID_TYPE' AS error_code, 'Photo type is required' AS error_message;
    ELSE
        -- Delegate to eb SP
        CALL eb_profile_photo_create(p_profile_id, p_url, p_photo_type, p_caption, p_description, p_created_user);
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_delete_profile_photo
-- Wrapper for eb_profile_photo_delete with partner_admin error logging
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_delete_profile_photo`$$
CREATE PROCEDURE `partner_admin_delete_profile_photo`(
    IN p_photo_id INT,
    IN p_profile_id INT,
    IN p_user_deleted VARCHAR(45)
)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PHDL_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_delete_profile_photo', p_profile_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PHDL_900_DB_ERROR' AS error_code, error_message;
    END;

    -- Validate required fields
    IF p_photo_id IS NULL OR p_photo_id = 0 THEN
        SELECT 'fail' AS status, 'Validation' AS error_type, 'PA_PHDL_901_INVALID_PHOTO' AS error_code, 'Photo ID is required' AS error_message;
    ELSEIF p_profile_id IS NULL OR p_profile_id = 0 THEN
        SELECT 'fail' AS status, 'Validation' AS error_type, 'PA_PHDL_902_INVALID_PROFILE' AS error_code, 'Profile ID is required' AS error_message;
    ELSE
        -- Delegate to eb SP
        CALL eb_profile_photo_delete(p_photo_id, p_profile_id, p_user_deleted);
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_profile_photos
-- Already exists — this is a re-create to ensure consistent error handling
-- Retrieves all non-soft-deleted photos for a profile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profile_photos`$$
CREATE PROCEDURE `partner_admin_get_profile_photos`(IN p_profile_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PHGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_photos', p_profile_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_PHGT_900_DB_ERROR' AS error_code, error_message;
    END;

    IF p_profile_id IS NULL OR p_profile_id = 0 THEN
        SELECT 'fail' AS status, 'Validation' AS error_type, 'PA_PHGT_901_INVALID_PROFILE' AS error_code, 'Profile ID is required' AS error_message;
    ELSE
        SELECT * FROM profile_photo 
        WHERE profile_id = p_profile_id 
          AND (softdelete IS NULL OR softdelete = 0)
        ORDER BY date_created DESC;
    END IF;
END$$

DELIMITER ;
