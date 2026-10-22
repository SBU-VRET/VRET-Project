#!/usr/bin/env python3
"""
Check the actual vertex-displacement magnitude of specific morph targets
(e.g. eyeBlinkLeft vs eyeBlinkRight) to see if one side's blend shape data
is degenerate/near-zero even though the target exists and is named correctly.

Usage:
    python check_morph_magnitude.py <vrm_path> <targetName1> [<targetName2> ...]
"""
import json
import struct
import sys
import numpy as np

COMPONENT_TYPES = {
    5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2),
    5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4),
}
TYPE_COUNTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    with open(path, "rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF"
        chunk_len, chunk_type = struct.unpack("<II", f.read(8))
        json_data = f.read(chunk_len)
        gltf = json.loads(json_data)
        bin_data = b""
        while f.tell() < length:
            hdr = f.read(8)
            if len(hdr) < 8:
                break
            clen, ctype = struct.unpack("<II", hdr)
            chunk = f.read(clen)
            if ctype == 0x004E4942:  # BIN
                bin_data = chunk
    return gltf, bin_data


def read_accessor(gltf, bin_data, idx):
    acc = gltf["accessors"][idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    comp_char, comp_size = COMPONENT_TYPES[acc["componentType"]]
    n_comp = TYPE_COUNTS[acc["type"]]
    offset = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    fmt = f"<{count * n_comp}{comp_char}"
    size = count * n_comp * comp_size
    vals = struct.unpack(fmt, bin_data[offset:offset + size])
    return np.array(vals, dtype=np.float64).reshape(count, n_comp)


def main(path, target_names):
    gltf, bin_data = read_glb(path)
    for mesh in gltf.get("meshes", []):
        mesh_target_names = mesh.get("extras", {}).get("targetNames", [])
        for prim in mesh.get("primitives", []):
            targets = prim.get("targets")
            if not targets:
                continue
            names = prim.get("extras", {}).get("targetNames", mesh_target_names)
            for tname in target_names:
                if tname not in names:
                    continue
                idx = names.index(tname)
                pos_accessor_idx = targets[idx].get("POSITION")
                if pos_accessor_idx is None:
                    print(f"{tname}: no POSITION delta accessor")
                    continue
                deltas = read_accessor(gltf, bin_data, pos_accessor_idx)
                mags = np.linalg.norm(deltas, axis=1)
                print(f"{tname} (mesh '{mesh.get('name')}'): "
                      f"max displacement={mags.max():.6f}, "
                      f"mean(nonzero)={mags[mags>1e-9].mean() if (mags>1e-9).any() else 0:.6f}, "
                      f"affected verts={int((mags > 1e-9).sum())}/{len(mags)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
