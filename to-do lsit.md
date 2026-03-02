add logging for all the endpoints
add validation for all the endpoints
add security for all the endpoints
Code quality check
Code coverage tests



COMPLETING:
need to implement full functionality for profile management. we need to use existing procedures for the below functionality implementation.
- view profile
- edit profile
- delete profile
- add profile
- search profile
- filter profile
- export profile
- import profile

We have procedures. Review them carefully before prepare the plan. This will be a big and key implementation. So carefully review and understand existing procedures to create or manage a profile from backend. 




COMPLETED - 
Add unit test cases for all the endpoints
add mock data for all the endpoints
add integration test cases for all the endpoints


COMPLETED - 
Need to add extensive error handling in admin API 
add error codes in each procedure. use standard error codes and provide custom error codes for each functionality. By looking these error codes we should be able to understand the error is from which procedure and which functionality.

COMPLETED - 
instead of using jest, why don't we use node:test + node:mock, with Sinon for for better mocking and intergration tests with DB, API and other external APIs integrations.
add mock data for end to end testing
add unit tests for each layer
add integration tests for admin api



COMPLETED- Cleanup all the dead code and files.

COMPLETED- implement reset password functionality- not suggested forgot password as number of users are limited.

COMPLETED- admin users functionality should list all user related to logged in partner. It should be displayed only partner-admin.

COMPLETD below features:
Phase	Scope	Effort
Phase 1	partner_brand_config table + API + BrandContext (replace ThemeContext)	~2 hours
Phase 2	3 sidebar variants + 3 login variants + 2 header variants + LayoutShell	~3 hours
Phase 3	Brand Settings UI page (logo upload, template picker, live preview)	~2 hours
Phase 4	6 full template presets wired together	~1 hour
Phase 5	Favicon injection, <title> from brand, custom CSS support


Key Design Principles
CSS variables are king — 90% of visual change is just swapping --primary, --font-family, etc. No component rewrites needed.
Composition over duplication — 3 sidebar variants × 3 header variants × 3 login layouts = 27 combinations from just 9 small components.
Server-driven config — partner-admin saves once, all users see it. No localStorage race conditions.
Zero-deploy white-labeling — partner changes template, it takes effect instantly. No CI/CD needed.
Progressive enhancement — customCss field allows per-partner CSS tweaks without touching code.





{
  "mcpServers": {
    "mysql": {
      "args": [
        "C:/GIT 2026/Mar2026/partner-admin-v3/mcp/mysql/mysql-mcp-server.js"
      ],
      "command": "node",
      "env": {
        "MYSQL_CONNECTIONS": "{\"remote\":{\"host\":\"65.254.80.213\",\"user\":\"admin-test\",\"password\":\"January@2026\",\"database\":\"matrimony_services\",\"port\":3306}}"
      }
    },
    "stripe": {
      "args": [
        "-y",
        "@stripe/mcp",
        "--tools=all",
        "--api-key=<STRIPE_SECRET_KEY>"
      ],
      "command": "npx",
      "env": {}
    },
    "vercel": {
      "headers": {},
      "serverUrl": "https://mcp.vercel.com"
    }
  }
}