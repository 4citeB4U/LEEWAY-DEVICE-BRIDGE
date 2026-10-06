# Native Commander — live admission through the existing boot binding

## Accepted change

The Creator explicitly approved admission of native-owner candidate `4087dae37e81db0629033a0256b232dd9c0914d1` through the existing boot/transport binding. The current workstation now runs that implementation as `LEEWAY_NATIVE_HOST_COMMANDER`, owned by `4citeB4U/LEEWAY-DEVICE-BRIDGE`.

Only the existing `host-commander.binding.v1.json` source/policy references and their verified hashes were rebound. The existing loader, provider identity, local port, target body binding and authorized workspace binding were retained. No second persistent executor, public listener, wildcard filesystem permission or arbitrary shell profile was introduced.

Admitted server SHA-256:

`a4ccee4b1d7c6894075dd279431c96968c9e03fecd086f51d80b3d77d4ab46c0`

Unchanged command-policy SHA-256:

`091b09323077f09b3168f2d9401d632542313ce0b8be04d218c5fa69fb0c6649`

## Executed admission sequence

The admission script verified the repository owner, exact candidate commit, clean tracked source, previously accepted native qualification and current live source/policy pins. It captured the exact previous binding and loader bytes before mutation. The thirty-case native candidate test suite ran again immediately before admission.

The existing binding was replaced atomically, and only the process whose executable, loader command line and loopback port ownership matched the inspected service was stopped. The same loader was restarted. Live native host information and the native file-hash capability then succeeded; the admitted server's hash matched an independent filesystem hash.

A second stop/start of that same loader repeated the live read-back. The final check found exactly one native loader and exactly one listener on the preserved loopback port. This is a restart replay, not a claim that the whole machine was cold-booted.

The previous binding remains in the admission evidence as a rollback resource. Rollback logic restores those exact bytes and restarts the same loader on admission failure. No rollback was required in the accepted run. A preliminary attempt failed before changing the binding because PowerShell converted a null backup-path argument to an empty string; that failed receipt was retained and the replacement operation was corrected to use an explicit backup file.

## Independent evidence verification

Nine checks passed independently: admission receipt status; source pin; policy pin; source-commit agreement; current binding hash; unchanged loader hash; presence of the three native execution envelopes; integrity of all three envelopes; and retention of the exact previous binding.

Admission receipt SHA-256:

`cc496af5831c17030720acd309464fdd781d47e1c5788eac86a9e044b0561789`

Independent verification SHA-256:

`619a18e3bd3a1aeff6fa083c924e448cf712df1969d1dc6d3ad344811efe8967`

Published summary: `receipts/native-commander/live-admission-summary.json`.

Full host evidence and rollback copies: `receipts/native-commander/admission-50c59bd4097243ef8648dba4e0d0615d/` in the admitted owner worktree.

## Portability and remaining boundaries

The provider core does not require a hard-coded drive, account home or device identifier. File operations resolve a logical resource against the target's explicit runtime binding. Local boot configuration necessarily identifies the local installed payload; those physical bindings are not universal LeeWay identity.

The broader legacy Boot Fabric was not rewritten in this admission. Its existing scheduled startup continues to launch the same unchanged Commander loader. General authenticated remote failover from ChatGPT is still unqualified: this chat uses its authorized external connector to reach the PC, after which LeeWay's own native provider executes the bounded command.

Application aliases require explicit target-side bindings and were not broadened by this admission. Platform-specific inventory operations remain separately qualified. Receipt hashes establish content integrity, not authenticated signing. The full C3 ingress-to-Learning-Ledger path has not been certified by this service update.

Formula execution: `NOT_EXECUTED`. Learning Ledger: `NOT_UPDATED`. Main merge: `NOT_PERFORMED`. Native live binding admission: `PASS`.
