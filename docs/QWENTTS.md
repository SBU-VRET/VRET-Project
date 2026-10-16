# QwenTTS — Audio Generation

QwenTTS is the tool behind `qwen.py`, which takes a written dialogue script and turns it into spoken `.wav` lines, in cloned voices, for the existing demo's traffic-stop scene. This covers the project's voice generation scheme: a DialogueJSON-style file goes in, and QwenTTS-generated `.wav` lines come out, which then go into audio-to-expression generation for facial animation.

I pulled `qwen.py`, its dialogue input (`traffic.json`), and the two reference voice clips it needs over from the old TLTMedia/VRET repo, specifically the `jayden` and `paul` branches. For now it's just sitting in `temp/qwenTTS/`, which is gitignored, so this is intentionally not part of the tracked pipeline yet.

Costs:
- Qwen3-TTS, run locally (what our script does): free, with open weights downloaded through Hugging Face. No API key or account needed.
- Qwen3-TTS, hosted: Alibaba also runs it as a paid cloud API through their DashScope platform, billed per character.

Resource usage:
- Local only applies to our own script. It needs a GPU to run at a reasonable speed, and from what I found, is CUDA-only, with no official CPU path for the 1.7B model we're using. Our own `qwen.py`, though, loads the model with `device_map="cpu"`, which runs but is likely much slower than intended, so this is probably worth revisiting once we have real GPU access.
- Community estimates (not an official source, so I'm not fully confident in these) put the 1.7B-Base model at around 8GB+ of VRAM, with the smaller 0.6B variant needing less, around 4GB.
- Local is offline once the model weights are downloaded. The DashScope cloud option is online only, through an API key, and includes its own voice-cloning and voice-design endpoints with real-time streaming, separate from the local `create_voice_clone_prompt`/`generate_voice_clone` approach our script uses.

## How audio generation actually works

QwenTTS does two different jobs, both through the same loaded model, but they are not the same kind of call:

1. **Learning a voice (`create_voice_clone_prompt`).** This step feeds the model a short, real recording of an actual person's voice (in our case, two YouTube/personal clips, `CoryxKenshinClip.wav` and `LetitiaCrop.wav`), along with the exact transcript of what's said in that clip. The model pulls out a compact "voiceprint," called an x-vector, which captures things like the speaker's timbre and pitch range. This step is real existing speech being analyzed, not generated. The output is not audio at all, just this voiceprint object, built once per character and reused afterward.
2. **Generating new speech (`generate_voice_clone`).** This step feeds the model a brand-new line of text, along with the voiceprint from step 1 and an `instruct` string describing the character and how the line should be delivered (emotion, pacing). The model generates a new waveform from scratch, in that cloned voice, following the instruction. This is the actual text-to-speech generation, and it is what gets written out as a `.wav` file.

The docs for `create_voice_clone_prompt` say x-vector-only mode ignores both `ref_code` and `ref_text`, but the package code only clears `ref_code`. The transcript stays on the prompt object, and `generate_voice_clone` tokenizes it into `ref_ids`, which get passed into the model's generation call regardless of mode, so the documented behavior does not match the actual code. This probably isn't an issue for us, since the `ref_text` we pass is an accurate transcript of the real clip either way. Still, it's worth looking into what effect `ref_ids` actually has on the output when `icl_mode` is False.

## What each file does

| File | Role |
|---|---|
| `qwen.py` | The script itself, loads the model, builds both characters' voiceprints, reads the dialogue, and generates one `.wav` per line |
| `traffic.json` | Supplies the character descriptions and the actual lines/exposition to turn into audio |
| `cloneWav/CoryxKenshinClip.wav` | Reference clip cloned into Officer Miller's voice |
| `cloneWav/LetitiaCrop.wav` | Reference clip cloned into Jordan's voice |
| `output_custom_voice_{i}.wav` (generated, not carried over) | The actual output, one `.wav` per script line, in script order |

`traffic.json` itself has three parts: a `title` (just a label, never read by the script), a `characters` dict (name to personality description, fed into each line's `instruct` text), and a `script` array (the ordered lines, each with a `character`, an `exposition`/stage-direction that shapes delivery but is never spoken, and the `line` text that actually gets voiced).

## Open questions for the team

- **Where should this actually live?** Right now it's parked in `temp/qwenTTS/` and untracked. Once my repo-restructure work settles, this needs a real home in the tracked pipeline instead of staying gitignored.
- **CPU vs. GPU.** The script is written to run on CPU, which conflicts with what the community docs say about this model needing CUDA. It's worth confirming whether it actually ran successfully on CPU before, or whether that line needs changing once GPU access is sorted out.
- **One `.wav` per line, not one per scene.** `qwen.py` outputs a separate file per script line (`output_custom_voice_0.wav`, `_1.wav`, etc.), which is exactly the kind of multi-file output the separate WAV-combining script (built with Gemini's help, still undocumented, see `docs/TECH_PIPELINE.md` Stage 3 open questions) exists to merge into one file. It's worth confirming that script is actually pointed at this output.
