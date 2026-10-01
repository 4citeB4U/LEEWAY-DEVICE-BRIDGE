# Creator identity response correction

During the Bridge 22 phone qualification, the model answered an English arithmetic
question correctly but added unsupported biographical claims when asked who
created Agent Lee. That identity answer failed factual verification.

Bridge 23 routes a small exact set of English creator-identity questions to a
bundled portable creator profile, copied from Pocket's user-authorized profile
with its existing source references. It returns the creator name and LeeWay
relationship only. It does not invoke model inference for those matched queries,
and reports `modelExecuted: false`, `EXACT_PROFILE_LOOKUP_V1` and Formula
`NOT_EXECUTED`. This profile is not authentication or a permission grant.

Unrelated questions, broader biography requests, multi-part questions and explicit
alternate-language requests do not match this lookup. They remain on the existing
conversation path; this narrow repair does not prove general factual reliability
of the 360M model. Missing or invalid profiles return an unavailable message.

Host tests cover exact identity responses, negative routing, preserved alternate-
language requests and invalid profile rejection.

Live Bridge 23 (`0.9.8-pocket-rc8`) verification passed through the authenticated
Internet relay at `2026-10-01T05:42:41.245Z`. The question "Who created Agent Lee?"
returned "Agent Lee was created by Leonard J. Lee, the creator of LeeWay."
The result reported `modelExecuted: false`, `modelId: null`, authority
`USER_AUTHORIZED_CREATOR_PROFILE`, contract `EXACT_PROFILE_LOOKUP_V1` and Formula
`NOT_EXECUTED`. This verifies the profile lookup on the phone, not model reasoning.
The request disabled speech and returned `spoken: false`; it does not qualify
voice playback, audibility or physically unplugged operation.

The supervising task's captured result is preserved in
[the qualification evidence](qualification/creator-profile-2026-10-01.json).
