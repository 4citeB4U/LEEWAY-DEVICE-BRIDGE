/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.CI.TEST
TAG: CONSOLE-UI-PROMOTION-CONTRACT-TEST.V1
WHAT = Prove the promoted React UI preserves canonical contracts, native source and fail-closed auth.
WHY  = A public UI replacement must not delete native adapters, device contracts, workflows or
       the Gate 2/3 transport work, and must not enable a development session stub in production.
HOW  = Dependency-free Node source assertions over the checked-out tree.
AUTHORITY: Source CI only; not live Runtime, device or production approval.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

test('canonical native, contract, workflow and transport source is preserved', () => {
  const preserved = [
    'apps', 'clients', 'contracts', 'operator', 'receipts', 'registry',
    'api', 'packages', 'providers', 'workstation',
    '.github/workflows/device-console-ui.yml',
    '.github/workflows/verify-device-bridge-pages-apk.yml',
    'SECURITY.md', 'ARCHITECTURE.md', 'AGENTS.md',
  ];
  for (const rel of preserved) {
    assert.ok(exists(rel), `missing preserved path: ${rel}`);
  }
  // Gate 2/3 transport work lives in the owning PR branch; this promotion must not shadow it.
  assert.ok(!exists('console-ui/operator/transport'), 'must not create a parallel transport authority');
});

test('required UI components are present', () => {
  const required = [
    'console-ui/src/App.tsx',
    'console-ui/src/components/LeeWayBrand.tsx',
    'console-ui/src/components/OnboardingGate.tsx',
    'console-ui/src/components/OnboardingPage.tsx',
    'console-ui/src/components/BridgeScene.tsx',
    'console-ui/src/components/DeviceBridge3D.tsx',
    'console-ui/src/components/TelemetryCharts.tsx',
    'console-ui/src/components/PlatformWorkstations.tsx',
    'console-ui/src/components/ContractDrawer.tsx',
    'console-ui/src/components/ContactSection.tsx',
    'console-ui/src/components/VirtualTabletPreview.tsx',
    'console-ui/src/hooks/useLeeWaySession.ts',
    'console-ui/public/assets/leeway-industries-mark.png',
    'console-ui/public/assets/leeway-lock-emblem.png',
  ];
  for (const rel of required) assert.ok(exists(rel), `missing UI source: ${rel}`);
});

