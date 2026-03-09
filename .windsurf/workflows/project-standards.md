---
description: Project coding and implementation standards for EKam Partner Admin
---
Use this workflow whenever implementing or modifying features in the EKam Partner Admin API or UI.

1. Understand the existing pattern first.
   - Identify the authoritative files before changing code.
   - Follow the current architecture: route -> controller -> datalayer -> ado -> stored procedure / DB.
   - Reuse existing helpers, context providers, shared UI components, and utilities where possible.

2. Use the correct theme and layout conventions.
   - Do not hardcode colors like `text-gray-*`, `bg-white`, `border-gray-*`, or `text-blue-*` unless the surrounding file already intentionally uses a fixed semantic style.
   - Prefer theme tokens and shared design classes such as:
     - `bg-background`
     - `bg-card`
     - `text-foreground`
     - `text-muted-foreground`
     - `border-border`
     - `border-input`
     - `bg-muted`
     - `bg-primary`
     - `text-primary`
     - `text-primary-foreground`
   - Ensure new admin pages visually match the existing template system and `BrandContext` behavior.
   - Prevent header overlap and scrolling issues by respecting the existing layout shell structure, spacing, sticky header offsets, and container padding.

3. Follow standard logging practices.
   - Use the existing logging style already present in the codebase.
   - Add logs only when they help debug meaningful execution paths, failures, external API calls, or lifecycle transitions.
   - Avoid noisy console statements in production UI code.
   - Keep log messages consistent, actionable, and scoped to the module.

4. Follow standard error handling.
   - Use the project error handling flow instead of throwing raw generic errors when a standardized error exists.
   - Prefer `createAppError(...)` and the established error response format.
   - Validate required IDs and inputs early.
   - Return user-safe messages while preserving useful internal detail through the standard backend error layer.

5. Manage error codes properly.
   - When adding a new module or feature area, check whether corresponding entries exist in `partner_admin_error_codes`.
   - Add missing error codes for validation, not found, access denied, and system failures as appropriate.
   - Keep error code naming consistent with module prefixes.
   - Reuse existing codes where correct instead of creating duplicates.

6. Testing is required for meaningful changes.
   - Add unit tests for isolated business logic, helpers, parsing, and validation rules.
   - Add integration tests for end-to-end API behavior, controller flows, and important success/failure paths.
   - Cover regressions for bugs being fixed.
   - Do not leave new logic untested when test infrastructure already exists for that area.

7. Use MCP tools when appropriate.
   - Use MySQL MCP for database verification, migrations, and direct DB inspection when needed.
   - Use Stripe MCP for Stripe resource inspection and payment-related admin tasks when appropriate.
   - Prefer MCP or built-in code tools over ad hoc workarounds when they are the correct tool for the task.

8. Follow database and API standards.
   - Keep stored procedure usage consistent with the rest of the codebase.
   - Preserve response shapes expected by the UI.
   - Maintain partner/account/profile ownership checks and role-aware behavior.
   - Avoid breaking existing API contracts unless the change is intentional and all consumers are updated.

9. Follow UI implementation standards.
   - Match existing page structure, spacing, table styling, modal patterns, and state handling.
   - Handle loading, empty, success, and error states explicitly.
   - Use safe guards for nullable or JSON-derived values before rendering collections.
   - Preserve pagination, filters, and search behavior consistency across admin pages.

10. Before finishing any feature or fix.
   - Check whether theme styling is consistent.
   - Check whether error codes and error handling are complete.
   - Check whether logs are appropriate.
   - Check whether tests should be added or updated.
   - Check whether related docs or feature summaries should be updated.
