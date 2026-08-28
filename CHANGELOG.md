# Changelog

All notable changes to the Smart Document Agent will be documented in this file.

## [Unreleased]

### Added
- **Dynamic Viewport Height**: Replaced `h-screen` with `h-[100dvh]` across `App.jsx` and `LoginScreen.jsx` to prevent mobile browser address bars from obscuring the chat input box.
- **Dedicated Testing Directory**: Moved all ad-hoc AI and API testing scripts into a `backend/ai_tests/` directory to keep the root backend structure clean.

### Changed
- **Authentication Flow**: Replaced the strictly HttpOnly cookie-based JWT strategy with a dual mechanism. The `/api/v1/auth/callback` now appends the JWT as a `token` query parameter which the frontend intercepts, stores in `localStorage`, and sends via the `Authorization: Bearer` header. This resolves cross-origin cookie blocking issues on mobile browsers.
- **AI Model Upgrades**: 
  - Upgraded generative AI from `gemini-1.5-flash` (and the intermittently failing `gemini-2.5-flash`) to the fast and reliable **`gemini-3.5-flash`** across all RAG endpoints.
  - Upgraded embedding AI to **`gemini-embedding-001`**.
- **Documentation**: Overhauled `ARCHITECTURE.md`, `API_REFERENCE.md`, `README.md`, and `FEATURE_HIGHLIGHTS.md` to reflect the newest models and architectures. Added Mermaid diagrams for structural and behavioral flows.
- **Deployment**: Added `docs/DEPLOYMENT.md` for Render and Vercel hosting instructions.

### Fixed
- **Mobile Chat Cutoff**: Fixed an issue where the chat input box was unreachable on mobile devices (iOS/Android Safari & Chrome).
- **503 Unavailable Errors**: Mitigated "high demand" errors during generation by migrating models.
- **Python Type Hints**: Removed Python 3.9+ specific type hints (`dict[str, str]`) in `rag_service.py` in favor of `typing.Dict` to ensure runtime compatibility on Render deployments running older Python versions.
- **Login Screen JSX**: Fixed a premature `</div>` closure that was breaking the animated background orbs on the login screen.
