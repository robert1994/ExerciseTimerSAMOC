/* WAVEFELD: native FM-1-target fixed-point DSP interface.
   MIT. Original waveforms. Not an installable firmware image.
   Integrate only through Dinghy's approved app_audio()/app_main() APIs.
   No float, no double, no malloc, no 64-bit division. */
#ifndef WAVEFELD_FM1_Q15_H
#define WAVEFELD_FM1_Q15_H
#include <stdint.h>
#define WFQ_VOICES 4u
#define WFQ_DELAY_SAMPLES 16384u
#define WFQ_SAMPLE_RATE 44100u
typedef struct {
    uint8_t wave_a,wave_b,pos_a,pos_b,mix,detune,cutoff,resonance;
    uint8_t amp_attack,amp_decay,amp_sustain,amp_release;
    uint8_t filter_attack,filter_decay,filter_sustain,filter_release,filter_depth;
    uint8_t lfo_rate,lfo_amount,delay,feedback,volume;
} WFQParams;
typedef struct {
    uint32_t phase_a,phase_b,inc_a,inc_b;
    uint32_t env_a,env_f;
    int32_t filt_1,filt_2;
    uint32_t age;
    uint8_t note,velocity,state_a,state_f;
} WFQVoice;
typedef struct {
    WFQVoice voice[WFQ_VOICES];
    WFQParams p;
    uint32_t lfo_phase,lfo_inc,tick;
    uint32_t attack_a,decay_a,release_a,attack_f,decay_f,release_f;
    uint32_t sustain_a,sustain_f;
    uint16_t delay_tap,feedback_q15,echo_mix_q15;
    uint16_t delay_index;
    uint8_t active_voices;
} WFQSynth;
void wfq_init(WFQSynth *s);
void wfq_params(WFQSynth *s,const WFQParams *p);
void wfq_note_on(WFQSynth *s,uint8_t note,uint8_t velocity);
void wfq_note_off(WFQSynth *s,uint8_t note);
void wfq_all_off(WFQSynth *s);
/* Add stereo Q15 to the zeroed Dinghy app_audio() interleaved buffer. */
void wfq_render(WFQSynth *s,int32_t *out,uint32_t frames);
#endif
