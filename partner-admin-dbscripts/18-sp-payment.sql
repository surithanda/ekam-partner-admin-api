DELIMITER $$

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Get all active payment plans
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_payment_plans`$$
CREATE PROCEDURE `partner_admin_get_payment_plans`()
BEGIN
    SELECT plan_id, plan_key, plan_name, stripe_product_id, stripe_price_id,
           price_cents, currency, billing_interval,
           max_profiles, max_bg_checks_per_month, max_exports_per_month,
           max_views_per_day, search_level, sort_order
    FROM partner_admin_payment_plans
    WHERE is_active = 1
    ORDER BY sort_order;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Get profile's current subscription with plan details
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_subscription`$$
CREATE PROCEDURE `partner_admin_get_subscription`(
  IN p_profile_id INT
)
BEGIN
    SELECT s.subscription_id, s.partner_id, s.profile_id, s.plan_id,
           s.stripe_subscription_id, s.stripe_customer_id,
           s.status, s.current_period_start, s.current_period_end,
           s.cancel_at_period_end, s.created_at,
           p.plan_key, p.plan_name, p.price_cents, p.currency,
           p.max_profiles, p.max_bg_checks_per_month, p.max_exports_per_month,
           p.max_views_per_day, p.search_level
    FROM partner_admin_subscriptions s
    JOIN partner_admin_payment_plans p ON s.plan_id = p.plan_id
    WHERE s.profile_id = p_profile_id AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.created_at DESC
    LIMIT 1;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Create or update subscription (profile-based)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_upsert_subscription`$$
CREATE PROCEDURE `partner_admin_upsert_subscription`(
  IN p_partner_id INT,
  IN p_profile_id INT,
  IN p_plan_id INT,
  IN p_stripe_subscription_id VARCHAR(50),
  IN p_stripe_customer_id VARCHAR(50),
  IN p_status VARCHAR(20),
  IN p_period_start DATETIME,
  IN p_period_end DATETIME,
  IN p_cancel_at_period_end TINYINT
)
BEGIN
    -- Update stripe_customer_id on partner record
    UPDATE registered_partner SET stripe_customer_id = p_stripe_customer_id
    WHERE reg_partner_id = p_partner_id AND (stripe_customer_id IS NULL OR stripe_customer_id != p_stripe_customer_id);

    -- Cancel any existing active subscriptions for this profile
    UPDATE partner_admin_subscriptions
    SET status = 'canceled', updated_at = NOW()
    WHERE profile_id = p_profile_id AND status IN ('active', 'trialing', 'past_due')
      AND (p_stripe_subscription_id IS NULL OR stripe_subscription_id != p_stripe_subscription_id);

    -- Upsert by profile_id (unique key)
    INSERT INTO partner_admin_subscriptions
      (partner_id, profile_id, plan_id, stripe_subscription_id, stripe_customer_id, status,
       current_period_start, current_period_end, cancel_at_period_end)
    VALUES
      (p_partner_id, p_profile_id, p_plan_id, p_stripe_subscription_id, p_stripe_customer_id,
       p_status COLLATE utf8mb4_general_ci, p_period_start, p_period_end, COALESCE(p_cancel_at_period_end, 0))
    ON DUPLICATE KEY UPDATE
      partner_id = p_partner_id,
      plan_id = p_plan_id,
      stripe_subscription_id = p_stripe_subscription_id,
      stripe_customer_id = p_stripe_customer_id,
      status = p_status COLLATE utf8mb4_general_ci,
      current_period_start = p_period_start,
      current_period_end = p_period_end,
      cancel_at_period_end = COALESCE(p_cancel_at_period_end, 0),
      updated_at = NOW();

    SELECT 'success' AS result;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Get credit balance for a profile
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_credits`$$
CREATE PROCEDURE `partner_admin_get_credits`(
  IN p_profile_id INT
)
BEGIN
    SELECT credit_id, partner_id, profile_id, credit_type, balance, updated_at
    FROM partner_admin_credits
    WHERE profile_id = p_profile_id;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Add credits (after purchase, profile-based)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_add_credits`$$
CREATE PROCEDURE `partner_admin_add_credits`(
  IN p_partner_id INT,
  IN p_profile_id INT,
  IN p_credit_type VARCHAR(20),
  IN p_quantity INT
)
BEGIN
    INSERT INTO partner_admin_credits (partner_id, profile_id, credit_type, balance)
    VALUES (p_partner_id, p_profile_id, p_credit_type COLLATE utf8mb4_general_ci, p_quantity)
    ON DUPLICATE KEY UPDATE balance = balance + p_quantity, updated_at = NOW();

    SELECT 'success' AS result, p_quantity AS added;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Deduct a credit (when using a feature, profile-based)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_deduct_credit`$$
