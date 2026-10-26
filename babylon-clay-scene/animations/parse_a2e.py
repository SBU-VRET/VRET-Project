import argparse
import json
from pathlib import Path

"""
Parses the JSON output of LAM-A2E (Audio2Expression) into the format used by
the A2FAvatar scene manifest.

Shape names and their order come directly from the input file's own "names"
(equivalently "metadata.blendshape_names") field, not a hardcoded list --
LAM's real output is already alphabetically-ordered camelCase ARKit names
(e.g. "browDownLeft", ..., "jawOpen", ...), not the "_L"/"_R"-suffixed order
previously hardcoded here. That hardcoded list was wrong for every position
but one (confirmed against both a live Colab run and the bundled example
file, which already contradicted it) -- it silently scrambled every shape on
every converted clip until this was caught by comparing LAM's output against
Audio2Face's for the same clip. See docs/FACIAL_ANIM_REGEN_NOTES.md.
"""

def convert_lam_to_model_format(lam_data: dict) -> dict:
    """
    Convert LAM-A2E output to A2FAvatar JSON format.

    LAM-A2E output is expected as:
      {
        "names": [...52 ARKit-style names, camelCase Left/Right...],
        "metadata": {"fps": 30.0, "frame_count": N, "blendshape_names": [...]},
        "frames": [{"time": ..., "weights": [52 floats]}, ...]
      }
    "names" and "metadata.blendshape_names" are expected to be identical;
    "names" is used as the source of truth.
    """
    names = lam_data["names"]

    out_frames = []
    for frame in lam_data["frames"]:
        out_frames.append({
            "time": frame["time"],
            "weights": frame["weights"]  # already ordered to match `names`
        })

    fps = lam_data.get("fps") or lam_data.get("metadata", {}).get("fps", 30)

    return {
        "fps": fps,
        "frameCount": len(out_frames),
        "blendShapeNames": names,
        "frames": out_frames
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert LAM Audio2Expression output to A2FAvatar JSON format")
    parser.add_argument("input", nargs="?", default="lam_a2e_output.json",
                         help="Path to LAM-A2E output JSON (default: lam_a2e_output.json)")
    parser.add_argument("-o", "--output", default=None,
                         help="Output JSON path (default: model_animation.json, or <input>_frames.json if --input given explicitly)")
    parser.add_argument("--quiet", action="store_true", help="Skip printing the shape names")
    args = parser.parse_args()

    in_path = Path(args.input)
    if args.output:
        out_path = Path(args.output)
    elif in_path.name == "lam_a2e_output.json":
        out_path = Path("model_animation.json")
    else:
        out_path = in_path.with_name(in_path.stem + "_frames.json")

    with in_path.open() as f:
        lam_data = json.load(f)

    result = convert_lam_to_model_format(lam_data)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        json.dump(result, f, indent=2)

    print(f"Wrote {result['frameCount']} frames ({len(result['blendShapeNames'])} shapes) -> {out_path}")

    if not args.quiet:
        print("\nShape names (from input file, in order):")
        for name in result["blendShapeNames"]:
            print(f"  {name}")
