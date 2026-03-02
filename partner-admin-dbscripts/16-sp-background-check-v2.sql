-- ============================================================================
-- Partner Admin — Background Check Tracking (Phase 7)
-- New table + 5 SPs for full lifecycle tracking
-- ============================================================================

-- ── Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `partner_admin_background_check_requests` (
  `check_id` int(11) NOT NULL AUTO_INCREMENT,
  `partner_id` int(11) NOT NULL,
  `profile_id` int(11) NOT NULL,
  `check_type` varchar(50) NOT NULL,
  `status` enum('pending','in_progress','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `requested_by` varchar(100) NOT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_by` varchar(100) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `result_summary` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `external_ref_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`check_id`),
  KEY `idx_partner_id` (`partner_id`),
  KEY `idx_profile_id` (`profile_id`),
  KEY `idx_status` (`status`),
  KEY `idx_requested_at` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELIMITER $$

-- ────────────────────────────────────────────────────────────────────────────
-- 1. partner_admin_create_background_check
--    Ownership check → INSERT
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_create_background_check`$$
CREATE PROCEDURE `partner_admin_create_background_check`(
  IN p_partner_id INT,
  IN p_profile_id INT,
  IN p_check_type VARCHAR(50),
  IN p_notes TEXT,
  IN p_external_ref_id VARCHAR(100),
  IN p_requested_by VARCHAR(100)
)
BEGIN
    DECLARE v_owner_partner INT DEFAULT NULL;
    DECLARE v_check_id INT DEFAULT NULL;
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_BCCR_900_DB_ERROR' AS error_code, error_message;
    END;

    SET start_time = NOW();

    -- Ownership check
    SELECT a.registered_partner_id INTO v_owner_partner
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE pp.profile_id = p_profile_id
    LIMIT 1;

    IF v_owner_partner IS NULL THEN
        SELECT 'fail' AS status, 'Not Found' AS error_type,
               'PA_BCCR_100_NOT_FOUND' AS error_code,
               'Profile not found' AS error_message;
    ELSEIF v_owner_partner != p_partner_id THEN
        SELECT 'fail' AS status, 'Access Denied' AS error_type,
               'PA_BCCR_300_ACCESS_DENIED' AS error_code,
               'Profile does not belong to this partner' AS error_message;
    ELSE
        INSERT INTO partner_admin_background_check_requests
            (partner_id, profile_id, check_type, status, requested_by, requested_at, notes, external_ref_id)
        VALUES
            (p_partner_id, p_profile_id, p_check_type, 'pending', p_requested_by, NOW(), p_notes, p_external_ref_id);

        SET v_check_id = LAST_INSERT_ID();

        -- Log activity
        CALL partner_admin_log_activity(
            'BACKGROUND_CHECK',
            CONCAT('Background check created: ID ', v_check_id, ', type: ', p_check_type, ', profile: ', p_profile_id),
            p_requested_by, 'partner_admin_create_background_check', NULL, NULL, start_time, NOW()
        );

        SELECT 'success' AS status, NULL AS error_type, NULL AS error_code, NULL AS error_message,
               v_check_id AS check_id;
    END IF;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 2. partner_admin_update_background_check_status
--    Update status, notes, result_summary. Sets completed_at on terminal states.
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_update_background_check_status`$$
CREATE PROCEDURE `partner_admin_update_background_check_status`(
  IN p_check_id INT,
  IN p_partner_id INT,
  IN p_new_status VARCHAR(20),
  IN p_result_summary TEXT,
  IN p_notes TEXT,
  IN p_updated_by VARCHAR(100)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_completed DATETIME DEFAULT NULL;
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_BCUP_900_DB_ERROR' AS error_code, error_message;
    END;

    SET start_time = NOW();

    SELECT COUNT(*) INTO v_exists
    FROM partner_admin_background_check_requests
    WHERE check_id = p_check_id AND partner_id = p_partner_id;

    IF v_exists = 0 THEN
        SELECT 'fail' AS status, 'Not Found' AS error_type,
               'PA_BCUP_100_NOT_FOUND' AS error_code,
               'Background check request not found' AS error_message;
    ELSE
        -- Set completed_at for terminal statuses
        IF p_new_status IN ('completed', 'failed', 'cancelled') THEN
            SET v_completed = NOW();
        END IF;

        UPDATE partner_admin_background_check_requests
        SET status = p_new_status,
            result_summary = COALESCE(p_result_summary, result_summary),
            notes = COALESCE(p_notes, notes),
            updated_by = p_updated_by,
            updated_at = NOW(),
            completed_at = COALESCE(v_completed, completed_at)
        WHERE check_id = p_check_id AND partner_id = p_partner_id;

        CALL partner_admin_log_activity(
            'BACKGROUND_CHECK',
            CONCAT('Background check updated: ID ', p_check_id, ', status: ', p_new_status),
            p_updated_by, 'partner_admin_update_background_check_status', NULL, NULL, start_time, NOW()
        );

        SELECT 'success' AS status, NULL AS error_type, NULL AS error_code, NULL AS error_message;
    END IF;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 3. partner_admin_get_background_checks_by_profile
--    List all checks for a profile (ownership verified by partner_id)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_background_checks_by_profile`$$
CREATE PROCEDURE `partner_admin_get_background_checks_by_profile`(
  IN p_profile_id INT,
  IN p_partner_id INT
)
BEGIN
    SELECT check_id, partner_id, profile_id, check_type, status,
           requested_by, requested_at, updated_by, updated_at,
           completed_at, result_summary, notes, external_ref_id
    FROM partner_admin_background_check_requests
    WHERE profile_id = p_profile_id AND partner_id = p_partner_id
    ORDER BY requested_at DESC;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 4. partner_admin_get_background_checks_by_partner
--    Paginated list with optional filters (status, check_type, date range)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_background_checks_by_partner`$$
CREATE PROCEDURE `partner_admin_get_background_checks_by_partner`(
  IN p_partner_id INT,
  IN p_status VARCHAR(20),
  IN p_check_type VARCHAR(50),
  IN p_date_from DATE,
  IN p_date_to DATE,
  IN p_search VARCHAR(100),
  IN p_page INT,
  IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_limit INT;
    SET v_limit = COALESCE(p_page_size, 20);
    SET v_offset = (COALESCE(p_page, 1) - 1) * v_limit;

    -- Total count (COLLATE utf8mb4_general_ci on params to avoid connection collation mismatch)
    SELECT COUNT(*) AS total
    FROM partner_admin_background_check_requests bcr
    LEFT JOIN profile_personal pp ON bcr.profile_id = pp.profile_id
    WHERE bcr.partner_id = p_partner_id
      AND (p_status IS NULL OR bcr.status = p_status COLLATE utf8mb4_general_ci)
      AND (p_check_type IS NULL OR bcr.check_type = p_check_type COLLATE utf8mb4_general_ci)
      AND (p_date_from IS NULL OR DATE(bcr.requested_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(bcr.requested_at) <= p_date_to)
      AND (p_search IS NULL OR p_search = ''
           OR pp.first_name LIKE CONCAT('%', p_search COLLATE utf8mb4_general_ci, '%')
           OR pp.last_name LIKE CONCAT('%', p_search COLLATE utf8mb4_general_ci, '%')
           OR CAST(bcr.profile_id AS CHAR) = p_search COLLATE utf8mb4_general_ci
           OR bcr.external_ref_id LIKE CONCAT('%', p_search COLLATE utf8mb4_general_ci, '%'));

    -- Data
    SELECT bcr.check_id, bcr.partner_id, bcr.profile_id, bcr.check_type, bcr.status,
           bcr.requested_by, bcr.requested_at, bcr.updated_by, bcr.updated_at,
           bcr.completed_at, bcr.result_summary, bcr.notes, bcr.external_ref_id,
           pp.first_name, pp.last_name, pp.email_id
    FROM partner_admin_background_check_requests bcr
    LEFT JOIN profile_personal pp ON bcr.profile_id = pp.profile_id
    WHERE bcr.partner_id = p_partner_id
      AND (p_status IS NULL OR bcr.status = p_status COLLATE utf8mb4_general_ci)
      AND (p_check_type IS NULL OR bcr.check_type = p_check_type COLLATE utf8mb4_general_ci)
      AND (p_date_from IS NULL OR DATE(bcr.requested_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(bcr.requested_at) <= p_date_to)
      AND (p_search IS NULL OR p_search = ''
           OR pp.first_name LIKE CONCAT('%', p_search COLLATE utf8mb4_general_ci, '%')
           OR pp.last_name LIKE CONCAT('%', p_search COLLATE utf8mb4_general_ci, '%')
           OR CAST(bcr.profile_id AS CHAR) = p_search COLLATE utf8mb4_general_ci
           OR bcr.external_ref_id LIKE CONCAT('%', p_search COLLATE utf8mb4_general_ci, '%'))
    ORDER BY bcr.requested_at DESC
    LIMIT v_offset, v_limit;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 5. partner_admin_get_background_check_by_id
--    Single check detail (ownership by partner_id)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_background_check_by_id`$$
CREATE PROCEDURE `partner_admin_get_background_check_by_id`(
  IN p_check_id INT,
  IN p_partner_id INT
)
BEGIN
    SELECT bcr.check_id, bcr.partner_id, bcr.profile_id, bcr.check_type, bcr.status,
           bcr.requested_by, bcr.requested_at, bcr.updated_by, bcr.updated_at,
           bcr.completed_at, bcr.result_summary, bcr.notes, bcr.external_ref_id,
           pp.first_name, pp.last_name, pp.email_id, pp.phone_mobile,
           a.account_code
    FROM partner_admin_background_check_requests bcr
    LEFT JOIN profile_personal pp ON bcr.profile_id = pp.profile_id
    LEFT JOIN account a ON pp.account_id = a.account_id
    WHERE bcr.check_id = p_check_id AND bcr.partner_id = p_partner_id
    LIMIT 1;
END$$

DELIMITER ;
