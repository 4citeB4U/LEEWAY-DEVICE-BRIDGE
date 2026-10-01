# Pocket explicit phone commands

PocketCommandService is an Android bound Messenger service. It does not open an
Activity or replace the existing relay/runtime. Both applications must have the
same trusted signing certificate. Android's signature permission, Binder sender
UID and exact Pocket package, the existing local Pocket token, and enabled owner
agent access are independent admission requirements.

The service accepts only `open` with an exact installed app label, `back`, `home`,
or `recents`. It performs app discovery and UI observations through the existing
RemoteCommandRouter. Ambiguous labels fail without selecting an app. It cannot
accept arbitrary capabilities, coordinates, text entry, install/delete actions,
or multi-step plans. Model output never selects these actions.

Only one command runs; additional requests fail busy, recent IDs cannot repeat,
and stale requests are rejected. Execution checks an eight-second deadline at
each step. Pocket stops waiting after twelve seconds and labels a timeout's
outcome unknown; this is not proof that an accepted Android action was canceled.

Pocket's foreground overlay service owns the binding. Pocket yields its Activity
and hides the side tab during operation. The bridge refuses to act while its own
or Pocket's window is active. Launch success means the launch request was
dispatched; foreground-package observation is separate evidence. Back/home/
recents return Android acceptance and explicitly do not claim a verified final
screen outcome. Android background-launch restrictions can still block a launch.

Every result declares `EXPLICIT_COMMAND_GRAMMAR` and Formula `NOT_EXECUTED`.
Existing skill-source retrieval and phone-local conversation are separate paths.

Host unit tests cover caller/token/owner combinations, exact/ambiguous labels,
unsupported commands and concurrent single-flight admission. Actual Binder
identity, foreground yielding, Android permissions and UI outcomes require a
paired-device acceptance run; source/build tests do not prove those outcomes.
