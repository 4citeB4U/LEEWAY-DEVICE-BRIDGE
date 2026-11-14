/*
REGION: LeeWay Device Bridge legacy workstation compatibility entry point
TAG: LEEWAY.LEGACY.HP_SECONDARY.RETIRED.V1
WHAT: Preserve the former import name without preserving a hardware-specific relay.
WHY: A source file must never invent one HP machine's identity, IP address, hardware, or capability state.
HOW: Re-export the portable enrolled workstation implementation; refuse direct use of the retired entry point.
*/
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WorkstationRelayAgent } from "./workstation-relay-agent.mjs";

export { WorkstationRelayAgent as HpSecondaryRelayAgent };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  throw new Error(
    "HP_SECONDARY_LEGACY_ENTRYPOINT_RETIRED: use scripts/start-enrolled-workstation-relay.ps1 with enrollment-issued bindings."
  );
}
