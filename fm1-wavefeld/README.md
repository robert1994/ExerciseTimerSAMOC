# WAVEFELD FM-1 — hardware-first target (v0.3)

**[Play the FM-1 constrained browser instrument](https://robert1994.github.io/ExerciseTimerSAMOC/fm1-wavefeld/)**

This is the default project. It replaces the unrealistic large desktop UI with a **240 × 240 LCD and the same input counts as the real M-VAVE FM-1**. The earlier more complex Web Audio prototype remains at [desktop-v2.html](./desktop-v2.html), but **that experiment is not a hardware design**.

## FM-1's documented resources

Based on [Dinghy API](https://github.com/zvenson/dinghy/blob/main/docs/API.md) and [chip rules](https://github.com/zvenson/dinghy/blob/main/docs/RULES.md):

| Resource | Hardware/documented limit | Conservative WAVEFELD choice |
|---|---|---|
| Screen | 240 × 240, RGB565 | 240 × 240 simulated canvas; redrawn on parameter changes |
| Physical inputs | 27 keys, 14 buttons, 7 encoders and MASTER pot | 27 keys / 14 buttons / 7 encoders simulated; 2 reserved buttons inactive |
| Audio | 256 frames per ISR, 44.1 kHz, nominal 5.8 ms | 4 voices, 2 oscillators per voice, 1 filter/voice |
| Processor | JieLi AC791N, no hardware floating point | Native C source uses integer-only Q-format math and precomputed tables |
| Application data + BSS | 96 KB | Static lightweight voice and parameter state (actual linker use **not measured**) |
| Buffer pool | 336 KB | 16,384 × int16 = **32,768 bytes** reserved for a shared echo |
| Code & constants | ~568 KB application area | Small const wavetable and LUTs (binary size **not measured**) |
| Settings | Up to 256 bytes in Dinghy platform | Browser saves to localStorage; FM-1 settings integration not yet implemented |

**CPU acceptance criterion:** On real FM-1 hardware, 256 samples must complete below the 5.8 ms audio deadline; target under **2.9 ms per block** to keep margin for USB and panel interrupts. This has **not** been measured. Host tests are not a substitute.

## Synthesis that fits the plan

- **Four voices** (a conservative design limit; measured maximum on-device still unknown)
- Two 128-sample table oscillators per voice, morphing between eight **original** harmonic shapes, with simple detune
- One resonant two-pole low-pass per voice; AMP and filter ADSR envelopes
- One shared sine LFO for wavetable scanning
- One small shared mono feedback echo, copied to stereo (not true stereo effects)
- No sample playback, granular engine, full Blofeld modulation matrix, second filter, convolution reverb or sophisticated sequencer

### Current browser / native distinction

1. **Browser online:** `index.html` loads `fm1-ui.js` and `fm1-worklet.js`. The worklet uses typed integer tables and Q15-like arithmetic in its render loop. JavaScript/AudioWorklet has a browser runtime and is **not a CPU-accurate emulator** of the FM-1.
2. **Native source:** `firmware/fm1_q15.c` + `.h` implement a portable, **no-float**, four-voice Q15 DSP prototype. The tables and audio design are similar to, **not binary-identical to**, the browser version.
3. **Actual physical device:** no Dinghy app_main/app_audio/panel/midi binding, JieLi firmware package, measured ISR runtime, power-cycle retention or flash-safe installation yet. Do **not** try to flash source or browser files.

Host C test: [firmware/tests/q15_smoke.c](firmware/tests/q15_smoke.c). Automated workflow: [Wavefeld FM-1 Q15 host tests](https://github.com/robert1994/ExerciseTimerSAMOC/actions/workflows/wavefeld-fm1-q15.yml).

### Real FM-1 control plan

- SELECT encoder: section
- ALGORITHM encoder: page within selected section
- PRESETS encoder: choose factory/user sounds
- KNOB 1–4: four parameters on current 240-pixel LCD page
- OCT− / OCT+: keyboard transpose
- EDIT / ENV / LFO / FX / GLO / HOME: jump to synthesis pages
- SAVE: browser USER patch (hardware flash saving deferred until voices silent)
- PLAY: four-voice drone, ARP: minimal four-note arpeggiator
- SEQ / REC: unassigned, **not claimed to work**

USB MIDI: browser may accept MIDI from a connected computer keyboard via Web MIDI. On hardware, native USB-MIDI via Dinghy should eventually allow the Blackbox's USB-A DEVICE port to act as the host. Actual end-to-end FM-1 ↔ original Blackbox compatibility is not tested.

## Firmware-build roadmap

1. Native Q15 host smoke test and undefined-behaviour checking.
2. Import this C core into a *properly licensed* Dinghy fork, respecting Dinghy's GPL-3.0 distribution obligations.
3. Map FM-1 input/LED/screen and USB MIDI via Dinghy platform APIs; implement parameter updates safely across ISR/main-loop boundaries.
4. Optimize per-voice filter coefficient refresh and costly divisions outside the per-sample ISR loop.
5. Build with JieLi AC79 toolchain; pass Dinghy RAM/pool/ROM and illegal-instruction checks.
6. **Measure** worst-case four-voice render time on actual hardware; test USB and power-on recovery; reduce polyphony if necessary.
7. Only then build an installable `.fwsc` package and provide reversible USB installation instructions.

**Sound fidelity:** This is a compact, original wavetable instrument influenced by Waldorf's evolving tone design. It contains none of Waldorf's proprietary firmware, factory wavetables or preset data. An identical Blofeld sound is not guaranteed or claimed. Not affiliated with Waldorf or M-VAVE.

License for original Wavefeld source: MIT. Dinghy integration would need GPL-3.0 compliance.
