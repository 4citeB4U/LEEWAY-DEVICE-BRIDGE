// Shape-only compatibility check against the canonical Runtime Fabric universal adapter contract.
// This does not authenticate an issuer, grant authority or permit execution.
export function validateAppleVeritasDescriptor(descriptor, contract) {
  const errors = [];
  if (!contract || contract.id !== "LEEWAY_UNIVERSAL_ADAPTER_CONTRACT_V1"
      || contract.runtimeOwner !== "4citeB4U/Leeway-Runtime-Fabric"
      || !Array.isArray(contract.adapterClasses)
      || !contract.adapterClasses.includes("evidence-veritas")
      || !contract.required || typeof contract.required !== "object") {
    return {state:"CONTRACT_NOT_RECOGNIZED",validShape:false,authorized:false,executable:false,errors:["CANONICAL_CONTRACT_INVALID"]};
  }
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
    return {state:"DESCRIPTOR_INVALID",validShape:false,authorized:false,executable:false,errors:["DESCRIPTOR_NOT_OBJECT"]};
  }
  for (const [section, fields] of Object.entries(contract.required)) {
    if (!Array.isArray(fields) || !fields.every(x => typeof x === "string" && x)) {
      return {state:"CONTRACT_NOT_RECOGNIZED",validShape:false,authorized:false,executable:false,errors:["CANONICAL_CONTRACT_INVALID"]};
    }
    const group = descriptor[section];
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      errors.push("MISSING_SECTION:" + section);
      continue;
    }
    for (const field of fields) {
      const value = group[field];
      if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
        errors.push("MISSING_FIELD:" + section + "." + field);
      }
    }
  }
  if (descriptor.identity?.adapterClass !== "evidence-veritas") errors.push("INVALID_ADAPTER_CLASS");
  return {state:errors.length?"DESCRIPTOR_INVALID":"SHAPE_ONLY_UNTRUSTED",
    validShape:errors.length===0,authorized:false,executable:false,errors};
}
