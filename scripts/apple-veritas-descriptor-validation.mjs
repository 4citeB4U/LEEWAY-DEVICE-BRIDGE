// Shape-only compatibility check against the canonical Runtime Fabric universal adapter contract.
// This does not authenticate an issuer, grant authority or permit execution.
// Pinned field set from 4citeB4U/Leeway-Runtime-Fabric/contracts/universal-adapter-contract.v1.json.
// Caller-supplied contracts cannot weaken the canonical required schema.
const REQUIRED_FIELDS = Object.freeze({
  identity:["id","version","domain","adapterClass"],
  capability:["contracts","operations"],
  binding:["provider","runtimeTarget","bindingMode"],
  portability:["contractPortable","adapterImplemented","platformTested"],
  governance:["authorizationClass","permissions"],
  evidence:["measurementSchema","veritasRequirements"],
  lifecycle:["health","cancel","failure","rollbackOrFallback"]
});
function matchesPinnedContract(required) {
  if (!required || typeof required !== "object" || Array.isArray(required)) return false;
  const expectedSections = Object.keys(REQUIRED_FIELDS);
  if (Object.keys(required).length !== expectedSections.length) return false;
  return expectedSections.every(section => Array.isArray(required[section])
    && required[section].length === REQUIRED_FIELDS[section].length
    && REQUIRED_FIELDS[section].every(field => required[section].includes(field))
    && new Set(required[section]).size === required[section].length);
}
export function validateAppleVeritasDescriptor(descriptor, contract) {
  const errors = [];
  if (!contract || contract.id !== "LEEWAY_UNIVERSAL_ADAPTER_CONTRACT_V1"
      || contract.runtimeOwner !== "4citeB4U/Leeway-Runtime-Fabric"
      || !Array.isArray(contract.adapterClasses)
      || !contract.adapterClasses.includes("evidence-veritas")
      || !matchesPinnedContract(contract.required)) {
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
      const fieldPath = section + "." + field;
      if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
        errors.push("MISSING_FIELD:" + fieldPath);
        continue;
      }
      // These field kinds follow the canonical contract's vocabulary.
      // No arbitrary truthy object, string "true" or empty capability list can pass.
      if (["contracts","operations","permissions","veritasRequirements"].includes(field)) {
        if (!Array.isArray(value) || value.length === 0 ||
            !value.every(item => typeof item === "string" && item.trim() !== "")) {
          errors.push("INVALID_LIST:" + fieldPath);
        }
      } else if (["contractPortable","adapterImplemented","platformTested"].includes(field)) {
        if (typeof value !== "boolean") errors.push("INVALID_BOOLEAN:" + fieldPath);
      } else if (typeof value !== "string" || value.trim() === "") {
        errors.push("INVALID_STRING:" + fieldPath);
      }
    }
  }
  if (descriptor.identity?.adapterClass !== "evidence-veritas") errors.push("INVALID_ADAPTER_CLASS");
  return {state:errors.length?"DESCRIPTOR_INVALID":"SHAPE_ONLY_UNTRUSTED",
    validShape:errors.length===0,authorized:false,executable:false,errors};
}
