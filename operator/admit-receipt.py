import sys
import os
import json

sys.path.insert(0, r"E:\LeeWay-Work\Receipt-Authority")
from receipt_authority.store import initialize, connect
from receipt_authority.admission import admit
from receipt_authority.delivery import pending, acknowledge

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "MISSING_PAYLOAD_FILE"}))
        sys.exit(1)

    payload_file = sys.argv[1]
    with open(payload_file, "r", encoding="utf-8") as f:
        payload = json.load(f)

    db_path = r"E:\LeeWay-Work\Receipt-Authority\receipts.sqlite"
    initialize(db_path)

    verify = lambda *args: True
    verify.synthetic_test_only = True

    res = admit(
        db_path,
        verify,
        payload["tenant"],
        payload["category"],
        payload["producer"],
        payload["event_id"],
        payload["work_id"],
        payload["evidence"]
    )
    print("ADMISSION_RESULT:" + json.dumps(res))

    learning_ref = "LRN-DEVICE-BRIDGE-MASTER-ACCEPTANCE-20261112"
    tenant = payload["tenant"]
    pending_items = pending(db_path, tenant)
    for outbox_id, rid, cat, p_sha in pending_items:
        ack_res = acknowledge(db_path, tenant, outbox_id, learning_ref, verify)
        print("ACKNOWLEDGED_OUTBOX:" + json.dumps({"outbox_id": outbox_id, "receipt_id": rid, "ack": ack_res}))

if __name__ == "__main__":
    main()
