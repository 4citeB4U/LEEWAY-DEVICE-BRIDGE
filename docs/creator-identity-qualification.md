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
language requests and invalid profile rejection. Live Bridge 23 verification is
pending installation by the supervising task; no phone execution is claimed here.
