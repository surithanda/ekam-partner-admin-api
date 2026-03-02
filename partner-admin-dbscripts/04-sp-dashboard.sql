-- ============================================================================
-- Partner Admin — Dashboard Stored Procedures (6 SPs)
-- Metrics: profiles, payments, activity, views, accounts, recent activities
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_get_profile_metrics
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profile_metrics`$$
CREATE PROCEDURE `partner_admin_get_profile_metrics`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_DAGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_metrics', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_DAGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT
      COUNT(*) as total_profiles,
      SUM(CASE WHEN pp.is_active = 1 THEN 1 ELSE 0 END) as active_profiles,
      SUM(CASE WHEN pp.is_active = 0 THEN 1 ELSE 0 END) as inactive_profiles
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id;

    SELECT lt.id as gender_id, lt.name as gender_name, COUNT(pp.profile_id) as count
    FROM lookup_table lt
    LEFT JOIN profile_personal pp ON pp.gender = lt.id
      AND pp.account_id IN (SELECT account_id FROM account WHERE registered_partner_id = p_partner_id)
    WHERE lt.category = 'gender' AND lt.isactive = 1
    GROUP BY lt.id, lt.name
    ORDER BY lt.id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_payment_metrics
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_payment_metrics`$$
CREATE PROCEDURE `partner_admin_get_payment_metrics`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_DAGT_901_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_payment_metrics', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_DAGT_901_DB_ERROR' AS error_code, error_message;
    END;

    SELECT
      COUNT(*) as total_payments,
      SUM(spi.amount) as total_amount,
      SUM(CASE WHEN spi.payment_status = 'paid' THEN spi.amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN spi.payment_status = 'pending' THEN spi.amount ELSE 0 END) as pending_amount,
      COUNT(CASE WHEN spi.payment_status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN spi.payment_status = 'pending' THEN 1 END) as pending_count
    FROM stripe_payment_intents spi
    JOIN account a ON spi.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_activity_metrics
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_activity_metrics`$$
CREATE PROCEDURE `partner_admin_get_activity_metrics`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_DAGT_902_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_activity_metrics', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_DAGT_902_DB_ERROR' AS error_code, error_message;
    END;

    SELECT
      COUNT(*) as total_activities,
      COUNT(CASE WHEN al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as last_24h,
      COUNT(CASE WHEN al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_7d,
      COUNT(CASE WHEN al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as last_30d
    FROM activity_log al
    JOIN login l ON al.login_id = l.login_id
    JOIN account a ON l.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_profile_views_metrics
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_profile_views_metrics`$$
CREATE PROCEDURE `partner_admin_get_profile_views_metrics`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_DAGT_903_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_profile_views_metrics', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_DAGT_903_DB_ERROR' AS error_code, error_message;
    END;

    SELECT COUNT(*) as total_views,
           COUNT(CASE WHEN pv.profile_view_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as views_7d,
           COUNT(CASE WHEN pv.profile_view_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as views_30d
    FROM profile_views pv
    JOIN profile_personal pp ON pv.to_profile_id = pp.profile_id
    JOIN account a ON pp.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_account_metrics
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_account_metrics`$$
CREATE PROCEDURE `partner_admin_get_account_metrics`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_DAGT_904_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_account_metrics', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_DAGT_904_DB_ERROR' AS error_code, error_message;
    END;

    SELECT
      COUNT(*) as total_accounts,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_accounts,
      SUM(CASE WHEN is_active = 0 OR is_active IS NULL THEN 1 ELSE 0 END) as inactive_accounts,
      COUNT(CASE WHEN created_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_last_30d
    FROM account
    WHERE registered_partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_get_recent_activities
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_recent_activities`$$
CREATE PROCEDURE `partner_admin_get_recent_activities`(IN p_partner_id INT, IN p_limit INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_DALI_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_recent_activities', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_DALI_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT al.log_id, al.log_type, al.message, al.created_at, al.activity_type,
           al.ip_address, a.first_name, a.last_name, a.account_code
    FROM activity_log al
    JOIN login l ON al.login_id = l.login_id
    JOIN account a ON l.account_id = a.account_id
    WHERE a.registered_partner_id = p_partner_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END$$

DELIMITER ;
