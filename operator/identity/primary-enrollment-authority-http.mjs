/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY
TAG: LEEWAY.PRIMARY.ENROLLMENT.AUTHORITY.HTTP.V1
WHAT: Narrow HTTP boundary for an injected primary enrollment authority.
WHY: The Runtime ingress may forward a request, but the primary host must
     independently authenticate it before it can see an owner identity.
HOW: Authenticate bearer + forwarded owner subject, bound JSON, and dispatch
     only the enrollment begin/complete routes to the injected coordinator.
*/

const MAX_REQUEST_BYTES = 64 * 1024;
const OWNER_SUBJECT = /^[A-Za-z0-9_-][A-Za-z0-9_.:-]{7,127}$/;

function response(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function bearer(request) {
  return /^Bearer ([A-Za-z0-9._~-]{16,8192})$/.exec(request.headers.get('authorization') || '')?.[1];
}

async function parseBody(request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) throw Object.assign(new Error('REQUEST_BODY_TOO_LARGE'), { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_REQUEST_BYTES) throw Object.assign(new Error('REQUEST_BODY_TOO_LARGE'), { status: 413 });
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
    return value;
  } catch { throw Object.assign(new Error('REQUEST_JSON_INVALID'), { status: 400 }); }
}

function enrollmentId(pathname) {
  const match = /^\/v1\/device-enrollments\/([A-Za-z0-9][A-Za-z0-9._:-]{2,127})\/complete$/.exec(pathname);
  return match?.[1];
}

export function createPrimaryEnrollmentAuthorityHttp({ authority, requestAuthenticator } = {}) {
  if (!authority || typeof authority.beginEnrollment !== 'function' || typeof authority.completeEnrollment !== 'function') throw new Error('ENROLLMENT_AUTHORITY_REQUIRED');
  if (!requestAuthenticator || typeof requestAuthenticator.authenticate !== 'function') throw new Error('ENROLLMENT_REQUEST_AUTHENTICATOR_REQUIRED');
  return async function handlePrimaryEnrollmentRequest(request) {
    if (request.method !== 'POST') return response(405, { error: 'METHOD_NOT_ALLOWED' });
    const url = new URL(request.url);
    const ownerSubject = request.headers.get('x-leeway-owner-subject') || '';
    const token = bearer(request);
    if (!token || !OWNER_SUBJECT.test(ownerSubject)) return response(401, { error: 'INVALID_TOKEN' });
    const authenticated = await requestAuthenticator.authenticate({ request, token, ownerSubject });
    if (!authenticated || authenticated.ownerSubject !== ownerSubject) return response(403, { error: 'ENROLLMENT_ACCESS_DENIED' });
    let body;
    try { body = await parseBody(request); } catch (error) { return response(error.status || 400, { error: error.message }); }
    try {
      if (url.pathname === '/v1/device-enrollments') {
        return response(200, await authority.beginEnrollment({ ...body, ownerSubject }));
      }
      const id = enrollmentId(url.pathname);
      if (id) return response(200, await authority.completeEnrollment({ ...body, ownerSubject, enrollmentId: id }));
      return response(404, { error: 'NOT_FOUND' });
    } catch (error) {
      // Authority codes are deliberately stable and do not include keys, tokens,
      // registry internals, or approval material.
      return response(400, { error: /^[A-Z0-9_]{3,128}$/.test(error?.message || '') ? error.message : 'ENROLLMENT_AUTHORITY_REJECTED' });
    }
  };
}
