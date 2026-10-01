# Qualified phone workstation scope — 2026-10-01

Bridge 23 (`0.9.8-pocket-rc8`) and Pocket RC11 (version code 13) passed the
following distinct acceptance cases. The owner physically disconnected USB and
the controller's ADB device list was empty for the two unplugged cases.

- **Phone-native development, USB disconnected:** at `06:03:26.277Z`, the direct
  phone Desktop Commander Internet connection executed Android ARM64 Node
  `v26.3.1`, created/read a file, imported a module and asserted result `42`.
  Git `2.54.0` was available; the process exited `0`.
  [Captured development receipt](qualification/unplugged-development-2026-10-01.json).
- **Observed phone control, USB disconnected:** the Internet relay/MCP test began
  at `06:03:32.489Z`, opened Samsung Calculator, used observed UI controls to
  calculate `2+2`, verified visible result `4`, and returned Home. Every recorded
  step passed. [Control evidence summary](qualification/unplugged-control-2026-10-01.json)
  preserves the original capture hash and controller receipt references; the
  supervising task retains the complete repeated UI trees.
- **Pocket command path:** the typed "Open Calculator" request passed through
  signed background IPC and verified the intended foreground app. See
  [command qualification](pocket-explicit-commands.md). Pocket's own back/home/
  recents cases remain distinct from the controller's successful Home command.
- **Conversation and identity:** a phone-local English arithmetic response passed;
  the exact creator-profile lookup passed separately, with no model inference
  claimed for that lookup. See [identity qualification](creator-identity-qualification.md).
- **Voice:** the owner confirmed a clear, entirely English generated Natural-voice
  answer and subsequently confirmed a correct spoken answer through the published
  Voice Fabric microphone path. The observed generated-answer test took about
  105 seconds; voice responsiveness is still a material limitation. These are
  owner audibility confirmations, not a claim that every voice route passed.

The controller PC remained online. These results demonstrate phone-side execution
and control without USB; they do **not** prove operation with the controller PC
powered off or reboot recovery.

Remaining scope: other device/platform UI adapters, broader Pocket navigation and
model-selected tools, actual skill execution beyond source retrieval, a real image
generation backend/artifact binding, measured conversation/task-to-Formula inputs,
reboot persistence and practical voice latency. Formula diagnostics are not task
evaluation; the recorded control receipts state Formula `NOT_EVALUATED`. Portable
contracts and passing desktop protocol tests do not imply universal device support.
