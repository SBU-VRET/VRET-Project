# Text to VRMA and ARDY

Text-to-motion options for idle and body animation (Tech Pipeline Stage 7). Researched 11/20; not yet installed or run.

## Summary

- Text to VRMA includes ARDY as an engine and saves `.vrma` directly, so in practice they're one option.
- Runs on our laptop with no GPU, $0, offline.
- Main risk: 16 GB RAM is the minimum, and the laptop has exactly 16 GB.
- Licenses allow research and future clinical use, with credits.

## Text to VRMA

[github.com/Kirakun0328/text-to-vrma](https://github.com/Kirakun0328/text-to-vrma) · MIT

- **What:** the app. It provides the prompt screen, the VRM avatar preview, and the `.vrma` export. It doesn't make the motion itself; one of its two engines does, and you pick one per generation:
  - **ARDY engine** (default): NVIDIA's ARDY model runs locally and generates the movement. Mocap-quality, offline, no API key.
  - **LLM Keyframe engine:** a chatbot (ChatGPT, Claude…) writes a list of poses over the internet, and the app fills in the motion between them. Precise, but looks hand-animated. Needs a paid API key, and prompts leave the machine.
  - Optional mixed mode: a chatbot plans the segments and facial expressions while ARDY generates the body ("GPT is the brain, ARDY is the body"). Needs a ChatGPT/Codex plan. **"ARDY Only" (default, no chatbot) is the one we'd use.**

```
text ──► Text to VRMA ──► ARDY engine ─────────► motion ──► .vrma
                     └──► LLM Keyframe engine ──┘   (one or the other)
```
- **Inputs:** text prompt, optional length, optional walk waypoints.
- **Outputs:** `.vrma` (expressions optional), GIF, video.

## ARDY

[github.com/nv-tlabs/ardy](https://github.com/nv-tlabs/ardy) · NVIDIA + ETH Zürich, SIGGRAPH 2026

- **What:** research model that generates human motion from text, trained on 630 hours of studio mocap.
- **How:** Llama 3 (8B) encodes the prompt, then a diffusion model generates motion a few frames at a time.
- **Inputs:** text, plus optional paths, keyframe poses, or joint targets.
- **Outputs:** `.npz` joint data, not `.vrma`. Max 8 s per segment.
- **On its own:** only worth it for keyframe or joint-target control. Needs a 20–24 GB GPU on Linux, plus a converter we'd have to write.

## How it fits our project

1. Generate clips offline in Text to VRMA as `.vrma`, the same format as the CMU clips.
2. Compare them in `tools/vrma-viewer/` against the CMU picks (`139_02`, `113_21`, `77_02`). The viewer needs a small change to open outside files.
3. Play them through `A2FAvatar.applyVRMA()` (untested with these files).

Nothing runs at runtime or on the Quest. The app only plays the finished files.

## Hardware and dependencies

| | Text to VRMA (ARDY engine), laptop CPU | Text to VRMA (ARDY engine), NVIDIA GPU | Text to VRMA (LLM Keyframe engine) | ARDY alone |
|---|---|---|---|---|
| GPU | None | 4 GB+ VRAM | None | 20–24 GB VRAM |
| RAM | 16 GB min, 32 recommended | 16 GB+ | Any | 32 GB+ likely |
| Disk | ~35–40 GB | ~35–40 GB | Small | ~25–30 GB |
| OS | Windows/macOS/Linux | Same | Any | Linux only |
| Software | Node 20+, Python 3.10+, git, PyTorch 2.11, AVX2 CPU | Same + CUDA PyTorch | Node 20+, API key | Python 3.11, CUDA 12.6, CMake, C++ compiler |
| Setup | One installer, 20 GB download | Same | Minutes | Manual, needs Meta approval |
| Speed per clip | Tens of seconds or more | Seconds | Seconds | Seconds |

Our laptop: Intel Iris Xe (no NVIDIA GPU), 16 GB RAM, 234 GB free. Main computer: 4 GB VRAM GPU, 16 GB RAM.

## Adjusting to your computer

**Why memory matters:** ARDY uses Llama 3 (8B) to understand the prompt. It needs ~16 GB in one piece, in RAM (Text to VRMA's default, running on the CPU) or in VRAM (the GPU's own memory). The motion model itself only needs ~1.2 GB VRAM, or it can run on the CPU. Windows and apps already use ~4–6 GB of RAM.

Find your computer type below. Options are in order of preference.

### 1. 32 GB+ RAM (any GPU, or none): already enough

- Install and run as designed. Llama 3 goes in RAM.
- An NVIDIA GPU with 4 GB+ VRAM makes each clip take seconds instead of tens of seconds. Without one, everything runs on the CPU, slower.

### 2. NVIDIA GPU with 16 GB+ VRAM (e.g. lab PC, RTX 3090/4080/4090): already enough

- Llama 3 can sit on the GPU, which is the fastest setup. Text to VRMA picks the encoder's device through its `TEXT_ENCODER_DEVICE` setting.

### 3. 16 GB RAM + NVIDIA GPU with 4 GB+ VRAM (main computer)

The GPU handles the motion model. RAM is right at the minimum for Llama 3.
1. **Try as-is first.** Close the browser and other apps before generating.
2. **Bigger page file** (free): lets Windows spill memory onto the SSD. It runs, but each prompt may take minutes. Steps below.
3. **Upgrade to 32 GB RAM** (~$40–120; only possible if the RAM isn't soldered): turns this into type 1.
4. **Compress Llama 3 to 8-bit** (free; our modification): fits comfortably. Plan below.
5. **Colab Pro** (~$10 for a month).

### 4. 16 GB RAM, no NVIDIA GPU (dev laptop)

- Same options as type 3. Everything runs on the CPU, so expect each clip to take several times longer than on type 3.
- A RAM upgrade is often impossible on thin laptops, where RAM is soldered.

### 5. Under 16 GB RAM, or no suitable computer

- **Colab Pro** (~$10 for a month), or **a university machine.** Stony Brook research computing (SeaWulf) or a lab PC; ask your advisor or department.
- Compressing Llama 3 to 8-bit also works with as little as ~12 GB RAM.
- **Free Colab doesn't work as-is.** It has ~12–13 GB RAM and a 15 GB GPU, and both are too small for the full Llama 3. Every session also starts empty, so the 20 GB download and setup repeat each time.

### Check your computer

- **RAM:** Task Manager → Performance → Memory shows total GB and "Slots used: X of Y". Free slots usually mean it's upgradeable.
- **GPU:** Task Manager → Performance → GPU shows the name and "Dedicated GPU memory" (VRAM).
- **SSD or HDD:** Task Manager → Performance → Disk. The page file needs an SSD to be usable.
- **Max RAM supported** (PowerShell): `Get-CimInstance Win32_PhysicalMemoryArray | Select MaxCapacity, MemoryDevices`. MaxCapacity is in KB.

### Option details

**Bigger page file (Windows)**

1. Start → type "Advanced system settings" → **Performance: Settings…** → **Advanced** tab → **Virtual memory: Change…**
2. Uncheck **Automatically manage paging file size**.
3. Select the SSD drive (usually C:) → **Custom size**: Initial **16384** MB, Maximum **32768** MB → **Set** → **OK**.
4. Restart.

This needs ~32 GB free on that drive. To undo, re-check "Automatically manage".

**Colab Pro**

- ~$10/month for 100 "compute units". A T4 GPU with high RAM uses about 2 units per hour, so the month gives roughly 40–50 hours. Colab's rates change, so check before buying.
- Each session starts empty: ~15–25 min for the download and setup, then roughly 30–60 s per clip including a quick look.
- **A 2-hour session gives about 100 clips. The month covers 20+ sessions, far more clips than we need.** Session time is the limit, not clip count.
- It would run headless like our LAM `run_colab.sh`: Text to VRMA's API mode in the notebook, sending prompts and downloading `.vrma` files.

**Compressed Llama 3 (8-bit), on the main computer**

What changes:
- Llama 3 is stored at 8-bit precision instead of 16-bit, which halves its memory.
- One-time setup:
  1. Run Text to VRMA's normal installer. Its build step loads the full model once, so turn on the bigger page file for this step.
  2. Convert the built encoder to 8-bit and save it (~8 GB on disk).
  3. Make a small change to Text to VRMA's engine so it loads the 8-bit copy. Text to VRMA doesn't support this itself; it would be our patch.
- Everything else (the app, ARDY's motion model, `.vrma` export) is unchanged.

| Memory use while generating | Full Llama 3 | 8-bit Llama 3 |
|---|---|---|
| Windows + browser + app | ~4–6 GB RAM | ~4–6 GB RAM |
| Llama 3 text model | ~15–16 GB RAM | ~8–8.5 GB RAM |
| Python/PyTorch overhead | ~1–2 GB RAM | ~1–2 GB RAM |
| **Total RAM** | **~20–24 GB (doesn't fit 16)** | **~13–16 GB (fits, tight)** |
| ARDY motion model | ~1.2 GB VRAM (of 4) | ~1.2 GB VRAM (of 4) |
| Disk | ~35–40 GB | ~45 GB (keeps the full copy too) |

Evidence from a community test (ARDY issue #9, on an A100 GPU):
- **8-bit** cut the encoder from ~14–15 GB to ~7.6–8.5 GB and encoded faster (0.7 s vs 1.0 s).
- Motion stayed close to the full version. **"Rest" changed the least of the eight actions tested**, a good sign for idles. Falls and hit reactions changed the most.
- **4-bit** (~4.5–5.3 GB) changed what motion came out (a fall that stayed standing). Not recommended.

Caveats:
- That test ran on a GPU. 8-bit (~8.5 GB) doesn't fit in 4 GB VRAM, so here it would run in RAM on the CPU, with a different 8-bit method (PyTorch's built-in quantization) that nobody has tested on this model.
- We'd check quality ourselves: generate the same prompts with the full model once (page file on) and with 8-bit, and compare them in our viewer.
- Text to VRMA's server also has an undocumented "ARDY-mini" small encoder option. It needs encoder files that aren't published, so it isn't usable for now.

## Costs

- **CMU library:** $0, already done.
- **Text to VRMA (ARDY engine) on the laptop:** $0. Costs time and RAM.
- **Text to VRMA (ARDY engine) on a GPU:** $0 on a lab PC, or ~$10/month for Colab Pro.
- **Text to VRMA (LLM Keyframe engine):** paid per request (not measured), or a free tier.
- **ARDY alone:** ~$10/month for Colab Pro, or ~$0.30–0.80/hour for a rented GPU, plus setup work.

## Licensing

- **Text to VRMA** (MIT) and **ARDY code** (Apache-2.0): free.
- **ARDY weights** (NVIDIA Open Model Agreement): commercial use allowed, our outputs are ours, no medical restrictions.
- **Llama 3** (Meta Community License): free. Credit "Built with Meta Llama 3". The installer uses a public copy, so no Meta approval is needed.
- **Therapy use:** nothing in these licenses blocks it. Llama's no-practicing-medicine rule doesn't apply, since it only encodes motion text. The local engine keeps everything offline.
- **Credits needed** in anything shared or published: Llama 3 and NVIDIA.

## Limitations

- Subtle idles unproven. The examples are all big actions, and the prompt isn't always followed.
- Some foot sliding.
- Loops aren't baked into the export.
- Max 8 s per segment. Longer clips are chained.
- No awareness of objects in the scene.
- Young, single-developer tool. ARDY's training code is unreleased.

## Tradeoffs

| | CMU library | Text to VRMA (ARDY engine) | Text to VRMA (LLM Keyframe engine) |
|---|---|---|---|
| Quality | Real but old, noisy | Natural, modern mocap | Stiff, hand-made look |
| Custom motions | No | Any prompt | Any prompt |
| Cost | $0 | $0 | Per request |
| Offline | Yes | Yes | No |
| Risk | Known | 16 GB RAM may not be enough | Cost, privacy |

## Open questions

- Runs OK in 16 GB RAM, or do we need a GPU machine or Colab?
- Can it do convincing subtle idles?
- Do its `.vrma` files load correctly through `applyVRMA()`?
- Is there a lab PC with an NVIDIA GPU?

**Next:** install on the laptop, generate a few idles, compare with the CMU picks.
