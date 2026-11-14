# Primary enrollment authority — source checkpoint

Date: 2026-11-14 (America/Chicago)  
Gate: IMPLEMENT → TEST (source contract only)

## Added source boundary

`operator/identity/enrollment-relay-binding-authority.mjs` is a primary-host coordinator. It does not generate a key, invent a relay endpoint, use a local JSON file as a registry, or claim a live deployment. It requires injected implementations for:

- pending enrollment state (`begin`, `read`, and atomic `consume`);
- device-key proof and separate owner-approval verification;
- trusted device registry admission;
- signed relay policy and relay-binding signer;
- canonical receipt append plus durable readback.

The coordinator admits an active record only after proof and approval, signs a policy-derived binding, and refuses completion unless the receipt authority returns the exact canonical evidence hash. Invalid proof is checked before `consume`, so it cannot burn a pending enrollment.

`operator/dynamic-enrollment.mjs` now permits an already authenticated login credential to be carried into the enrolled runtime when the authority does not return one. The authority does not mint access credentials.

## Executed evidence

Command:

```text
node --test tests/enrollment-relay-binding-authority.test.mjs tests/primary-enrollment-authority-http.test.mjs tests/dynamic-enrollment.test.mjs
```

Result: 10 passed, 0 failed.

## Still unbound — do not call this production

No persistent pending store, proof verifier, owner approval verifier, registry, signer, receipt authority, or HTTPS primary-host handler has yet been bound to this coordinator. No device was enrolled, no relay binding was issued by a real signer, and no physical device transfer is proven by these tests.

The source now also contains `operator/identity/primary-enrollment-authority-http.mjs`, a narrow HTTP boundary. It independently requires an injected request authenticator to confirm the bearer and forwarded owner subject before reaching the coordinator. It is not a running primary-host service until the protected providers above are explicitly bound.

Next source gate: bind this coordinator to independently protected primary-host providers, then point the Runtime adapter at that authenticated HTTPS authority only after an end-to-end staging test.
