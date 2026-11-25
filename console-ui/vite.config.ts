import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// LOCAL PREVIEW ONLY. This stub is NEVER part of a production build: it is
// registered only in dev (command === 'serve') and only when explicitly enabled
// with LEEWAY_DEV_STUB_SESSION=1. The frontend always shows the loading screen
// and the sign-in gate first; this stub is called only by an explicit sign-in
// action, never automatically. It does not grant production authority.
const devSessionStub: Plugin = {
  name: 'leeway-dev-session-stub',
  configureServer(server) {
    server.middlewares.use('/api/session', (req, res) => {
      const requested = new URL(req.url || '/', 'http://localhost').searchParams.get('requestedRole');
      const role = requested === 'customer' || process.env.LEEWAY_DEV_STUB_ROLE === 'customer'
        ? 'customer'
        : 'creator';
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      // onboarded:false forces the separate onboarding page on first sign-in.
      res.end(JSON.stringify({ authenticated: true, role, onboarded: false, displayName: 'LeeWay Owner' }));
    });
  },
};

// GitHub Pages serves the application at /LEEWAY-DEVICE-BRIDGE/.
export default defineConfig(({ command }) => ({
  base: process.env.LEEWAY_PAGES_BASE || '/LEEWAY-DEVICE-BRIDGE/',
  plugins: [
    react(),
    tailwindcss(),
    ...(command === 'serve' && process.env.LEEWAY_DEV_STUB_SESSION === '1'
      ? [devSessionStub]
      : []),
  ],
}));
