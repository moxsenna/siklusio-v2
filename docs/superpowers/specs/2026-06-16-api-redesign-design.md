# Design Spec: Siklusio API Reference Refactor

Refactoring the Siklusio API Reference documentation (`docs/API.md`) to follow the premium, user-friendly, and code-rich style of the GenreX API documentation.

## Proposed Changes

### docs/API.md

- **Overview & Structure:** Reorganized with modern headings and GitHub-flavored callouts.
- **Authentication Policies:** Highlighted with tables and details on Supabase JWT bearer tokens.
- **Code Snippets:** Fully developed sequential Node.js and Python code snippets showing how to:
  - Register checkout (`POST /api/checkout/register`)
  - Request cycle guide generation (`POST /api/cycle-guide/generate`)
  - Get today's cycle guide (`GET /api/cycle-guide/today`)
  - Request calming reassurance letter (`POST /api/generate-calming-reassurance`)
  - Check credits balance (`GET /api/ai/credits`)
- **Endpoint Reference:** Enhanced parameter list with descriptive markdown tables showing types, requirements, and responses.
- **Error Handling:** Formatted HTTP error tables.

## Verification Plan

- Verify markdown rendering syntax.
- Verify correctness of generated Node.js (`axios`) and Python (`requests`) code snippets.
