# Audio2Face vs. LAM Audio2Expression

Of the two, Audio2Face-3D through its NVCF cloud option seems like the better fit for our needs, mainly because it avoids straining our own GPUs and is the more polished tool overall, though the free credits won't last forever and it likely becomes a real cost long term. LAM Audio2Expression is worth trying too since it's completely free, just at the cost of needing our own GPU.

Both of these tools take in `.wav` audio and produce facial animation in the same general format (ARKit blendshapes), which is why `csv_converter.py` and `parse_a2e.py` are able to land on the same unified schema downstream (see `docs/TECH_PIPELINE.md`, Stage 4). Past that point, however, the two tools are built quite differently, and the gap in how polished each one is seems to come directly from who built them.

Costs:
- Audio2Face-3D: not entirely free. NVIDIA offers a free developer tier with limited API credits through `build.nvidia.com`, but ongoing or commercial use likely requires either metered NVCF usage or a paid NVIDIA AI Enterprise license; I was unable to find exact pricing.
- LAM Audio2Expression: free and open source, with no licensing cost at all, though it does need our own GPU hardware to actually run it.

Resource usage:
- Audio2Face-3D: in self-hosted mode, NVIDIA's docs put it at around 5-6GB of VRAM by default, needing an Ampere, Ada, or Blackwell generation GPU. This can be tuned down to under 1GB for edge deployments by limiting it to a single TensorRT stream, though that likely trades off some performance. In NVCF cloud mode, our own machines don't need any GPU or VRAM at all, since NVIDIA's servers handle it.
- LAM Audio2Expression: always needs our own GPU since there's no cloud option, and the install itself needs a real CUDA setup (not just any NVIDIA card). I was unable to find an official VRAM figure from the repo or docs, but the model itself (a small Wav2Vec-based encoder-decoder) is much smaller than a generative model like Audio2Face-3D, so it's likely lighter in practice, just unconfirmed.

## NVIDIA Audio2Face-3D

Audio2Face-3D is part of NVIDIA ACE, which is NVIDIA's broader platform for digital humans and avatars. It takes audio as input, along with an emotion signal (this can be detected automatically from the audio, or specified directly), and it outputs facial animation using ARKit blendshapes, a standard way of describing how much each part of a face (eyebrows, mouth corners, etc.) should move at a given moment. NVIDIA does not publish the underlying model architecture, so I was unable to find out exactly what's happening internally, only that NVIDIA describes it as "generative AI."

In terms of how we would actually have to use it, Audio2Face-3D is packaged as a NIM, short for NVIDIA Inference Microservice, which is essentially a Docker container that NVIDIA builds and maintains. There are two ways to run it:

- **Self-hosted.** We pull the container onto our own GPU hardware and run it there. This is GPU intensive, and since we want to avoid putting that kind of strain on our own machines, this probably isn't the option we should lean on.
- **Cloud-hosted through NVCF** (NVIDIA Cloud Functions). Every request goes out to NVIDIA's servers and requires an API key and a live connection the whole time, but it offloads all the GPU work to NVIDIA's infrastructure instead of ours. Given that we want to avoid local strain, this is likely the better fit for the team, as long as the free credits or pricing work out.

The API itself uses gRPC rather than REST. The clearest example of what calling it actually looks like comes from NVIDIA's own Unreal Engine plugin: it converts the audio clip to 16kHz mono before sending it off, and the API key can be loaded at runtime instead of being hardcoded into the project.

## LAM Audio2Expression (LAM-A2E)

LAM-A2E is the audio-driving component of a larger project called LAM, built by Tongyi Lab at Alibaba. It describes itself as generating "ARKit expression from audio in realtime," and it lives in its own separate repository ([aigc3d/LAM_Audio2Expression](https://github.com/aigc3d/LAM_Audio2Expression)), distinct from the main LAM avatar-generation repo.

In terms of how it works, LAM-A2E uses an encoder-decoder setup. In plain terms, this means one part of the model (the encoder) listens to the raw audio and pulls out useful features from it, using a pretrained speech model called Wav2Vec. Those features then get combined with a separate "style" input and passed to the second part of the model (the decoder), which outputs the actual blendshape values. The blendshapes were manually adapted to match a facial model called FLAME, and then mapped over to ARKit's naming scheme, which is where the hardcoded 52-name list in our own `parse_a2e.py` comes from.

Unlike Audio2Face-3D, there does not appear to be any cloud option for LAM-A2E. There's no way to avoid the GPU strain here, since local hardware is the only option:

1. Clone the repo and set up a conda environment. Notably, it only supports **Python 3.10**, nothing newer or older.
2. Run one of the provided install scripts (`install_cu121.sh` or `install_cu118.sh`, depending on which CUDA version is installed). An NVIDIA GPU is required.
3. Download the model weights separately, either from Hugging Face, Alibaba's own OSS mirror, or ModelScope, then extract them.
4. Run inference, either through a command like this:
   ```
   python inference.py --config-file configs/lam_audio2exp_config_streaming.py \
     --options save_path=exp/audio2exp weight=pretrained_models/lam_audio2exp_streaming.tar \
     audio_input=./assets/sample_audio/BarackObama_english.wav
   ```
   or through a Gradio web interface (`python app_lam_audio2exp.py`) if a more visual option is preferred.

There is no real API to speak of here, just the `inference.py` script above and an undocumented streaming variant (`inference_streaming_audio.py`), with no CLI flags for picking shape names since everything is hardcoded.

As for online vs. offline, the initial setup (downloading weights, installing packages) does need an internet connection, but once that's done, inference runs as a local Python process with no further network calls.

## Side-by-side

| | NVIDIA Audio2Face-3D | LAM Audio2Expression |
|---|---|---|
| Free? | Not fully, limited free credits only | Yes |
| Maintained by | NVIDIA (commercial product) | Tongyi Lab / Alibaba (research release) |
| Avoids GPU strain on our end | Yes, if using the cloud (NVCF) option | No, always needs our own GPU |
| Online capable | Yes, via NVCF | No |
| Offline capable | Yes, via self-hosted NIM | Yes (the only option) |
| Python version | N/A (runs as a container) | 3.10 specifically |
| API | gRPC | None, CLI only |
| Tooling maturity | Fairly polished (Unreal plugin, Docker, cloud option) | Minimal (manual conda setup, hardcoded script) |

This difference in maturity is likely why `csv_converter.py` (Audio2Face's side) has a real CLI and reads shape names dynamically from the CSV header, while `parse_a2e.py` (LAM's side) has all 52 names hardcoded with no CLI at all. This does not seem to be a quality accident so much as a direct reflection of which tool is an actual product and which one is closer to a reference implementation attached to a paper.

## Sources
- [Audio2Face-3D NIM Documentation](https://docs.nvidia.com/nim/digital-human/a2f-3d/latest/index.html)
- [Audio2Face-3D Authoring Microservice docs](https://archive.docs.nvidia.com/ace/audio2face-3d-authoring-microservice/0.2/index.html)
- [Audio2Face-3D NIM Docker deploy page](https://build.nvidia.com/nvidia/audio2face-3d/docker)
- [ACE Unreal Plugin, Audio2Face integration](https://docs.nvidia.com/ace/ace-unreal-plugin/2.5/ace-unreal-plugin-audio2face.html)
- [LAM main repo](https://github.com/aigc3d/LAM)
- [LAM_Audio2Expression repo](https://github.com/aigc3d/LAM_Audio2Expression)
