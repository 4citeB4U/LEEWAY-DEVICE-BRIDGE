/* LEEWAY HEADER — WHO=Device Bridge trusted host; WHAT=G3/G4 provider spine client; WHEN=2026-11-15; WHERE=operator/g3-g4-provider-spine.mjs; HOW=host-injected Formula G3 plus Veritas, Receipt, Ledger endpoints; WHY=bind real execution evidence to independent custody and learning. */
export function createG3G4ProviderSpine({ formulaEvidenceProvider, transitionG3ToG4, bindings }={}) {
 if(typeof formulaEvidenceProvider!=='function'||typeof transitionG3ToG4!=='function'||!bindings) throw new Error('G4_PROVIDER_CONFIGURATION_REQUIRED');
 return async execution => {
  const evidenceBundle=await formulaEvidenceProvider(execution);
  if(evidenceBundle?.schema!=='leeway.g3-evidence-bundle.v1'||evidenceBundle.grade!=='G3_OBSERVED_LOCAL') throw new Error('G4_FORMULA_G3_EVIDENCE_REQUIRED');
  const transition=await transitionG3ToG4({bundle:evidenceBundle,bindings});
  return Object.freeze({...transition,state:transition.status==='G4_TRANSITIONED'?'G4_ADMITTED':'G4_NOT_TRANSITIONED',evidenceBundle});
 };
}
