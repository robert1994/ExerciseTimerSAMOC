/* Wavefeld FM-1 Q15 portable-host smoke test. Compile with GCC/Clang. */
#include "../fm1_q15.h"
#include <stdio.h>
#include <stdint.h>
static WFQSynth s;
static int32_t audio[256*2];
static void block(void){
    unsigned i;
    for(i=0;i<512;i++)audio[i]=0;
    wfq_render(&s,audio,256);
}
int main(void){
    unsigned k,i;
    uint64_t energy=0;
    wfq_init(&s);
    if(sizeof(s)>8192u){fprintf(stderr,"synth state too large: %lu\n",(unsigned long)sizeof(s));return 1;}
    wfq_note_on(&s,60,110);
    wfq_note_on(&s,64,100);
    wfq_note_on(&s,67,100);
    wfq_note_on(&s,72,95);
    for(k=0;k<240;k++){
        block();
        for(i=0;i<512;i++){
            int32_t a=audio[i];
            if(a < -32768 || a > 32767){fprintf(stderr,"clipping at %u/%u: %d\n",k,i,a);return 2;}
            energy+=(uint64_t)(a<0?-a:a);
        }
    }
    if(energy<1000000ull){fprintf(stderr,"silence: %llu\n",(unsigned long long)energy);return 3;}
    wfq_all_off(&s);
    for(k=0;k<2800;k++)block();
    for(i=0;i<WFQ_VOICES;i++){
        if(s.voice[i].state_a){fprintf(stderr,"voice %u failed to release\n",i);return 4;}
    }
    printf("WAVEFELD FM1 Q15 PASS: %lu-byte state, 32768-byte pool echo, energy=%llu\n",
           (unsigned long)sizeof(s),(unsigned long long)energy);
    return 0;
}
