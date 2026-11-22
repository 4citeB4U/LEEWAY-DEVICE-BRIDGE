#!/usr/bin/env python3
# LEEWAY HEADER — DO NOT REMOVE
# REGION: LEEWAY.DEVICE_BRIDGE.EXTENSION.BUILD
# TAG: LEEWAY.EXTENSION.V2.BUILD
# 5WH:
# WHAT = Build unsigned Chrome/Edge and Firefox extension source bundles.
# WHY = Produce deterministic, inspected Manifest V3 artifacts without claiming browser or native-host admission.
# WHO = Creator-authorized Device Bridge contributors.
# WHERE = scripts/package-extension-v2.py.
# WHEN = 2026-11-16.
# HOW = Python standard-library zipfile, manifest validation and SHA-256 summaries.
# LICENSE = Existing repository terms; no new license asserted.
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
source = root / 'apps' / 'extension'
dist = root / 'dist'
dist.mkdir(exist_ok=True)
assets = [
    'browser-polyfill.js', 'background.js', 'content-courier.js',
    'floating-tablet.js', 'README.md'
]
for browser, manifest_name in [('chromium', 'manifest.json'), ('firefox', 'manifest.firefox.json')]:
    manifest = json.loads((source / manifest_name).read_text(encoding='utf8'))
    assert manifest['manifest_version'] == 3
    assert set(manifest['permissions']) == {'activeTab', 'scripting', 'nativeMessaging'}
    bundle = dist / f'leeway-device-bridge-extension-v2-{browser}-unsigned.zip'
    with ZipFile(bundle, 'w', compression=ZIP_DEFLATED, compresslevel=9) as output:
        for name in ['manifest.json', *assets]:
            payload = (source / (manifest_name if name == 'manifest.json' else name)).read_bytes()
            meta = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            meta.compress_type = ZIP_DEFLATED
            meta.external_attr = (0o644 << 16)
            output.writestr(meta, payload, compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(bundle) as verify:
        assert sorted(verify.namelist()) == sorted(['manifest.json', *assets])
        assert json.loads(verify.read('manifest.json'))['manifest_version'] == 3
        assert verify.testzip() is None
    print(f'{bundle.name} sha256={hashlib.sha256(bundle.read_bytes()).hexdigest()} bytes={bundle.stat().st_size}')
