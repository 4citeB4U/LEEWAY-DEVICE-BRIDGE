/* Legacy module path retained for rollback compatibility. Active authentication is provider-neutral OIDC. */
export { createOidcAuthenticator as createPocketIdAuthenticator } from './oidc-access.mjs';
