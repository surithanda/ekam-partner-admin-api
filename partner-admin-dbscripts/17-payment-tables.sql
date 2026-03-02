-- ============================================================================
-- Payment & Subscription Tables for Stripe Integration
-- ============================================================================

-- Add stripe_customer_id to registered_partner
ALTER TABLE registered_partner
  ADD COLUMN stripe_customer_id VARCHAR(50) NULL AFTER verification_status;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. payment_plans — defines available subscription plans and their limits
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `partner_admin_payment_plans` (
  `plan_id` INT AUTO_INCREMENT PRIMARY KEY,
  `plan_key` VARCHAR(20) NOT NULL UNIQUE COMMENT 'free, bronze, silver, gold',
  `plan_name` VARCHAR(50) NOT NULL,
  `stripe_product_id` VARCHAR(50) NOT NULL,
  `stripe_price_id` VARCHAR(50) NOT NULL,
  `price_cents` INT NOT NULL DEFAULT 0,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
  `billing_interval` ENUM('month','year') NOT NULL DEFAULT 'month',
  `max_profiles` INT NOT NULL DEFAULT 10 COMMENT '-1 = unlimited',
  `max_bg_checks_per_month` INT NOT NULL DEFAULT 0 COMMENT '-1 = unlimited',
  `max_exports_per_month` INT NOT NULL DEFAULT 0 COMMENT '-1 = unlimited',
  `max_views_per_day` INT NOT NULL DEFAULT 5 COMMENT '-1 = unlimited',
  `search_level` ENUM('basic','advanced') NOT NULL DEFAULT 'basic',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. partner_subscriptions — tracks active subscription per profile
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `partner_admin_subscriptions` (
  `subscription_id` INT AUTO_INCREMENT PRIMARY KEY,
  `partner_id` INT NOT NULL,
  `profile_id` INT NOT NULL,
  `plan_id` INT NOT NULL,
  `stripe_subscription_id` VARCHAR(50) NULL,
  `stripe_customer_id` VARCHAR(50) NULL,
  `status` ENUM('active','past_due','canceled','incomplete','trialing') NOT NULL DEFAULT 'active',
  `current_period_start` DATETIME NULL,
  `current_period_end` DATETIME NULL,
  `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_partner_id` (`partner_id`),
  INDEX `idx_profile_id` (`profile_id`),
  INDEX `idx_stripe_sub` (`stripe_subscription_id`),
  UNIQUE KEY `uq_profile_plan` (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. partner_credits — per-use credit balance per profile per credit type
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `partner_admin_credits` (
  `credit_id` INT AUTO_INCREMENT PRIMARY KEY,
  `partner_id` INT NOT NULL,
  `profile_id` INT NOT NULL,
  `credit_type` ENUM('bg_check','profile_export') NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_profile_credit` (`profile_id`, `credit_type`),
  INDEX `idx_partner_id` (`partner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. partner_payment_history — all payment events (subscriptions + credits)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `partner_admin_payment_history` (
  `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `partner_id` INT NOT NULL,
  `profile_id` INT NOT NULL,
  `stripe_payment_intent_id` VARCHAR(50) NULL,
  `stripe_invoice_id` VARCHAR(50) NULL,
  `stripe_checkout_session_id` VARCHAR(100) NULL,
  `payment_type` ENUM('subscription','credit_purchase','refund') NOT NULL,
  `amount_cents` INT NOT NULL DEFAULT 0,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
  `status` ENUM('succeeded','pending','failed','refunded') NOT NULL DEFAULT 'pending',
  `description` VARCHAR(255) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_partner_id` (`partner_id`),
  INDEX `idx_profile_id` (`profile_id`),
  INDEX `idx_stripe_pi` (`stripe_payment_intent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. partner_feature_usage — tracks daily/monthly usage per feature
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `partner_admin_feature_usage` (
  `usage_id` INT AUTO_INCREMENT PRIMARY KEY,
  `partner_id` INT NOT NULL,
  `profile_id` INT NOT NULL,
  `feature_key` ENUM('profile_list','bg_check','profile_export','profile_view','search') NOT NULL,
  `usage_date` DATE NOT NULL,
  `usage_count` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_profile_feature_date` (`profile_id`, `feature_key`, `usage_date`),
  INDEX `idx_partner_id` (`partner_id`),
  INDEX `idx_profile_date` (`profile_id`, `usage_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────────────────────────────────
-- Seed payment plans
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO `partner_admin_payment_plans`
  (`plan_key`, `plan_name`, `stripe_product_id`, `stripe_price_id`, `price_cents`, `currency`,
   `billing_interval`, `max_profiles`, `max_bg_checks_per_month`, `max_exports_per_month`,
   `max_views_per_day`, `search_level`, `sort_order`)
VALUES
  ('free',   'Free Plan',   'prod_U3pkSBRWpV0FmE', 'price_1T5i5HSEZxjLyGkwTXzg9zFl',    0, 'usd', 'month',  10,  0,  0,   5, 'basic',    1),
  ('bronze', 'Bronze Plan', 'prod_U3pkDHJjGA8rVc', 'price_1T5i5MSEZxjLyGkwEzrU7qKl', 2900, 'usd', 'month',  50,  5, 10,  25, 'advanced', 2),
  ('silver', 'Silver Plan', 'prod_U3pkLNeAzEFwZa', 'price_1T5i5QSEZxjLyGkwpLn8T819', 5900, 'usd', 'month', 200, 20, 50, 100, 'advanced', 3),
  ('gold',   'Gold Plan',   'prod_U3pkV9w9FVGeOH', 'price_1T5i5VSEZxjLyGkw8hsF4Z36', 9900, 'usd', 'month',  -1, 50, -1,  -1, 'advanced', 4);
