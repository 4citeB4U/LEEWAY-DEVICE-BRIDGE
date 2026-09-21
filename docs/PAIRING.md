# Pairing

Pairing is device identity + owner approval + session authority.

The Android reference adapter creates an EC key in Android Keystore and a LeeWay device ID. The public-key fingerprint may leave the device; private key material must not.

UNPAIRED → CHALLENGE_CREATED → OWNER_APPROVAL_REQUIRED → PAIRED

Pairing never implies all capabilities. Each capability remains independently authorized.

Revocation invalidates remote session authority without deleting historical receipts.
