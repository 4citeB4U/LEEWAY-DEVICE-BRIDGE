/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.ZITADEL.RESOURCE.JWT.TEST
WHO: LeeWay Industries
WHAT: In-memory RSA JWT authentication acceptance and denial tests
WHY: A configured issuer never implies unsigned or wrong-audience authority
WHERE: tests/mcp/zitadel-access.test.mjs
WHEN: 2026-10-26
HOW: Generate ephemeral test RSA key + signed JWT + mocked metadata
AUTHORITY: Test-only fixture; not live Zitadel enrollment
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createZitadelAuthenticator } from '../../operator/identity/zitadel-access.mjs';

test('Zitadel API JWT requires valid issuer, audience, owner and permission', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const issuer = 'https://identity.example.test:10000';
  const resource = 'https://bridge.example.test/mcp';
  const now = 1792987200000;
  const fetchImpl = async url => ({
    ok: true,
    json: async () => String(url).endsWith('openid-configuration')
      ? { issuer, jwks_uri: issuer + '/.well-known/jwks.json' }
      : { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'RS256', use: 'sig' }] },
  });
  const auth = createZitadelAuthenticator({ issuer, resource, ownerSubject: 'owner-123', fetchImpl, now: () => now });
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = extra => {
    const claims = {
      iss: issuer, sub: 'owner-123', aud: resource,
      scope: 'openid device.bridge.read', iat: now / 1000 - 30, exp: now / 1000 + 300,
      ...extra,
    };
    const message = encode({ kid: 'fixture-key', alg: 'RS256', typ: 'at+jwt' }) + '.' + encode(claims);
    return message + '.' + sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64url');
  };
  const req = value => ({ headers: { authorization: 'Bearer ' + value } });
  assert.equal(await auth(req(token())), true);
  assert.equal(await auth(req(token({ iss: 'https://wrong.example.test' }))), false);
  assert.equal(await auth(req(token({ aud: 'https://wrong.example.test/mcp' }))), false);
  assert.equal(await auth(req(token({ sub: 'another-owner' }))), false);
  assert.equal(await auth(req(token({ scope: 'openid' }))), false);
  assert.equal(await auth(req(token({ scope: 'openid device.discovery.read' }))), true);
  assert.equal(await auth(req(token({
    scope: 'openid',
    'urn:zitadel:iam:org:project:roles': { 'device.bridge.read': {} }
  }))), true);
  assert.equal(await auth(req(token({
    scope: 'openid',
    'urn:zitadel:iam:org:project:roles': { 'device.bridge.execute': {} }
  }))), false);
  assert.equal(await auth(req(token({ exp: now / 1000 - 1 }))), false);
  assert.equal(await auth({ headers: {} }), false);
  const tampered = token().split('.');
  tampered[1] = encode({ iss: issuer, sub: 'owner-123', aud: resource, scope: 'device.bridge.read', iat: now/1000, exp: now/1000+300 });
  assert.equal(await auth(req(tampered.join('.'))), false);

  const numericAudienceAuth = createZitadelAuthenticator({
    issuer,
    resource,
    ownerSubject: 'owner-123',
    tokenAudiences: ['397623943239906543'],
    fetchImpl,
    now: () => now
  });
  assert.equal(await numericAudienceAuth(req(token({ aud: '397623943239906543' }))), true);
  assert.equal(await numericAudienceAuth(req(token({ aud: '397623943239906544' }))), false);
});

test('Zitadel verifier rejects missing owner enrollment, insecure issuer and insecure resource', () => {
  assert.throws(() => createZitadelAuthenticator({ issuer: 'http://localhost:1411', resource: 'https://bridge.example.test/mcp', ownerSubject: 'owner' }), /ISSUER_HTTPS_REQUIRED/);
  assert.throws(() => createZitadelAuthenticator({ issuer: 'https://identity.example.test', resource: 'http://bridge.example.test/mcp', ownerSubject: 'owner' }), /RESOURCE_HTTPS_REQUIRED/);
  assert.throws(() => createZitadelAuthenticator({ issuer: 'https://identity.example.test', resource: 'https://bridge.example.test/mcp' }), /OWNER_SUBJECT_REQUIRED/);
});

