# LEEWAY HEADER - DO NOT REMOVE
# REGION: LEEWAY.UNIVERSAL.APPLE
# TAG: LEEWAY.APPLE.PACKAGE.VALIDATION
# DISCOVERY_PIPELINE: Voice > Intent > Location > Vertical > Ranking > Render
# WHAT = Validate executable metadata in native IPA bundles.
# WHY = Prevent invalid installation artifacts.
# WHO = LeeWay engineering.
# WHERE = Existing Apple build pipeline.
# WHEN = Before artifact publication.
# HOW = ZIP, plist and Mach-O validation.
# LICENSE = Existing repository terms unchanged.

import sys
import zipfile
import plistlib
from pathlib import PurePosixPath

def executable(data):

    thin = {
        bytes.fromhex("cffaedfe"): "little",
        bytes.fromhex("cefaedfe"): "little",
        bytes.fromhex("feedfacf"): "big",
        bytes.fromhex("feedface"): "big",
    }

    fat = {
        bytes.fromhex("cafebabe"): ("big", 20),
        bytes.fromhex("bebafeca"): ("little", 20),
        bytes.fromhex("cafebabf"): ("big", 32),
        bytes.fromhex("bfbafeca"): ("little", 32),
    }

    def check_slice(offset, size):
        if size < 16 or offset + size > len(data):
            return False

        endian = thin.get(data[offset:offset + 4])

        if endian is None:
            return False

        return int.from_bytes(
            data[offset + 12:offset + 16],
            endian
        ) == 2

    magic = data[:4]

    if magic in thin:
        return check_slice(0, len(data))

    if magic not in fat:
        return False

    endian, stride = fat[magic]
    count = int.from_bytes(data[4:8], endian)

    if not 1 <= count <= 64:
        return False

    if 8 + count * stride > len(data):
        return False

    width = 8 if stride == 32 else 4

    for i in range(count):

        base = 8 + i * stride

        offset = int.from_bytes(
            data[base + 8:base + 8 + width],
            endian
        )

        size = int.from_bytes(
            data[base + 8 + width:base + 8 + 2 * width],
            endian
        )

        if not check_slice(offset, size):
            return False

    return True


def validate(path):

    with zipfile.ZipFile(path) as ipa:

        names = ipa.namelist()

        if len(names) != len(set(names)):
            raise RuntimeError("DUPLICATE_ZIP_ENTRIES")

        if ipa.testzip() is not None:
            raise RuntimeError("ZIP_CRC_FAILURE")

        bundles = sorted({
            str(parent)
            for name in names
            if name.startswith("Payload/")
            for parent in PurePosixPath(name).parents
            if parent.suffix in (".app", ".appex")
        })

        if not any(b.endswith(".app") for b in bundles):
            raise RuntimeError("APPLICATION_BUNDLE_MISSING")

        if not any(b.endswith(".appex") for b in bundles):
            raise RuntimeError("SAFARI_EXTENSION_MISSING")

        for bundle in bundles:

            info = plistlib.loads(
                ipa.read(bundle + "/Info.plist")
            )

            name = info.get("CFBundleExecutable")

            if not isinstance(name, str) or not name:
                raise RuntimeError(
                    "MISSING_EXECUTABLE_METADATA: " + bundle
                )

            if "/" in name or "\\" in name:
                raise RuntimeError("INVALID_EXECUTABLE_NAME")

            binary = bundle + "/" + name

            if binary not in names:
                raise RuntimeError(
                    "EXECUTABLE_NOT_FOUND: " + binary
                )

            if not executable(ipa.read(binary)):
                raise RuntimeError(
                    "INVALID_EXECUTABLE_TYPE: " + binary
                )

            print("[PASS]", bundle, "->", name)

    print("APPLE_PACKAGE_VALIDATION=PASS")


if __name__ == "__main__":
    try:
        validate(sys.argv[1])
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
