/* WAVEFELD FM-1 Target v0.3 — browser audio worklet.
   Fixed-point-style reference, original harmonic tables, no Waldorf content.
   This JavaScript is NOT the native FM-1 C binary. MIT. */
class FM1WavefeldProcessor extends AudioWorkletProcessor {
constructor(){
super();
this.p={waveA:2,waveB:5,posA:55,posB:63,mix:57,detune:65,cutoff:82,res:31,
aAttack:67,aDecay:55,aSustain:89,aRelease:78,
fAttack:38,fDecay:65,fSustain:30,fRelease:60,fDepth:48,
lfoRate:35,lfoAmount:40,delay:70,feedback:48,volume:85};
this.voices=Array.from({length:4},()=>this.emptyVoice());this.tables=new Int16Array(8*128);
this.lfoTable=new Int16Array(256);this.cutTable=new Int16Array(128);
this.noteIncrements=new Uint32Array(128);this.delayBuffer=new Int16Array(16384);
this.di=0;this.lfoPhase=0;this.lfoInc=0;this.lfoValue=0;this.counter=0;
for(let n=0;n<128;n++)this.noteIncrements[n]=Math.round(440*Math.pow(2,(n-69)/12)*4294967296/sampleRate)>>>0;
for(let i=0;i<256;i++)this.lfoTable[i]=Math.round(32767*Math.sin(i*2*Math.PI/256));
for(let c=0;c<128;c++){
let freq=70*Math.pow(11000/70,c/127);
this.cutTable[c]=Math.min(32000,Math.round((1-Math.exp(-2*Math.PI*freq/sampleRate))*32767));
}
for(let kind=0;kind<8;kind++){
let peak=0,buf=new Float64Array(128);
for(let i=0;i<128;i++){let v=0;
for(let h=1;h<=18;h++){let amp=0;
switch(kind){
case 0:amp=h===1?1:0;break;
case 1:amp=h%2?1/(h*h):0;break;
case 2:amp=1/h;break;
case 3:amp=h%2?1/h:0;break;
case 4:amp=[1,3,5,7,11,15].includes(h)?1/Math.sqrt(h):0;break;
case 5:amp=[1,4,7,12,17].includes(h)?1/Math.sqrt(h):0;break;
case 6:amp=.2/h+Math.exp(-Math.pow((h-5)/2.5,2))*.45;break;
default:amp=[1,2,3,4,5,8,12,16].includes(h)?1/Math.pow(h,1.4):0;
}
v+=amp*Math.sin(i*2*Math.PI*h/128);
}buf[i]=v;peak=Math.max(peak,Math.abs(v));}
for(let i=0;i<128;i++)this.tables[kind*128+i]=Math.round(buf[i]/Math.max(.01,peak)*24576);
}
this.configure();
this.port.onmessage=e=>{const msg=e.data||{};
if(msg.type==="param"&&Object.prototype.hasOwnProperty.call(this.p,msg.name)){
const val=Number(msg.value);
if(Number.isFinite(val)){this.p[msg.name]=Math.max(0,Math.min(127,Math.round(val)));this.configure();}
}else if(msg.type==="on")this.noteOn(msg.note|0,msg.velocity|0);
else if(msg.type==="off")this.noteOff(msg.note|0);
else if(msg.type==="panic"){for(const v of this.voices)v.state=0;this.delayBuffer.fill(0);}
};
}
emptyVoice(){return {state:0,note:0,phase1:0,phase2:0,inc1:0,inc2:0,amp:0,fil:0,fstate:0,s1:0,s2:0,coeff:10000,born:0,releaseStep:1,fReleaseStep:1,velocity:100};}
static bounded(n){return n<0?0:n>32767?32767:n|0;}
configure(){
const p=this.p,rate=sampleRate;
const secs=(v,max,min=.005)=>min*Math.pow(max/min,v/127);
this.aStep=Math.max(1,Math.floor(16777216/(rate*secs(p.aAttack,4.0))));
this.dStep=Math.max(1,Math.floor(16777216/(rate*secs(p.aDecay,8,.03))));
this.rStep=Math.max(1,Math.floor(16777216/(rate*secs(p.aRelease,12,.04))));
this.fAStep=Math.max(1,Math.floor(16777216/(rate*secs(p.fAttack,4))));
this.fDStep=Math.max(1,Math.floor(16777216/(rate*secs(p.fDecay,8,.03))));
this.fRStep=Math.max(1,Math.floor(16777216/(rate*secs(p.fRelease,10,.04))));
this.aSustain=Math.round(p.aSustain*16777216/127);
this.fSustain=Math.round(p.fSustain*16777216/127);
this.lfoInc=Math.round((.015*Math.pow(7/.015,p.lfoRate/127))*4294967296/rate)>>>0;
this.delayTap=3072+Math.round(p.delay/127*12900);
this.delayFeedback=Math.round((p.feedback/127)*21000);
this.delayMix=Math.round((p.delay/127)*14000);
}
noteOn(note,velocity){
if(note<0||note>127)return;let v=this.voices.find(x=>!x.state);
if(!v)v=this.voices.reduce((a,b)=>a.amp<=b.amp?a:b);
v.state=1;v.fstate=1;v.note=note;v.phase1=0;v.phase2=0;v.amp=0;v.fil=0;v.s1=0;v.s2=0;v.velocity=Math.max(1,Math.min(127,velocity||100));v.born=++this.counter;
v.inc1=this.noteIncrements[note];const cents=(this.p.detune-64)*.7;
v.inc2=Math.round(v.inc1*Math.pow(2,cents/1200))>>>0;
}
noteOff(note){for(const v of this.voices){if(v.state&&v.note===note){v.state=4;v.fstate=4;v.releaseStep=Math.max(1,Math.floor(v.amp/(Math.max(1,Math.floor(16777216/this.rStep)))));v.fReleaseStep=Math.max(1,Math.floor(v.fil/(Math.max(1,Math.floor(16777216/this.fRStep)))));}}}
envUpdate(v,part){
const isAmp=part==="amp",stateKey=isAmp?"state":"fstate",envKey=isAmp?"amp":"fil";
let state=v[stateKey],value=v[envKey];if(!state)return;
const a=isAmp?this.aStep:this.fAStep,d=isAmp?this.dStep:this.fDStep,s=isAmp?this.aSustain:this.fSustain,r=isAmp?v.releaseStep:v.fReleaseStep;
if(state===1){value+=a;if(value>=16777216){value=16777216;state=2;}}
else if(state===2){value-=d;if(value<=s){value=s;state=3;}}
else if(state===3)value=s;
else if(state===4){value-=Math.max(1,r);if(value<=0){value=0;state=0;}}
v[envKey]=value;v[stateKey]=state;
}
getWave(bank,phase,pos){
const point=((phase>>>25)&127),m=Math.max(0,Math.min(127,pos))*7;
let i=(m/127)|0;if(i>6)i=6;
const frac=((m-i*127)*32767/127)|0,a=this.tables[i*128+point],b=this.tables[(i+1)*128+point];
/* bank offsets the original harmonic families, wraps across the family table */
const first=(i+(bank|0))&7,second=(first+1)&7;
const sampleA=this.tables[first*128+point],sampleB=this.tables[second*128+point];
return sampleA+(((sampleB-sampleA)*frac)>>15);
}
process(_inputs,outputs){
const out=outputs[0];if(!out||!out[0])return true;
const left=out[0],right=out[1]||left,p=this.p;
const mix=((p.mix*32767)/127)|0,level=((p.volume*24000)/127)|0;
const res=((p.res*16000)/127)|0,filterDepth=((p.fDepth*42)/127)|0;
const lfoDepth=((p.lfoAmount*35)/127)|0;
for(let i=0;i<left.length;i++){
this.lfoPhase=(this.lfoPhase+this.lfoInc)>>>0;
if((this.counter++ & 31)===0){this.lfoValue=this.lfoTable[this.lfoPhase>>>24];}
let sum=0;
for(const v of this.voices){
if(!v.state)continue;
this.envUpdate(v,"amp");this.envUpdate(v,"fil");
if(!v.state)continue;
const fp=(v.fil>>>17),scan=((this.lfoValue*lfoDepth)>>15);
const pos1=Math.max(0,Math.min(127,p.posA+scan));
const pos2=Math.max(0,Math.min(127,p.posB-scan));
const a=this.getWave(p.waveA,v.phase1,pos1);
const b=this.getWave(p.waveB,v.phase2,pos2);
let sig=(((a*(32767-mix))>>15)+((b*mix)>>15))|0;
v.phase1=(v.phase1+v.inc1)>>>0;v.phase2=(v.phase2+v.inc2)>>>0;
if((i&31)===0){
const c=Math.max(0,Math.min(127,p.cutoff+(((fp-64)*filterDepth)>>6)+(scan>>2)));
v.coeff=this.cutTable[c];
}
sig-=((v.s2*res)>>15);
v.s1+=((sig-v.s1)*v.coeff)>>15;
v.s2+=((v.s1-v.s2)*v.coeff)>>15;
const ampQ15=v.amp>>>9;
sum+=((((v.s2*ampQ15)>>15)*v.velocity)/127)|0;
}
sum=Math.max(-32768,Math.min(32767,sum>>1));
const pos=this.di&16383,tap=(pos-this.delayTap)&16383,echo=this.delayBuffer[tap];
const feedback=this.delayFeedback,mixed=sum+((echo*this.delayMix)>>15);
this.delayBuffer[pos]=Math.max(-32768,Math.min(32767,sum+((echo*feedback)>>15)));
this.di++;
let sample=Math.max(-32768,Math.min(32767,(mixed*level)>>15));
left[i]=sample/32768;if(right!==left)right[i]=sample/32768;
}
return true;
}
}
registerProcessor("wavefeld-fm1-q15",FM1WavefeldProcessor);