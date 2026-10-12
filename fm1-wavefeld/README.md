# WAVEFELD v0.2 — wavetable ambient synth

**[Play the synthesizer online](https://robert1994.github.io/ExerciseTimerSAMOC/fm1-wavefeld/)**

Independent Blofeld-inspired instrument for modern browsers, intended as a research prototype for a future M-VAVE FM-1 hardware build. Not Waldorf firmware and not yet flashable.

## Browser

Open `index.html` using a local static server, or use the GitHub Pages link. There are currently **45 individual synthesis pages** organized into seven sections. Keep `sound-v2.js` and `app-v2.js` in the same directory. No third-party scripts, external wavetables, or sound samples are required.

1. Click **Switch on audio**. Browser audio must be unlocked by a user gesture.
2. Choose a sound in the **Preset** menu or start with **A01 GLASS CATHEDRAL**.
3. Play via the onscreen keyboard or Z–M keys. Hold **SPACE** for no action; a single press toggles the arpeggiator.
4. Use menu category buttons and the two menu dropdowns to explore the detailed editor. **[** and **]** move backward/forward through the pages.
5. Use **Save locally** (browser localStorage) or **Export patch** (v2 JSON) for backups. Reimport exported v2 JSON through **Import patch**.

### Approximate sound engine

- Two procedurally generated wavetable oscillators, each with **eight original spectral families**, 64 quantized morph positions, brilliance, pitch and level; a third virtual-analogue oscillator; noise and ring modulation.
- Two independently configured resonant biquad filters (LP/HP/BP/notch), with serial/parallel routing, two saturating drive stages and filter ADSR modulation.
- Four ADSR envelope pages and three selectable-shape LFOs (amp and filter envelopes are direct; ENV 3 and 4 available in the matrix).
- Six-voice Web Audio polyphony; sixteen modulation routes with source, destination, amount and curvature, with wavetable, pitch, filter, oscillator level, ring, amplitude, pan and reverb destinations.
- Chorus, feedback delay and generated convolution reverb; eight original ambient presets, arpeggiator with 16 gate steps and optional Web MIDI input / note output.
- The browser uses Web Audio oscillator band-limiting where available, **not a cycle-accurate Waldorf wavetable interpolation or filter implementation**.

### Current limitations

- Controls tagged `*` in menus are planned/inactive: LFO sync and reverb size. They can be edited but are not connected to the synthesis engine.
- LFO phase is currently shared across voices, not per-voice as in the actual Blofeld; filter models, stereo routing and modulation scaling remain approximate.
- No original Blofeld factory wavetables or presets, and no Blofeld SysEx import. An exact Waldorf sound clone is not claimed.
- Polyphony and effects performance on the desktop browser does **not** establish performance on the FM-1 processor.
- The Web MIDI selector currently takes the first input and first output, rather than exposing a device selection menu.

## Sources

- `index.html`: interface shell and main site styling
- `sound-v2.js`: original browser wavetable, voices, filters, envelopes and FX
- `app-v2.js`: menu system, presets, MIDI, local patch storage and arpeggiator
- `firmware/dsp`: native portable C DSP **scaffold**, separate from the browser code; no flashable binary
- `firmware/tests`: C smoke test source, which still requires local compilation/execution

## Hosting and privacy

Live demonstration is published from the public `robert1994/ExerciseTimerSAMOC` repository under `/fm1-wavefeld/`. Development source also lives in the private `robert1994/waldorf/fm1-wavefeld` folder; the private Blofeld SysEx backup remains private. Do not publish the entire private `waldorf` repository.

## Not affiliated

Original code and procedurally generated spectral shapes; this project is neither affiliated with nor endorsed by Waldorf Music, M-VAVE or 1010music. Waldorf and Blofeld names refer to the inspiration, not product origin. Source license: [MIT](LICENSE).