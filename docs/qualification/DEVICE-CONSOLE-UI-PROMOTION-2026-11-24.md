# Device Console UI Promotion — qualification record (2026-11-24)

**Status:** source prepared, tested, PR submitted — **not merged, not published**
**Authoritative UI source:** `C:\Users\Leona\Downloads\leeway-device-bridge-onboarding-clean\leeway-work`
**Canonical repository:** `4citeB4U/LEEWAY-DEVICE-BRIDGE`
**Integration base:** `origin/main` @ `d6e81eb304290f911c03915a268ba16e7e918180`

## 1. Security entry contract (Creator requirement)

Every application entry now follows this order, with no bypass:

1. **Loading screen** — full LeeWay Industries logo, screen-reader-only announcement, minimum display window (`VITE_LEEWAY_MIN_LOADING_MS`, default 900 ms).
2. **Sign-in / sign-up gate** — Creator Sign In, Customer Sign In, Accept Invitation, Connect Another Device. No session is read from a cookie, URL, localStorage or browser-local setting.
3. **Separate onboarding page** — shown for any signed-in identity that has not completed setup. Four steps: your identity (name), your workspace, your devices, review & finish. This page is distinct from the gate and from the dashboard.
4. **Workspace** — Creator dashboard or Customer workspace, reachable only after verified sign-in **and** completed onboarding.

`useLeeWaySession` accepts a session only after an explicit sign-in action calls the approved server endpoint and receives `{ authenticated: true, role, onboarded }`. Denials clear all state and return to the gate.

## 2. Changed-file inventory

Added under `console-ui/` (full React/Vite source, local `.env` and `node_modules` excluded):

- `console-ui/package.json`, `console-ui/package-lock.json`, `console-ui/tsconfig.json`, `console-ui/vite.config.ts`, `console-ui/index.html`, `console-ui/README.md`, `console-ui/.gitignore`, `console-ui/.env.example`
- `console-ui/src/App.tsx`, `console-ui/src/main.tsx`, `console-ui/src/index.css`
- `console-ui/src/hooks/useLeeWaySession.ts`
- `console-ui/src/data/bridgeData.ts`, `console-ui/src/utils/telemetryLogic.ts`, `console-ui/src/utils/telemetryLogic.test.ts`
- `console-ui/src/components/`: `AboutBridgeModal.tsx`, `BridgeScene.tsx`, `ContactSection.tsx`, `ContractDrawer.tsx`, `DeviceBridge3D.tsx`, `LeeWayBrand.tsx`, `OnboardingGate.tsx`, `OnboardingPage.tsx`, `OperationsMatrix.tsx`, `PlatformWorkstations.tsx`, `StatusBadge.tsx`, `TelemetryCharts.tsx`, `VirtualTabletPreview.tsx`
- `console-ui/public/assets/leeway-industries-mark.png` (490,683 bytes), `console-ui/public/assets/leeway-lock-emblem.png` (2,443,239 bytes)
- `console-ui/docs/qualification/ONBOARDING-UI-2026-11-24.md`

Repo-level additions:

- `.github/workflows/device-console-ui-pages.yml`
- `tests/console-ui-promotion.test.mjs`
- `docs/qualification/DEVICE-CONSOLE-UI-PROMOTION-2026-11-24.md`

**Nothing deleted or replaced:** `apps/`, `clients/` (native Android/Apple), `contracts/`, `operator/`, `api/`, `packages/`, `providers/`, `workstation/`, `receipts/`, `registry/`, all 21 pre-existing workflows, `SECURITY.md`, `ARCHITECTURE.md`, `AGENTS.md`, `docs/downloads/*`, and the Gate 2/3 transport work on its own owning branch/PR.

## 3. GitHub Pages publishing path

- Live root `index.html` is a meta-refresh redirect to `./docs/`; the legacy console is served at `/docs/`, APK downloads at `/docs/downloads/`.
- Vite base is `/LEEWAY-DEVICE-BRIDGE/` (site-root absolute). The new workflow builds with that exact base and publishes `console-ui/dist` as the Pages artifact.
- To preserve the legacy APK URLs, the workflow copies `docs/downloads/leeway-device-bridge-android-latest.json` and `...-debug.apk` into `console-ui/dist/docs/downloads/` before upload.
- **Creator action still required:** the Pages source must be set to GitHub Actions. No settings change or deployment was performed here.

## 4. Development stub exclusion

`vite.config.ts` registers the session stub only when `command === 'serve'` **and** `LEEWAY_DEV_STUB_SESSION=1`. The promotion workflow explicitly fails if that variable is `1` and never sets it. `.env` is not committed. The stub returns `onboarded:false` so local preview also exercises the full onboarding page.

## 5. Tests executed (observed)

```
console-ui: npm install --no-audit --no-fund      -> added 69 packages
console-ui: npm run lint (tsc --noEmit)           -> PASS
console-ui: npm run build, LEEWAY_PAGES_BASE set  -> PASS, 1680 modules, 275ms
node --test tests/console-ui-promotion.test.mjs   -> 9/9 PASS
node --check docs/dashboard-ui.js                 -> exit 0
node --test tests/device-dashboard-ui.test.mjs    -> 4/4 PASS
node tests/apple-pwa-source.test.mjs              -> PASS
```

Asset checks: built `dist/index.html` references `/LEEWAY-DEVICE-BRIDGE/assets/...`; both CSS and JS and both brand PNGs present. Chunk warning ~962 kB > 500 kB is pre-existing three.js footprint, not addressed in this scope.

Browser-verified on the local preview (`http://localhost:3000/LEEWAY-DEVICE-BRIDGE/`): loading screen, sign-in gate with four actions, then a distinct four-step onboarding page. The dashboard is no longer reachable without explicit sign-in and onboarding.

## 6. Unresolved gates (recorded separately)

- **Gate 1 signer:** `OWNER_APPROVED_SIGNER_NOT_PRESENT`. No key, passport, enrollment, issuer or registry change.
- **Gate 3 transport:** draft PR #137 source only; not wired into the live managed gateway.
- **Production:** no merge, no Pages deployment, no settings change, no live URL change.
- **Auth backend:** no real Zitadel/Runtime session endpoint configured; `VITE_LEEWAY_*_URL` values remain blank in `.env.example`.
- **Contact email:** `leonard.lee@leewayindustrues.com` remains an unverified reference, shown as text only, no `mailto:` link. Not committed in `.env`.
- **Trademark/fidelity:** exact reference logo source files were unavailable; brand marks are LeeWay-owned local assets.

Publishing this UI does **not** approve Gate 1, live device transport, native execution, customer registration, or CRM/ERP integration.

## 7. Rollback

Revert the promotion commit on the integration branch. No live service, Pages site, device, key, receipt or registry was changed. The original canonical worktree with its pre-existing local edits was left untouched.
