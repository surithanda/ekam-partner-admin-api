-- ============================================================================
-- Partner Admin — Seed Data: Test Users & Brand Config
-- Initial data for partner_id = 1
-- ============================================================================

-- ─── Test Users ──────────────────────────────────────────────────────────────
-- Passwords are bcrypt hashed. Plain-text values shown in comments.
--   partneradmin  → Partner@123
--   accountadmin  → Account@123
--   supportadmin  → Support@123

INSERT INTO `partner_admin_users`
  (`partner_id`, `username`, `password_hash`, `email`, `first_name`, `last_name`, `role`, `is_active`)
VALUES
  (1, 'partneradmin', '$2a$10$E3LzT4qqa/TwyRe5Hnc6quLZQXt/YArwRt0Tb.j8.gBvL9GSRaki.', 'partner@testbusiness.com',  'Partner', 'Admin',   'partner-admin', 1),
  (1, 'accountadmin', '$2a$10$39Y6ZJN7bb37NWQiiCUvyuZygVNgfbXUqvrJsP7K8KekvuMctgmu.', 'account@testbusiness.com',  'Account', 'Admin',   'account-admin', 1),
  (1, 'supportadmin', '$2a$10$z4Z/QoQ8qLgRJuEJKvMFqe9XteU8L37MDmHochU.5E4rr5o0bsZVO', 'support@testbusiness.com',  'Support', 'Admin',   'support-admin', 1)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `email` = VALUES(`email`),
  `first_name` = VALUES(`first_name`),
  `last_name` = VALUES(`last_name`),
  `role` = VALUES(`role`),
  `is_active` = VALUES(`is_active`);

-- ─── Default Brand Config (partner_id = 1) ───────────────────────────────────
INSERT INTO `partner_brand_config`
  (`partner_id`, `template_id`, `brand_name`, `brand_tagline`,
   `logo_url`, `logo_small_url`, `favicon_url`,
   `primary_color`, `secondary_color`, `accent_color`,
   `font_family`, `border_radius`,
   `sidebar_style`, `login_layout`, `header_style`,
   `custom_css`, `updated_by`)
VALUES
  (1, 'modern', 'Partner Portal', 'Manage your business',
   NULL, NULL, NULL,
   '262 83% 58%', '220 14% 96%', '262 83% 58%',
   'Inter, system-ui, sans-serif', '0.5rem',
   'standard', 'centered', 'minimal',
   NULL, 1)
ON DUPLICATE KEY UPDATE
  `template_id` = VALUES(`template_id`);
