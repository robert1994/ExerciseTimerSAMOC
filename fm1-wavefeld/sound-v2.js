/* WAVEFELD v0.2 browser synthesis engine. Independent, original DSP.
   No Waldorf firmware, factory wavetables, or samples are included. MIT. */
(()=>{"use strict";
const PI=Math.PI,TAU=2*PI,clip=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const log=(a,b,x)=>a*Math.pow(b/a,clip(x));
const hz=n=>440*Math.pow(2,(n-69)/12);
const BANKS=["ANALOG","FORMANT","GLASS","METAL","SILK","DIGITAL","CHORAL","ORGAN"];
const FTYPES=["lowpass","highpass","bandpass","notch"];
const SOURCES=["OFF","LFO 1","LFO 2","LFO 3","ENV 3","ENV 4","VELOCITY","MOD WHEEL"];
const TARGETS=["OFF","WT 1 POS","WT 2 POS","VCF 1","VCF 2","OSC 1 PITCH","OSC 2 PITCH","OSC 1 LEVEL","RING LEVEL","AMPLITUDE","PAN","REVERB"];
function defaultPatch(){
return {osc1Bank:0,osc1Pos:.35,osc1Level:.76,osc1Semi:.5,osc1Fine:.5,osc1Brill:.7,
osc2Bank:2,osc2Pos:.62,osc2Level:.52,osc2Semi:.5,osc2Fine:.55,osc2Brill:.72,
osc3Shape:2,osc3Level:.16,osc3Semi:.5,osc3Fine:.5,ring:.05,noise:.04,
f1Cut:.70,f1Res:.27,f1Type:0,f1Env:.41,f1Drive:.12,f1Key:.50,
f2Cut:.81,f2Res:.18,f2Type:0,f2Env:.26,f2Drive:.08,f2Key:.51,routing:0,
ampA:.52,ampD:.48,ampS:.74,ampR:.72,fltA:.42,fltD:.47,fltS:.26,fltR:.57,
e3A:.52,e3D:.66,e3S:.38,e3R:.68,e4A:.64,e4D:.61,e4S:.54,e4R:.72,
l1Rate:.23,l1Shape:0,l1Amt:.48,l1Sync:0,l2Rate:.17,l2Shape:0,l2Amt:.32,l2Sync:0,
l3Rate:.12,l3Shape:1,l3Amt:.1,l3Sync:0,
chorus:.36,chorusRate:.20,chorusDepth:.55,delay:.47,feedback:.46,delayMix:.25,reverb:.52,reverbSize:.67,output:.68,pan:.5,
tempo:.28,arpGate:.63,arpOct:.33,arpMode:0,arpProbability:.94,arpSteps:Array(16).fill(1),
matrix:Array.from({length:16},()=>({source:0,target:0,amount:.5,curve:.5}))};
}
class WavefeldEngine{
constructor(){this.ctx=null;this.nodes=null;this.voices=[];this.waveCache=new Map();this.patch=defaultPatch();this.modWheel=0;this.phase=[0,0,0];this.noiseBuffer=null;this.releaseTimers=new Set();this.voiceMax=6;}
static get banks(){return BANKS;}static get filters(){return FTYPES;}
static get sources(){return SOURCES;}static get targets(){return TARGETS;}
async start(){
if(this.ctx){await this.ctx.resume();return;}
const ctx=this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"});
const dry=ctx.createGain(),chorus=ctx.createDelay(.1),chorusGain=ctx.createGain(),
delay=ctx.createDelay(2),feedback=ctx.createGain(),delayGain=ctx.createGain(),
verb=ctx.createConvolver(),verbGain=ctx.createGain(),inbus=ctx.createGain(),
master=ctx.createGain(),compress=ctx.createDynamicsCompressor(),analyser=ctx.createAnalyser();
inbus.connect(dry).connect(master);
inbus.connect(chorus).connect(chorusGain).connect(master);
inbus.connect(delay).connect(feedback).connect(delay);
delay.connect(delayGain).connect(master);
inbus.connect(verb).connect(verbGain).connect(master);
master.connect(compress).connect(analyser).connect(ctx.destination);
compress.threshold.value=-9;compress.knee.value=10;compress.ratio.value=6;compress.attack.value=.004;compress.release.value=.25;
analyser.fftSize=256;
const len=Math.floor(ctx.sampleRate*3.5),ir=ctx.createBuffer(2,len,ctx.sampleRate);
for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++){
const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,2.0)*(ch===0?1:.91);}}verb.buffer=ir;
const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);let state=314159265;
const d=noise.getChannelData(0);for(let i=0;i<d.length;i++){state=(1664525*state+1013904223)>>>0;d[i]=(state/2147483647)-1;}
this.noiseBuffer=noise;
this.nodes={inbus,dry,chorus,chorusGain,delay,feedback,delayGain,verbGain,master,analyser};
this.update();
}
bankWave(bank,pos,brightness){
const ctx=this.ctx;const frame=Math.round(clip(pos)*63),bright=Math.round(clip(brightness)*15);
const k=[bank,frame,bright].join(":");if(this.waveCache.has(k))return this.waveCache.get(k);
const real=new Float32Array(65),imag=new Float32Array(65),t=frame/63;
for(let h=1;h<=64;h++){
let a=0;
switch(bank){
case 0:a=(1-t)*1/h+(t/(h*h))*(h%2?1:0);break;
case 1:{const c=3+t*25;a=(.22/h)+1.3*Math.exp(-Math.pow((h-c)/(1+c*.12),2))/Math.sqrt(h);break;}
case 2:a=([1,2,4,7,11,16,23,31,43].includes(h)?1/Math.pow(h,.42):.06/h)*(.2+.8*Math.pow(Math.sin(h*.4+t*PI*2),2));break;
case 3:a=([1,3,6,10,15,21,28,36,45,55].includes(h)?1/Math.pow(h,.56):.008/h)*(0.45+0.55*Math.cos(h*t*2));break;
case 4:a=((1-t)*Math.pow(h,-1.5)+t*(h%2?1/(h*h):.02/h));break;
case 5:a=(Math.sin(h*(.3+t*1.7))>0?1:.12)/Math.pow(h,.65+t*.85);break;
case 6:{const v1=3+7*t,v2=11+22*t;a=.1/h+Math.exp(-Math.pow((h-v1)/3.3,2))/Math.sqrt(h)+.7*Math.exp(-Math.pow((h-v2)/5,2))/Math.sqrt(h);break;}
default:a=([1,2,3,4,5,6,8,10,12,16].includes(h)?1/Math.pow(h,1.2+t):0);
}
const highFreqCut=Math.exp(-Math.pow(h/(7+bright*4),2));imag[h]=a*highFreqCut;
}
const w=ctx.createPeriodicWave(real,imag,{disableNormalization:false});
if(this.waveCache.size>600)this.waveCache.delete(this.waveCache.keys().next().value);
this.waveCache.set(k,w);return w;
}
static envValue(age,A,D,S,R,offAge){
A=log(.005,7,A);D=log(.03,12,D);R=log(.05,15,R);
const raw=(x)=>x<A?x/A:(x<A+D?1-(1-S)*(x-A)/D:S);
if(offAge!==null){const e=raw(Math.max(0,offAge));return e*Math.exp(-Math.max(0,age-offAge)/(R*.38));}
return raw(age);
}
lfo(ix,t){
const p=this.patch;const rate=log(.018,12,p["l"+(ix+1)+"Rate"]);
const phase=t*rate%1,shape=p["l"+(ix+1)+"Shape"];
if(shape===1)return 1-4*Math.abs(phase-.5);
if(shape===2)return phase*2-1;
if(shape===3)return phase<.5?1:-1;
return Math.sin(TAU*phase);
}
modFor(voice,at){
const p=this.patch,vals=new Float32Array(TARGETS.length);
for(const slot of p.matrix||[]){const src=SOURCES[slot.source|0],target=slot.target|0;
if(!src||src==="OFF"||!target||!TARGETS[target])continue;
let s=0;
if(src.startsWith("LFO"))s=this.lfo(Number(src.slice(-1))-1,at);
else if(src==="ENV 3")s=WavefeldEngine.envValue(at-voice.at,p.e3A,p.e3D,p.e3S,p.e3R,voice.offAt===null?null:voice.offAt-voice.at);
else if(src==="ENV 4")s=WavefeldEngine.envValue(at-voice.at,p.e4A,p.e4D,p.e4S,p.e4R,voice.offAt===null?null:voice.offAt-voice.at);
else if(src==="VELOCITY")s=voice.velocity/127;
else if(src==="MOD WHEEL")s=this.modWheel;
s=Math.sign(s)*Math.pow(Math.abs(s),.6+(1-slot.curve)*1.4);
vals[target]+=s*(slot.amount*2-1);
}return vals;
}
noteOn(note,velocity=100,when){
if(!this.ctx)return null;
const ctx=this.ctx,p=this.patch,t=Math.max(ctx.currentTime,when??ctx.currentTime);
let active=this.voices.filter(v=>!v.dead);if(active.length>=this.voiceMax){
active.sort((a,b)=>a.at-b.at);this.release(active[0],t,.04);}
const bus=ctx.createGain(),wa=ctx.createOscillator(),wb=ctx.createOscillator(),wc=ctx.createOscillator(),
ga=ctx.createGain(),gb=ctx.createGain(),gc=ctx.createGain(),
ring=ctx.createGain(),gr=ctx.createGain(),no=ctx.createBufferSource(),gn=ctx.createGain(),
drive=ctx.createWaveShaper(),drive2=ctx.createWaveShaper(),f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),
fs=ctx.createGain(),fd=ctx.createGain(),fp1=ctx.createGain(),fp2=ctx.createGain(),
amp=ctx.createGain(),ampMod=ctx.createGain(),pan=ctx.createStereoPanner();
const base=hz(note),semi=v=>Math.round((v-.5)*48);
wa.frequency.value=base*Math.pow(2,semi(p.osc1Semi)/12);
wb.frequency.value=base*Math.pow(2,semi(p.osc2Semi)/12);
wc.frequency.value=base*Math.pow(2,semi(p.osc3Semi)/12);
wa.detune.value=(p.osc1Fine-.5)*80;wb.detune.value=(p.osc2Fine-.5)*80;wc.detune.value=(p.osc3Fine-.5)*80;
wa.setPeriodicWave(this.bankWave(p.osc1Bank,p.osc1Pos,p.osc1Brill));
wb.setPeriodicWave(this.bankWave(p.osc2Bank,p.osc2Pos,p.osc2Brill));
wc.type=["sine","triangle","sawtooth","square"][p.osc3Shape|0]||"sawtooth";
ga.gain.value=p.osc1Level*.38;gb.gain.value=p.osc2Level*.38;gc.gain.value=p.osc3Level*.33;
wa.connect(ga).connect(bus);wb.connect(gb).connect(bus);wc.connect(gc).connect(bus);
ring.gain.value=0;wa.connect(ring);wb.connect(ring.gain);ring.connect(gr).connect(bus);gr.gain.value=p.ring*.15;
no.buffer=this.noiseBuffer;no.loop=true;no.connect(gn).connect(bus);gn.gain.value=p.noise*.17;
const curve=new Float32Array(513);const boost=1+p.f1Drive*7;
for(let i=0;i<curve.length;i++){let x=i/256-1;curve[i]=Math.tanh(x*boost)/Math.tanh(boost);}
drive.curve=curve;drive.oversample="2x";
const curve2=new Float32Array(513);const boost2=1+p.f2Drive*7;
for(let i=0;i<curve2.length;i++){const x=i/256-1;curve2[i]=Math.tanh(x*boost2)/Math.tanh(boost2);}
drive2.curve=curve2;drive2.oversample="2x";
bus.connect(drive);drive.connect(f1);f1.connect(fs).connect(f2);drive.connect(fd).connect(f2);
f1.connect(fp1).connect(amp);f2.connect(drive2).connect(fp2).connect(amp);
f1.type=FTYPES[p.f1Type|0]||"lowpass";f2.type=FTYPES[p.f2Type|0]||"lowpass";
f1.Q.value=.5+p.f1Res*18;f2.Q.value=.5+p.f2Res*18;
f1.frequency.value=log(45,14500,p.f1Cut);f2.frequency.value=log(45,14500,p.f2Cut);
amp.gain.value=0;amp.connect(ampMod).connect(pan).connect(this.nodes.inbus);
const a=log(.005,7,p.ampA),d=log(.03,12,p.ampD),peak=.68*(velocity/127);
amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(peak,t+a);
amp.gain.setTargetAtTime(peak*p.ampS,t+a,d/3);
pan.pan.value=(p.pan-.5)*1.5;
const voice={note,velocity,at:t,offAt:null,wa,wb,wc,ga,gb,gc,ring,gr,no,gn,drive,drive2,f1,f2,fs,fd,fp1,fp2,amp,ampMod,pan,
dead:false,last1:-99,last2:-99,lastDrive1:-99,lastDrive2:-99,releaseTimer:null};
this.voices.push(voice);wa.start(t);wb.start(t);wc.start(t);no.start(t);
this.applyVoice(voice,t);return voice;
}
noteOff(note,when){if(!this.ctx)return;for(const v of this.voices)if(v.note===note&&!v.dead&&v.offAt===null)this.release(v,when??this.ctx.currentTime);}
release(v,when,override){
if(!v||v.dead||!this.ctx)return;const p=this.patch,ctx=this.ctx,t=Math.max(ctx.currentTime,when??ctx.currentTime);
v.dead=true;v.offAt=t;
const r=override??log(.05,15,p.ampR);
v.amp.gain.cancelScheduledValues(t);
v.amp.gain.setTargetAtTime(0,t,Math.max(.01,r/4));
const stop=t+r*1.55+.06;
try{v.wa.stop(stop);v.wb.stop(stop);v.wc.stop(stop);v.no.stop(stop);}catch(e){}
const timer=setTimeout(()=>{
for(const n of [v.wa,v.wb,v.wc,v.no,v.ga,v.gb,v.gc,v.ring,v.gr,v.gn,v.drive,v.drive2,v.f1,v.f2,v.fs,v.fd,v.fp1,v.fp2,v.amp,v.ampMod,v.pan]){
try{n.disconnect();}catch(e){}}
this.voices=this.voices.filter(x=>x!==v);this.releaseTimers.delete(timer);
},Math.min(26000,Math.max(25,(stop-ctx.currentTime+.1)*1000)));
this.releaseTimers.add(timer);
}
allOff(){for(const v of [...this.voices])this.release(v,this.ctx?.currentTime??0,.04);}
applyVoice(v,t){
if(v.dead)return;const p=this.patch,m=this.modFor(v,t);
const lp1=this.lfo(0,t),lp2=this.lfo(1,t),lp3=this.lfo(2,t);
const one=clip(p.osc1Pos+lp1*p.l1Amt*.24+m[1]*.4);
const two=clip(p.osc2Pos-lp1*p.l1Amt*.19+m[2]*.4);
let ix1=(p.osc1Bank|0)*10000+Math.round(one*63)*100+Math.round(p.osc1Brill*15),ix2=(p.osc2Bank|0)*10000+Math.round(two*63)*100+Math.round(p.osc2Brill*15);
if(ix1!==v.last1){v.wa.setPeriodicWave(this.bankWave(p.osc1Bank,one,p.osc1Brill));v.last1=ix1;}
if(ix2!==v.last2){v.wb.setPeriodicWave(this.bankWave(p.osc2Bank,two,p.osc2Brill));v.last2=ix2;}
const amod=lp3*p.l3Amt*36,semi=x=>Math.round((x-.5)*48);
v.wa.frequency.setTargetAtTime(hz(v.note)*Math.pow(2,semi(p.osc1Semi)/12),t,.014);
v.wb.frequency.setTargetAtTime(hz(v.note)*Math.pow(2,semi(p.osc2Semi)/12),t,.014);
v.wc.frequency.setTargetAtTime(hz(v.note)*Math.pow(2,semi(p.osc3Semi)/12),t,.014);
v.wa.detune.setTargetAtTime((p.osc1Fine-.5)*80+amod+m[5]*200,t,.04);
v.wb.detune.setTargetAtTime((p.osc2Fine-.5)*80+amod+m[6]*200,t,.04);
v.wc.detune.setTargetAtTime((p.osc3Fine-.5)*80+amod,t,.04);
v.ga.gain.setTargetAtTime(clip(p.osc1Level+m[7]*.5)*.38,t,.04);
v.gb.gain.setTargetAtTime(p.osc2Level*.38,t,.04);
v.gc.gain.setTargetAtTime(p.osc3Level*.33,t,.04);
v.gr.gain.setTargetAtTime(clip(p.ring+m[8]*.3)*.15,t,.04);
v.gn.gain.setTargetAtTime(p.noise*.17,t,.04);
for(const [node,driveVal,field] of [[v.drive,p.f1Drive,"lastDrive1"],[v.drive2,p.f2Drive,"lastDrive2"]]){
const boost=Math.round(driveVal*100);if(v[field]!==boost){
const k=1+driveVal*7,curve=new Float32Array(513);for(let i=0;i<curve.length;i++){const x=i/256-1;curve[i]=Math.tanh(x*k)/Math.tanh(k);}
node.curve=curve;v[field]=boost;
}}
const delta=Math.max(0,t-v.at);
const env=WavefeldEngine.envValue(delta,p.fltA,p.fltD,p.fltS,p.fltR,v.offAt===null?null:v.offAt-v.at);
const c1=clip(p.f1Cut+p.f1Env*(env-.3)*.34+lp2*p.l2Amt*.18+m[3]*.22+(v.note-60)*(p.f1Key-.5)*.012);
const c2=clip(p.f2Cut+p.f2Env*(env-.3)*.34+lp2*p.l2Amt*.12+m[4]*.22+(v.note-60)*(p.f2Key-.5)*.012);
v.f1.frequency.setTargetAtTime(log(45,14500,c1),t,.035);
v.f2.frequency.setTargetAtTime(log(45,14500,c2),t,.035);
v.f1.Q.setTargetAtTime(.5+p.f1Res*18,t,.03);
v.f2.Q.setTargetAtTime(.5+p.f2Res*18,t,.03);
v.f1.type=FTYPES[p.f1Type|0]||"lowpass";v.f2.type=FTYPES[p.f2Type|0]||"lowpass";
const serial=(p.routing|0)===0;
v.fs.gain.setTargetAtTime(serial?1:0,t,.04);v.fd.gain.setTargetAtTime(serial?0:1,t,.04);
v.fp1.gain.setTargetAtTime(serial?0:.55,t,.04);
v.fp2.gain.setTargetAtTime(serial?1:.55,t,.04);
v.pan.pan.setTargetAtTime(clip((p.pan-.5)*1.6+m[10]*.6,-1,1),t,.04);
v.ampMod.gain.setTargetAtTime(clip(1+m[9]*.55,.05,1.6),t,.04);
}
update(){
if(!this.ctx)return;const p=this.patch,n=this.nodes,t=this.ctx.currentTime;
n.chorus.delayTime.setTargetAtTime(.005+p.chorusDepth*.019,t,.03);
n.chorusGain.gain.setTargetAtTime(p.chorus*.33,t,.04);
n.delay.delayTime.setTargetAtTime(.09+p.delay*1.65,t,.03);
n.feedback.gain.setTargetAtTime(p.feedback*.77,t,.03);
n.delayGain.gain.setTargetAtTime(p.delayMix*.55,t,.03);
n.verbGain.gain.setTargetAtTime(clip(p.reverb)*.85,t,.03);
n.master.gain.setTargetAtTime(p.output*.65,t,.04);
}
tick(t){
if(!this.ctx)return;this.update();
const n=this.nodes,p=this.patch;
n.chorus.delayTime.setTargetAtTime(.009+p.chorusDepth*.006*Math.sin(TAU*t*log(.08,3,p.chorusRate)),t,.02);
let wet=0,voices=0;
for(const v of this.voices)if(!v.dead){this.applyVoice(v,t);wet+=this.modFor(v,t)[11];voices++;}
if(voices)n.verbGain.gain.setTargetAtTime(clip(p.reverb+(wet/voices)*.33)*.85,t,.05);
}
};
window.WavefeldEngine=WavefeldEngine;
})();