-- ============================================================================
-- Partner Admin — Brand Config Stored Procedures (2 SPs)
-- Get and upsert white-label brand configuration per partner
-- ============================================================================

DELIMITER $$

-- -----------------------------------------------------------------------------
-- partner_admin_get_brand_config
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_get_brand_config`$$
CREATE PROCEDURE `partner_admin_get_brand_config`(IN p_partner_id INT)
BEGIN
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_BRGT_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_get_brand_config', p_partner_id, NOW());
        SELECT 'fail' AS status, 'SQL Exception' AS error_type, 'PA_BRGT_900_DB_ERROR' AS error_code, error_message;
    END;

    SELECT brand_config_id, partner_id, template_id, brand_name, brand_tagline,
           logo_url, logo_small_url, favicon_url, primary_color, secondary_color,
           accent_color, font_family, border_radius, sidebar_style, login_layout,
           header_style, custom_css, updated_by, created_at, updated_at
    FROM partner_brand_config
    WHERE partner_id = p_partner_id;
END$$

-- -----------------------------------------------------------------------------
-- partner_admin_upsert_brand_config
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `partner_admin_upsert_brand_config`$$
CREATE PROCEDURE `partner_admin_upsert_brand_config`(
  IN p_partner_id INT,
  IN p_template_id VARCHAR(50),
  IN p_brand_name VARCHAR(100),
  IN p_brand_tagline VARCHAR(255),
  IN p_logo_url VARCHAR(500),
  IN p_logo_small_url VARCHAR(500),
  IN p_favicon_url VARCHAR(500),
  IN p_primary_color VARCHAR(50),
  IN p_secondary_color VARCHAR(50),
  IN p_accent_color VARCHAR(50),
  IN p_font_family VARCHAR(200),
  IN p_border_radius VARCHAR(20),
  IN p_sidebar_style VARCHAR(20),
  IN p_login_layout VARCHAR(20),
  IN p_header_style VARCHAR(20),
  IN p_custom_css TEXT,
  IN p_updated_by INT
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
        CALL partner_admin_log_error('PA_BRUP_900_DB_ERROR', error_code, error_message, NULL, 'partner_admin_upsert_brand_config', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_BRUP_900_DB_ERROR' AS error_code, error_message;
    END;

    SET start_time = NOW();

    INSERT INTO partner_brand_config (
      partner_id, template_id, brand_name, brand_tagline,
      logo_url, logo_small_url, favicon_url,
      primary_color, secondary_color, accent_color,
      font_family, border_radius,
      sidebar_style, login_layout, header_style,
      custom_css, updated_by
    ) VALUES (
      p_partner_id, p_template_id, p_brand_name, p_brand_tagline,
      p_logo_url, p_logo_small_url, p_favicon_url,
      p_primary_color, p_secondary_color, p_accent_color,
      p_font_family, p_border_radius,
      p_sidebar_style, p_login_layout, p_header_style,
      p_custom_css, p_updated_by
    )
    ON DUPLICATE KEY UPDATE
      template_id = COALESCE(p_template_id, template_id),
      brand_name = COALESCE(p_brand_name, brand_name),
      brand_tagline = COALESCE(p_brand_tagline, brand_tagline),
      logo_url = COALESCE(p_logo_url, logo_url),
      logo_small_url = COALESCE(p_logo_small_url, logo_small_url),
      favicon_url = COALESCE(p_favicon_url, favicon_url),
      primary_color = COALESCE(p_primary_color, primary_color),
      secondary_color = COALESCE(p_secondary_color, secondary_color),
      accent_color = COALESCE(p_accent_color, accent_color),
      font_family = COALESCE(p_font_family, font_family),
      border_radius = COALESCE(p_border_radius, border_radius),
      sidebar_style = COALESCE(p_sidebar_style, sidebar_style),
      login_layout = COALESCE(p_login_layout, login_layout),
      header_style = COALESCE(p_header_style, header_style),
      custom_css = COALESCE(p_custom_css, custom_css),
      updated_by = p_updated_by;

    CALL partner_admin_log_activity('UPSERT', CONCAT('Brand config updated for partner: ', p_partner_id), NULL, 'partner_admin_upsert_brand_config', NULL, p_partner_id, start_time, NOW());

    SELECT 'success' AS status, NULL AS error_type,
           NULL AS error_code, NULL AS error_message,
           brand_config_id, partner_id, template_id,
           brand_name, brand_tagline, logo_url, logo_small_url, favicon_url,
           primary_color, secondary_color, accent_color,
           font_family, border_radius,
           sidebar_style, login_layout, header_style,
           custom_css, updated_by, created_at, updated_at
    FROM partner_brand_config
    WHERE partner_id = p_partner_id;
END$$

DELIMITER ;
