#!/usr/bin/env python3
"""Dump glTF mesh morph target (blend shape) names from a .vrm/.glb binary."""
import json
import struct
import sys


def read_gltf_json(path):
    with open(path, "rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF", f"Not a glb/vrm binary: {path}"
        chunk_len, chunk_type = struct.unpack("<II", f.read(8))
        assert chunk_type == 0x4E4F534A, "First chunk is not JSON"
        data = f.read(chunk_len)
    return json.loads(data)


def main(path):
    gltf = read_gltf_json(path)
    print(f"=== {path} ===")
    for mesh in gltf.get("meshes", []):
        name = mesh.get("name", "<unnamed>")
        mesh_target_names = mesh.get("extras", {}).get("targetNames", [])
        for i, prim in enumerate(mesh.get("primitives", [])):
            targets = prim.get("targets")
            if not targets:
                continue
            target_names = prim.get("extras", {}).get("targetNames", mesh_target_names)
            has_jaw = "jawOpen" in target_names
            print(f"  mesh '{name}' primitive {i}: {len(targets)} targets, "
                  f"jawOpen present: {has_jaw}")
            if not has_jaw:
                print(f"    names: {target_names}")

            blink_names = [n for n in target_names if "blink" in n.lower() or "eye" in n.lower()]
            print(f"    eye/blink-related names: {blink_names}")
            from collections import Counter
            dupes = {n: c for n, c in Counter(target_names).items() if c > 1}
            if dupes:
                print(f"    DUPLICATE target names: {dupes}")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