test('Zitadel ES256 owner tokens match Runtime Fabric algorithm policy without bypassing strict owner, audience or scope', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const issuer = 'https://zitadel-signing.example.test';
  const resource = 'https://leeway-resource.example.test/mcp';
  const now = 1792987200000;
  const acceptedProjectAudience = '397622361785898800';
  const signingJwk = { ...publicKey.export({format:'jwk'}), kid:'zitadel-ec-01', alg:'ES256', use:'sig' };
  const fetchImpl = async url => ({
    ok:true, json:async()=>String(url).endsWith('openid-configuration')
      ? {issuer,jwks_uri:issuer+'/jwks'}
      : {keys:[signingJwk]}
  });
  const auth = createZitadelAuthenticator({issuer,resource,ownerSubject:'397621082842543343',
    tokenAudiences:[acceptedProjectAudience],fetchImpl,now:()=>now});
  const encode = data=>Buffer.from(JSON.stringify(data)).toString('base64url');
  const signedToken = (claimsExtra={}, headerExtra={})=>{
    const header={kid:'zitadel-ec-01',alg:'ES256',typ:'at+jwt',...headerExtra};
    const payload={iss:issuer,sub:'397621082842543343',aud:acceptedProjectAudience,
      scope:'openid device.bridge.read',iat:now/1000-20,exp:now/1000+120,...claimsExtra};
    const data=encode(header)+'.'+encode(payload);
    return data+'.'+sign('sha256',Buffer.from(data),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
  };
  const req=t=>({headers:{authorization:'Bearer '+t}});
  assert.equal(await auth(req(signedToken())),true);
  assert.equal(await auth(req(signedToken({aud:'397622361785898801'}))),false);
  assert.equal(await auth(req(signedToken({sub:'wrong-owner'}))),false);
  assert.equal(await auth(req(signedToken({scope:'openid'}))),false);
  assert.equal(await auth(req(signedToken({exp:now/1000-1}))),false);
  assert.equal(await auth(req(signedToken({}, {alg:'HS256'}))),false);
  assert.equal(await auth(req(signedToken({}, {alg:'RS256'}))),false);
  const forged=signedToken().split('.');
  forged[1]=encode({iss:issuer,sub:'397621082842543343',aud:acceptedProjectAudience,
    scope:'device.bridge.read',iat:now/1000,exp:now/1000+300});
  assert.equal(await auth(req(forged.join('.'))),false);

  const { publicKey:wrongCurve } = generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const wrongCurveJwk={...wrongCurve.export({format:'jwk'}),kid:'zitadel-ec-01',alg:'ES256',use:'sig'};
  const wrongCurveAuth=createZitadelAuthenticator({issuer,resource,ownerSubject:'397621082842543343',
    tokenAudiences:[acceptedProjectAudience],
    fetchImpl:async url=>({ok:true,json:async()=>String(url).endsWith('openid-configuration')
      ? {issuer,jwks_uri:issuer+'/jwks'}:{keys:[wrongCurveJwk]}}),
    now:()=>now});
  assert.equal(await wrongCurveAuth(req(signedToken())),false);
});

test('redacted exception-stage diagnostic classifies decoding and OIDC fetch without leaking claims', async ()=>{
 const events=[];
 const issuer='https://auth.example.test';
 const resource='https://bridge.example.test/mcp';
 const now=1792987200000;
 const auth=createZitadelAuthenticator({issuer,resource,ownerSubject:'owner-subject-123',
   now:()=>now,fetchImpl:async()=>{throw Error('internal upstream secret detail');},
   onDeny:reason=>events.push(reason)});
 const req=token=>({headers:{authorization:'Bearer '+token}});
 const badHeader=Buffer.from('{malformed').toString('base64url');
 const other=Buffer.from('{}').toString('base64url');
 assert.equal(await auth(req(badHeader+'.'+other+'.sig')),false);
 assert.equal(events.pop(),'JWT_VERIFICATION_EXCEPTION_JWT_HEADER_DECODE');

 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const data=encode({alg:'RS256',kid:'test-kid'})+'.'+encode({
   iss:issuer,sub:'owner-subject-123',aud:resource,scope:'device.bridge.read',
   iat:now/1000-5,exp:now/1000+100
 });
 const value=data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');
 assert.equal(await auth(req(value)),false);
 assert.equal(events.pop(),'JWT_VERIFICATION_EXCEPTION_OIDC_DISCOVERY_FETCH');
 assert.equal(JSON.stringify(events).includes(value),false);
});
