# WAVEFELD — actual M-VAVE FM-1 target

The native engine for the FM-1 is **[fm1_q15.c](fm1_q15.c)** + **[fm1_q15.h](fm1_q15.h)**. This uses fixed-point/integer DSP only. It targets **4 voices, 2 wavetable oscillators each, 1 filter each, two envelopes, a shared LFO and a 32 KiB echo**.

The older `dsp/wavefeld.c` file (in the private development repository) uses floating point and is **not suitable for the FM-1**. It is retained as a previous experiment only. Do not include it in a hardware build.

## Native source status

- **Validated:** Compiles with GCC on Ubuntu at -O2, -Wall, -Wextra, -Werror and UBSan; the four-voice host smoke test passes. The test reports 240 B for `WFQSynth` and 32,768 B for the shared delay buffer.
- **Not validated:** JieLi pi32v2 cross-compiler, Dinghy platform integration, actual on-device 5.8 ms audio deadline, USB MIDI routing, LCD rendering, storage/flash saving and rollback.
- **Not released:** No `.fwsc` image or installer; do **not flash** C source or browser files.

The browser demo is an approximate fixed-point-style AudioWorklet reference. It is **not the exact same source compiled to WASM**, unlike some FM-1 community firmware emulators.

## C host test

From repository root:

```sh
gcc -std=c11 -O2 -Wall -Wextra -Werror -pedantic -fsanitize=undefined \
  -fno-sanitize-recover=all fm1-wavefeld/firmware/fm1_q15.c \
  fm1-wavefeld/firmware/tests/q15_smoke.c -o /tmp/wavefeld-q15-smoke
/tmp/wavefeld-q15-smoke
```

The test lives in the [public website repository](https://github.com/robert1994/ExerciseTimerSAMOC/tree/master/fm1-wavefeld/firmware/tests) and runs automatically on GitHub Actions.

## Dinghy integration (next engineering milestone)

Use [zvenson/dinghy](https://github.com/zvenson/dinghy) as the FM-1 hardware platform, following GPL-3.0 requirements when distributing a linked firmware. In Dinghy's audio interrupt, `app_audio(int32_t *out,uint32_t n)` receives pre-cleared, interleaved stereo Q15 frames. An application-scoped `static WFQSynth` must be initialized in startup and `wfq_render(&synth,out,n)` can then add samples.

Map the real panel's 27 notes, 14 buttons and 7 encoders to the Wavefeld parameters. Keep a separate MASTER potentiometer controlled by Dinghy's platform. Main loop should call `platform_poll()` regularly, handle USB MIDI, and write note pitch/voice data before publishing a note-on gate to the ISR.

**Do not ship or flash this stage.** First check the native code for asynchronous UI/audio writes, then run the cross-toolchain build, linker RAM/pool limits, all available host regressions and real 4-voice worst-case timing. The target is **under 2.9 ms per 256-frame callback** (nominal callback window 5.8 ms). Consider reducing to three voices or further simplifying the filter if needed.

A full frame redraw is expensive on FM-1 SPI; only update changed areas of the 240 × 240 display. Save settings only during silence, because flash erase pauses audio. Settle the firmware package/update/recovery workflow before offering `.fwsc` downloads.

*This is an independent project; not Waldorf's firmware or wavetables.*
