# Swaptics Dependency Vulnerability Audit & Triage

**Assessment Date:** 23 August 2026  
**Auditor / Tool:** `npm audit` (GHSA advisory database)  
**CI Release Gate:** `npm run audit` (`npm audit --audit-level=high`)

---

## 1. Executive Summary

A comprehensive automated package advisory scan was performed on all direct and transitive dependencies in `package.json` and `package-lock.json`. 

Key devDependencies (build tools like `rollup`, `esbuild`, `vitest`, `postcss`, and `supabase` CLI) and transitive libraries were scanned. Automated remediation (`npm audit fix`) was applied to resolve direct vulnerabilities.

---

## 2. Advisory Triage & Risk Assessment

| Package | Severity | Category | Risk in Production Client Build | Action Taken |
|---------|----------|----------|---------------------------------|--------------|
| `rollup` | High | Path traversal | **None** (build-time bundler only, not shipped to browser) | Updated via `npm audit fix` |
| `vitest` | Critical | Dev UI server file read | **None** (test runner only, excluded from production bundles) | Updated via `npm audit fix` |
| `supabase` (CLI) / `tar` | Critical | Archive parser / CLI tool | **None** (developer CLI tool for migrations and types) | Upgraded CLI package |
| `flatted`, `js-yaml`, `glob` | High | Dev-tooling transitive | **None** (transitive dependencies of test/lint tools) | Updated via `npm audit fix` |
| `nanoid`, `picomatch` | High | Build utilities | **None** (used during static analysis and code generation) | Updated via `npm audit fix` |

---

## 3. Continuous Monitoring & Release Gate

1. **Automated CI Script**: Added `"audit": "npm audit --audit-level=high"` to `package.json`.
2. **Pull Request Policy**: Any newly introduced production runtime dependency with a High or Critical advisory blocks merge until remediated or documented as an accepted risk.
3. **Lockfile Integrity**: Lockfile updates (`package-lock.json`) are committed and tested against test suite (`npm test`) and build verification (`npm run build`).