CREATE PROCEDURE `partner_admin_deduct_credit`(
  IN p_profile_id INT,
  IN p_credit_type VARCHAR(20)
)
BEGIN
    DECLARE v_balance INT DEFAULT 0;

    SELECT balance INTO v_balance
    FROM partner_admin_credits
    WHERE profile_id = p_profile_id AND credit_type = p_credit_type COLLATE utf8mb4_general_ci;

    IF v_balance > 0 THEN
        UPDATE partner_admin_credits
        SET balance = balance - 1, updated_at = NOW()
        WHERE profile_id = p_profile_id AND credit_type = p_credit_type COLLATE utf8mb4_general_ci;
        SELECT 'success' AS result, (v_balance - 1) AS remaining;
    ELSE
        SELECT 'fail' AS result, 'insufficient_credits' AS error_code, 0 AS remaining;
    END IF;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Record a payment in history (profile-based)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_record_payment`$$
CREATE PROCEDURE `partner_admin_record_payment`(
  IN p_partner_id INT,
  IN p_profile_id INT,
  IN p_stripe_payment_intent_id VARCHAR(50),
  IN p_stripe_invoice_id VARCHAR(50),
  IN p_stripe_checkout_session_id VARCHAR(100),
  IN p_payment_type VARCHAR(20),
  IN p_amount_cents INT,
  IN p_currency VARCHAR(3),
  IN p_status VARCHAR(20),
  IN p_description VARCHAR(255),
  IN p_metadata JSON
)
BEGIN
    INSERT INTO partner_admin_payment_history
      (partner_id, profile_id, stripe_payment_intent_id, stripe_invoice_id, stripe_checkout_session_id,
       payment_type, amount_cents, currency, status, description, metadata)
    VALUES
      (p_partner_id, p_profile_id, p_stripe_payment_intent_id, p_stripe_invoice_id, p_stripe_checkout_session_id,
       p_payment_type COLLATE utf8mb4_general_ci, p_amount_cents, p_currency,
       p_status COLLATE utf8mb4_general_ci, p_description, p_metadata);

    SELECT LAST_INSERT_ID() AS payment_id;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Get payment history (by profile or by partner)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_payment_history`$$
