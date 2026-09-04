# Contributing to Have-it Super-App

Thank you for your interest in contributing to **Have-it**!  
To ensure a smooth, secure, and productive workflow, please review the guidelines below before creating issues or opening pull requests.

---

## 🛠️ Code of Conduct

- Be respectful, constructive, and inclusive.
- Report security issues privately (never open a public issue containing credentials or vulnerabilities).

---

## 🌿 Branching & Git Workflow

1. **Fork or Branch**:
   - Create a feature branch off `main`:
     ```bash
     git checkout -b feature/your-feature-name
     # or
     git checkout -b fix/bug-description
     ```
2. **Commit Conventions**:
   Use clear, conventional commit messages:
   - `feat(chat): add voice note playback scrubber`
   - `fix(user): correct typo in mongoose schema`
   - `docs(deployment): update play store testing checklist`
   - `refactor(post): optimize feed aggregation query`

---

## 🛡️ Security & Secret Protection

> [!CAUTION]
> **NEVER commit any `.env` or `.env.local` files, API keys, database credentials, JWT secrets, or keystores.**  
> Always use `.env.example` templates to demonstrate required variables without real credentials.

Before committing, always check `git status` to ensure no sensitive files are staged.

---

## 🧪 Code Quality & Verification

Before submitting a Pull Request:

1. **Lint & Type Check**:
   - Make sure all TypeScript files compile cleanly (`npm run build` in each service).
   - Ensure ESLint passes in `frontend` and `admin` (`npm run lint`).
2. **Run the Diagnostic Health Check**:
   ```bash
   node scripts/system_health_check.js
   ```
   Ensure all automated checks report `PASS`.

---

## 📬 Submitting a Pull Request (PR)

1. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch.
3. Provide a clear description of:
   - What changed and why.
   - Screenshots / screen recordings (for UI changes).
   - How you tested your changes.