test('authentication is fail-closed and always routes loading then sign-in then onboarding', () => {
  const hook = read('console-ui/src/hooks/useLeeWaySession.ts');
  assert.match(hook, /useState<SessionStatus>\('checking'\)/, 'starts in loading state');
  assert.match(hook, /setStatus\('unverified'\)/, 'always lands on sign-in gate');
  assert.match(hook, /explicit sign-in action/, 'requires explicit sign-in');
  assert.doesNotMatch(hook, /(?:window\.)?localStorage\s*[.[]/, 'no browser-local session promotion');
  assert.doesNotMatch(hook, /URLSearchParams.*role.*verified/, 'no URL-driven verification');

  const app = read('console-ui/src/App.tsx');
  assert.match(app, /session\.status !== 'verified'/, 'gate shown until verified');
  assert.match(app, /!session\.onboarded/, 'onboarding page required before workspace');
  assert.match(app, /<OnboardingPage/, 'distinct onboarding page wired');
});

test('development session stub is excluded from production builds', () => {
  const vite = read('console-ui/vite.config.ts');
  assert.match(vite, /command === 'serve'/, 'stub is dev-server only');
  assert.match(vite, /LEEWAY_DEV_STUB_SESSION/, 'stub requires explicit opt-in');
  assert.ok(!exists('console-ui/.env'), 'local .env must not be committed');
  const wf = read('.github/workflows/device-console-ui-pages.yml');
  assert.match(wf, /DEV_STUB_MUST_NOT_BE_ENABLED_IN_PRODUCTION/, 'workflow denies stub in production');
  assert.doesNotMatch(wf, /LEEWAY_DEV_STUB_SESSION:\s*['"]?1/, 'workflow never enables stub');
});

test('Pages publishing path preserves legacy APK URLs', () => {
  const wf = read('.github/workflows/device-console-ui-pages.yml');
  assert.match(wf, /LEEWAY_PAGES_BASE: \/LEEWAY-DEVICE-BRIDGE\//, 'canonical Vite base');
  assert.match(wf, /console-ui\/dist\/docs\/downloads/, 'legacy URL subdirectory preserved');
  assert.ok(exists('docs/downloads/leeway-device-bridge-android-latest.json'));
  assert.ok(exists('docs/downloads/leeway-device-bridge-android-latest-debug.apk'));
});

test('no unapproved third-party model service or API-key dependency', () => {
  const pkg = JSON.parse(read('console-ui/package.json'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const name of Object.keys(deps)) {
    assert.doesNotMatch(name, /gemini|google-ai|generative-ai|openai|anthropic/i, `unapproved dep: ${name}`);
  }
  const src = fs.readdirSync(path.join(ROOT, 'console-ui/src'), { recursive: true })
    .filter((f) => /\.(tsx?|css)$/.test(String(f)))
    .map((f) => read(path.join('console-ui/src', String(f))))
    .join('\n');
  assert.doesNotMatch(src, /AIza[0-9A-Za-z_-]{10,}/, 'no AI Studio key literal');
  assert.doesNotMatch(src, /GEMINI_API_KEY|GOOGLE_AI_API_KEY/, 'no model API key env');
});

test('responsive layout and reduced-motion support are preserved', () => {
  const css = read('console-ui/src/index.css');
  assert.match(css, /@media \(max-width: 1100px\)/, 'tablet breakpoint');
  assert.match(css, /@media \(max-width: 620px\)/, 'mobile breakpoint');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'reduced motion');
  const gate = read('console-ui/src/components/OnboardingGate.tsx');
  assert.match(gate, /className="lw-cards"/, 'gate uses responsive card grid');
  assert.match(css, /\.lw-cards \{ grid-template-columns: 1fr; \}/, 'single-column mobile layout');
  const tablet = read('console-ui/src/components/VirtualTabletPreview.tsx');
  assert.match(tablet, /frameSize === 'mobile'/, 'mobile tablet frame');
});

test('authorization denial paths fail closed', () => {
  const hook = read('console-ui/src/hooks/useLeeWaySession.ts');
  assert.match(hook, /if \(!endpoint\)[\s\S]{0,120}setStatus\('unverified'\)/, 'no endpoint denies');
  assert.match(hook, /SIGN_IN_ENDPOINT_DENIED/, 'endpoint failure denies');
  assert.match(hook, /SIGN_IN_NOT_VERIFIED/, 'malformed or wrong-role response denies');
  assert.match(hook, /setSession\(null\)/, 'denial clears session');
  const app = read('console-ui/src/App.tsx');
  assert.match(app, /session\.status !== 'verified'/, 'unverified cannot reach workspace');
  assert.match(app, /session\.role !== 'creator'/, 'customer cannot reach Creator console');
});

test('contact email remains an unverified reference, not an active link', () => {
  const contact = read('console-ui/src/components/ContactSection.tsx');
  assert.match(contact, /reference only/, 'email marked as reference');
  assert.doesNotMatch(contact, /mailto:/, 'no active mail link');
  assert.ok(!exists('console-ui/.env'), 'no unverified address shipped in env');
});

test('onboarding completion requires Runtime write and readback', () => {
  const hook = read('console-ui/src/hooks/useLeeWaySession.ts');
  const page = read('console-ui/src/components/OnboardingPage.tsx');
  const env = read('console-ui/.env.example');
  assert.match(hook, /ONBOARDING_WRITE_DENIED/);
  assert.match(hook, /ONBOARDING_READBACK_UNVERIFIED/);
  assert.match(hook, /method: 'POST'/);
  assert.match(hook, /credentials: 'include'/);
  assert.match(hook, /ONBOARDING_CSRF_UNAVAILABLE/);
  assert.match(hook, /approvedRuntimeUrl/);
  assert.match(hook, /setSession\(\{ \.\.\.session, onboarded: true/);
  assert.doesNotMatch(hook, /setSession\(\(current\) => current && current\.authenticated[\s\S]*?onboarded: true/);
  assert.match(page, /saving: boolean/);
  assert.match(page, /error: string \| null/);
  assert.match(env, /VITE_LEEWAY_ONBOARDING_URL=/);
  assert.match(env, /VITE_LEEWAY_API_ORIGIN=/);
});

test('real package links and explicit native signing status prevent false downloads', () => {
  const ui = read('console-ui/src/components/PlatformWorkstations.tsx');
  const lanes = read('console-ui/src/data/bridgeData.ts');
  assert.match(ui, /leeway-device-bridge-android-latest-debug\.apk/);
  assert.match(ui, /Download test APK \(debug\)/);
  assert.match(ui, /LeeWayDeviceBridge-unsigned\.ipa/);
  assert.match(ui, /Download unsigned IPA \(developer\)/);
  assert.match(ui, /No published signed native/);
  assert.match(lanes, /Unsigned IPA · Install not qualified/);
  assert.match(lanes, /Debug APK · Production signing unverified/);
  assert.match(lanes, /Native Linux installer not published/);
  assert.doesNotMatch(lanes, /Apple Package: Qualified/);
  const manifest = JSON.parse(read('docs/package-manifest.json'));
  assert.equal(manifest.packages.find(p => p.platform === 'android').channel, 'development');
  assert.match(manifest.packages.find(p => p.platform === 'android').downloadUrl, /-debug\.apk$/);
  assert.match(manifest.packages.find(p => p.platform === 'ios').downloadUrl, /unsigned\.ipa$/);
});
