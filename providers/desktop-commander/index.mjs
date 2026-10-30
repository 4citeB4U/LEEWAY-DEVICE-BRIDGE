/*
REGION: LeeWay Device Bridge adapter
TAG: LEEWAY-ADAPTER-DESKTOP-COMMANDER
WHO: Agent Lee / Device Bridge
WHAT: Governed Desktop Commander workstation adapter.
WHEN: For authorized remote workstation discovery, file/process/search and shell capabilities.
WHERE: providers/desktop-commander
WHY: Make multi-computer control a first-class Device Bridge capability without duplicating Agent Lee.
HOW: Delegates to an authorized Desktop Commander transport and preserves target-machine authority.
LICENSE: MIT
*/
import { GovernedProvider } from "../_shared/governed-provider.mjs";

export class DesktopCommanderAdapter extends GovernedProvider {
  constructor(options = {}) {
    super({ providerId: "desktop-commander", providerClass: "remote-workstation", ...options });
  }
  status() {
    return this.state({
      capabilities: [
        "workstation.remote.ping",
        "workstation.shell.execute",
        "workstation.files.read",
        "workstation.files.write",
        "workstation.search",
        "workstation.process.list",
        "workstation.session.recover"
      ],
      targetApprovalRequired: true,
      localAuthorityInherited: false
    });
  }
  ping(target) { return this.invoke("ping", { target }, { authorityTier: "READ" }); }
  readFile(target, path) { return this.invoke("readFile", { target, path }, { authorityTier: "READ" }); }
  execute(target, command, { humanConfirmed = false } = {}) {
    return this.invoke("execute", { target, command }, {
      authorityTier: "OPERATE",
      humanConfirmed
    });
  }
}
