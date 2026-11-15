/* LEEWAY HEADER — WHO=Device Bridge trusted host; WHAT=G3/G4 provider spine client; WHEN=2026-11-15; WHERE=operator/g3-g4-provider-spine.mjs; HOW=host-injected Formula G3 plus Veritas, Receipt, Ledger endpoints; WHY=bind real execution evidence to independent custody and learning. */
const json = async (url, body) => { const r = await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)}); if(!r.ok) throw new Error(`G4_PROVIDER_HTTP_${r.status}`); return r.json(); };
export function createG3G4ProviderSpine({ formulaEvidenceProvider, veritasEndpoint, receiptEndpoint, ledgerEndpoint }={}) {
 if(typeof formulaEvidenceProvider!=='function'||![veritasEndpoint,receiptEndpoint,ledgerEndpoint].every(x=>typeof x==='string'&&/^http:\/\/127\.0\.0\.1:\d+\//.test(x))) throw new Error('G4_PROVIDER_CONFIGURATION_REQUIRED');
 return async execution => {
  const evidenceBundle=await formulaEvidenceProvider(execution);
  if(evidenceBundle?.schema!=='leeway.g3-evidence-bundle.v1'||evidenceBundle.grade!=='G3_OBSERVED_LOCAL') throw new Error('G4_FORMULA_G3_EVIDENCE_REQUIRED');
  const attestation=await json(veritasEndpoint,{evidenceBundle});
  const receipt=await json(receiptEndpoint,{evidenceBundle,veritasAttestation:attestation});
  const admission=await json(ledgerEndpoint,{evidenceBundle,receipt});
  if(admission?.state!=='ADMITTED') throw new Error('G4_LEDGER_ADMISSION_REJECTED');
  return Object.freeze({state:'G4_ADMITTED',evidenceBundle,attestation,receipt,admission});
 };
}