CREATE PROCEDURE `partner_admin_get_payment_history`(
  IN p_partner_id INT,
  IN p_profile_id INT,
  IN p_page INT,
  IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_limit INT;
    SET v_limit = COALESCE(p_page_size, 20);
    SET v_offset = (COALESCE(p_page, 1) - 1) * v_limit;

    IF p_profile_id IS NOT NULL AND p_profile_id > 0 THEN
        SELECT COUNT(*) AS total FROM partner_admin_payment_history WHERE profile_id = p_profile_id;

        SELECT payment_id, partner_id, profile_id, stripe_payment_intent_id, stripe_invoice_id,
               stripe_checkout_session_id, payment_type, amount_cents, currency, status,
               description, metadata, created_at
        FROM partner_admin_payment_history
        WHERE profile_id = p_profile_id
        ORDER BY created_at DESC
        LIMIT v_offset, v_limit;
    ELSE
        SELECT COUNT(*) AS total FROM partner_admin_payment_history WHERE partner_id = p_partner_id;

        SELECT payment_id, partner_id, profile_id, stripe_payment_intent_id, stripe_invoice_id,
               stripe_checkout_session_id, payment_type, amount_cents, currency, status,
               description, metadata, created_at
        FROM partner_admin_payment_history
        WHERE partner_id = p_partner_id
        ORDER BY created_at DESC
        LIMIT v_offset, v_limit;
    END IF;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Track feature usage (profile-based, increment daily counter)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_track_usage`$$
CREATE PROCEDURE `partner_admin_track_usage`(
  IN p_partner_id INT,
  IN p_profile_id INT,
  IN p_feature_key VARCHAR(20)
)
BEGIN
    INSERT INTO partner_admin_feature_usage (partner_id, profile_id, feature_key, usage_date, usage_count)
    VALUES (p_partner_id, p_profile_id, p_feature_key COLLATE utf8mb4_general_ci, CURDATE(), 1)
    ON DUPLICATE KEY UPDATE usage_count = usage_count + 1, updated_at = NOW();

    SELECT 'success' AS result;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 10. Get feature usage for current period (profile-based)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_feature_usage`$$
CREATE PROCEDURE `partner_admin_get_feature_usage`(
  IN p_profile_id INT,
  IN p_feature_key VARCHAR(20),
  IN p_period_type VARCHAR(10)  -- 'daily' or 'monthly'
)
BEGIN
    IF p_period_type = 'daily' THEN
        SELECT COALESCE(SUM(usage_count), 0) AS used
        FROM partner_admin_feature_usage
        WHERE profile_id = p_profile_id
          AND feature_key = p_feature_key COLLATE utf8mb4_general_ci
          AND usage_date = CURDATE();
    ELSE
        SELECT COALESCE(SUM(usage_count), 0) AS used
        FROM partner_admin_feature_usage
        WHERE profile_id = p_profile_id
          AND feature_key = p_feature_key COLLATE utf8mb4_general_ci
          AND YEAR(usage_date) = YEAR(CURDATE())
          AND MONTH(usage_date) = MONTH(CURDATE());
    END IF;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 11. Get partner's stripe_customer_id
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_stripe_customer`$$
CREATE PROCEDURE `partner_admin_get_stripe_customer`(
  IN p_partner_id INT
)
BEGIN
    SELECT reg_partner_id, business_name, business_email, stripe_customer_id
    FROM registered_partner
    WHERE reg_partner_id = p_partner_id;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 12. Set partner's stripe_customer_id
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_set_stripe_customer`$$
CREATE PROCEDURE `partner_admin_set_stripe_customer`(
  IN p_partner_id INT,
  IN p_stripe_customer_id VARCHAR(50)
)
BEGIN
    UPDATE registered_partner SET stripe_customer_id = p_stripe_customer_id
    WHERE reg_partner_id = p_partner_id;
    SELECT 'success' AS result;
END$$

-- ────────────────────────────────────────────────────────────────────────────
-- 13. Get all subscriptions for a partner (with profile info, for overview)
-- ────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS `partner_admin_get_subscriptions_by_partner`$$
CREATE PROCEDURE `partner_admin_get_subscriptions_by_partner`(
  IN p_partner_id INT,
  IN p_page INT,
  IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_limit INT;
    SET v_limit = COALESCE(p_page_size, 20);
    SET v_offset = (COALESCE(p_page, 1) - 1) * v_limit;

    SELECT COUNT(*) AS total
    FROM partner_admin_subscriptions
    WHERE partner_id = p_partner_id AND status IN ('active', 'trialing', 'past_due');

    SELECT s.subscription_id, s.partner_id, s.profile_id, s.plan_id,
           s.stripe_subscription_id, s.stripe_customer_id,
           s.status, s.current_period_start, s.current_period_end,
           s.cancel_at_period_end, s.created_at,
           p.plan_key, p.plan_name, p.price_cents, p.currency,
           pr.first_name, pr.last_name, pr.email_id
    FROM partner_admin_subscriptions s
    JOIN partner_admin_payment_plans p ON s.plan_id = p.plan_id
    LEFT JOIN eb_profile pr ON s.profile_id = pr.profile_id
    WHERE s.partner_id = p_partner_id AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.created_at DESC
    LIMIT v_offset, v_limit;
END$$

DELIMITER ;
