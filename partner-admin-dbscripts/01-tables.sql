-- ============================================================================
-- Partner Admin — Table Definitions
-- Database: matrimony_services
-- Tables:   6 (partner_admin_* + partner_brand_config)
-- ============================================================================

-- 1. Partner Admin Users
CREATE TABLE IF NOT EXISTS `partner_admin_users` (
  `partner_admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `partner_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('partner-admin','account-admin','support-admin') NOT NULL DEFAULT 'support-admin',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`partner_admin_id`),
  UNIQUE KEY `uq_partner_username` (`partner_id`,`username`),
  KEY `idx_username` (`username`),
  KEY `idx_partner_id` (`partner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Partner Admin Audit Log
CREATE TABLE IF NOT EXISTS `partner_admin_audit_log` (
  `audit_id` int(11) NOT NULL AUTO_INCREMENT,
  `partner_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `request_body` text DEFAULT NULL,
  `previous_data` text DEFAULT NULL,
  `new_data` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`audit_id`),
  KEY `idx_partner_id` (`partner_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Partner Admin Error Codes
CREATE TABLE IF NOT EXISTS `partner_admin_error_codes` (
  `error_code` varchar(50) NOT NULL,
  `module` varchar(20) NOT NULL,
  `operation` varchar(20) NOT NULL,
  `http_status` int(11) NOT NULL DEFAULT 500,
  `error_type` varchar(30) NOT NULL,
  `default_message` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`error_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Partner Admin Error Log
CREATE TABLE IF NOT EXISTS `partner_admin_error_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_code` varchar(50) DEFAULT NULL,
  `sql_errno` int(11) DEFAULT NULL,
  `error_message` varchar(500) DEFAULT NULL,
  `context_user` varchar(150) DEFAULT NULL,
  `source_name` varchar(100) NOT NULL,
  `partner_id` int(11) DEFAULT NULL,
  `request_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `stack_trace` text DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_error_code` (`error_code`),
  KEY `idx_partner_id` (`partner_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Partner Admin Activity Log
CREATE TABLE IF NOT EXISTS `partner_admin_activity_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action_type` varchar(20) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `context_user` varchar(150) DEFAULT NULL,
  `source_name` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `partner_id` int(11) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `execution_ms` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_partner_id` (`partner_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Partner Brand Config
CREATE TABLE IF NOT EXISTS `partner_brand_config` (
  `brand_config_id` int(11) NOT NULL AUTO_INCREMENT,
  `partner_id` int(11) NOT NULL,
  `template_id` varchar(50) NOT NULL DEFAULT 'modern',
  `brand_name` varchar(100) DEFAULT NULL,
  `brand_tagline` varchar(255) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `logo_small_url` varchar(500) DEFAULT NULL,
  `favicon_url` varchar(500) DEFAULT NULL,
  `primary_color` varchar(50) DEFAULT '262 83% 58%',
  `secondary_color` varchar(50) DEFAULT '220 14% 96%',
  `accent_color` varchar(50) DEFAULT '262 83% 58%',
  `font_family` varchar(200) DEFAULT 'Inter, system-ui, sans-serif',
  `border_radius` varchar(20) DEFAULT '0.5rem',
  `sidebar_style` enum('standard','slim','dark','branded') DEFAULT 'standard',
  `login_layout` enum('centered','split','fullscreen') DEFAULT 'centered',
  `header_style` enum('minimal','branded','compact') DEFAULT 'minimal',
  `custom_css` text DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`brand_config_id`),
  UNIQUE KEY `uk_partner_brand` (`partner_id`),
  KEY `idx_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
