/* WAVEFELD hardware-first FM-1 browser panel — MIT.
   240x240 screen, 7 encoders, 14 buttons and 27 keys. Native firmware NOT built. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const defaults={waveA:2,waveB:5,posA:55,posB:63,mix:57,detune:65,cutoff:82,res:31,
aAttack:67,aDecay:55,aSustain:89,aRelease:78,
fAttack:38,fDecay:65,fSustain:30,fRelease:60,fDepth:48,
lfoRate:35,lfoAmount:40,delay:70,feedback:48,volume:85};
const banks=["SINE","TRIANGLE","SAW","HOLLOW","GLASS","BELL","CHOIR","ORGAN"];
const s=(title,key,kind="pct")=>({title,key,kind});
const sections=[
{title:"OSCILLATORS",pages:[
{title:"WAVETABLES",items:[s("WAVE A","waveA","bank"),s("POSITION A","posA"),s("WAVE B","waveB","bank"),s("POSITION B","posB")]},
{title:"OSC MIX",items:[s("A/B BALANCE","mix"),s("DETUNE","detune","detune"),s("POSITION A","posA"),s("POSITION B","posB")]}]},
{title:"FILTER",pages:[
{title:"RESONANT LP",items:[s("CUTOFF","cutoff","freq"),s("RESONANCE","res"),s("ENV DEPTH","fDepth"),s("WT MOD","lfoAmount")]},
{title:"FILTER ADSR",items:[s("ATTACK","fAttack","time"),s("DECAY","fDecay","time"),s("SUSTAIN","fSustain"),s("RELEASE","fRelease","time")]}]},
{title:"ENVELOPES",pages:[
{title:"AMPLITUDE ADSR",items:[s("ATTACK","aAttack","time"),s("DECAY","aDecay","time"),s("SUSTAIN","aSustain"),s("RELEASE","aRelease","time")]},
{title:"FILTER ADSR",items:[s("ATTACK","fAttack","time"),s("DECAY","fDecay","time"),s("SUSTAIN","fSustain"),s("RELEASE","fRelease","time")]}]},
{title:"LFO",pages:[
{title:"WAVETABLE SCAN",items:[s("LFO RATE","lfoRate","lfo"),s("SCAN DEPTH","lfoAmount"),s("POSITION A","posA"),s("POSITION B","posB")]}]},
{title:"EFFECTS",pages:[
{title:"SHARED ECHO",items:[s("ECHO TIME","delay","echo"),s("FEEDBACK","feedback"),s("MASTER","volume"),s("OSC MIX","mix")]}]},
{title:"GLOBAL",pages:[
{title:"OUTPUT / TONE",items:[s("MASTER","volume"),s("CUTOFF","cutoff","freq"),s("OSC MIX","mix"),s("DETUNE","detune","detune")]}]}
];
const presets=[
["GLASS CATHEDRAL",{waveA:4,waveB:6,posA:60,posB:84,cutoff:76,res:22,aAttack:90,aRelease:107,aSustain:99,fDepth:54,lfoRate:29,lfoAmount:72,delay:101,feedback:53}],
["POLAR CHOIR",{waveA:6,waveB:7,posA:34,posB:60,mix:78,cutoff:68,res:38,aAttack:84,aRelease:94,fDepth:46,lfoAmount:77,delay:69}],
["ORBITING GLASS",{waveA:4,waveB:5,posA:98,posB:49,mix:54,cutoff:86,res:43,aAttack:62,aRelease:89,lfoRate:20,lfoAmount:83,delay:81}],
["DARK CURRENT",{waveA:2,waveB:3,posA:41,posB:56,mix:38,cutoff:32,res:25,aAttack:79,aRelease:103,lfoRate:13,lfoAmount:34,delay:92}],
["FROZEN BELLS",{waveA:5,waveB:4,posA:82,posB:103,cutoff:109,res:61,aAttack:8,aDecay:46,aSustain:14,aRelease:82,feedback:70,delay:105}],
["ANALOG DUSK",{waveA:2,waveB:1,posA:14,posB:51,detune:76,mix:65,cutoff:61,res:41,aAttack:49,aRelease:89,lfoAmount:12,delay:66}]];
let params={...defaults},section=0,page=0,preset=0,oct=0,arp=false,drone=false,arpIndex=0,arpTimer=null,droneNotes=[],midiAccess=null,held=new Map(),ctx=null,worklet=null,displayStatus="AUDIO OFF",working=false;
const screen=$("screen"),g=screen.getContext("2d");
function text(v,x,y,size=13,color="#bcf0ce",weight="normal"){g.fillStyle=color;g.font=weight+" "+size+"px monospace";g.fillText(String(v),x,y);}
function value(item){const v=params[item.key];if(item.kind==="bank")return banks[v]||banks[0];
if(item.kind==="detune")return (v-64)*.7>0?("+"+((v-64)*.7).toFixed(0)+" ct"):(((v-64)*.7).toFixed(0)+" ct");
if(item.kind==="freq")return Math.round(70*Math.pow(11000/70,v/127))+"Hz";
if(item.kind==="lfo")return (.015*Math.pow(7/.015,v/127)).toFixed(2)+"Hz";
if(item.kind==="echo")return Math.round((3072+v/127*12900)/44.1)+"ms";
if(item.kind==="time")return Math.round(5*Math.pow(4000/5,v/127))+"ms";
return Math.round(v/127*100)+"%";}
function draw(){
g.fillStyle="#082421";g.fillRect(0,0,240,240);
g.fillStyle="#173d39";g.fillRect(0,0,240,26);
text("W A V E F E L D",10,17,12,"#b7e7d3","bold");
text("FM1",199,17,11,"#cbf8b9","bold");
text(sections[section].title,10,45,11,"#7de3bf","bold");
text((page+1)+"/"+sections[section].pages.length,208,45,11,"#7de3bf");
text(sections[section].pages[page].title,10,64,15,"#edfae3","bold");
text((preset+1).toString().padStart(2,"0")+" "+(preset===6?"USER PATCH":presets[preset][0]),10,83,10,"#85caba");
let start=101;
for(let i=0;i<4;i++){
const item=sections[section].pages[page].items[i],y=start+i*29;
g.fillStyle=i%2?"#10332f":"#113a36";g.fillRect(6,y,228,26);
text(String(i+1)+" "+item.title,11,y+11,10,"#b4ddd1");
text(value(item),226,y+11,10,"#e7f6bc","bold");
g.fillStyle="#254940";g.fillRect(13,y+17,208,3);
g.fillStyle="#8de0b4";g.fillRect(13,y+17,Math.round(208*params[item.key]/(item.kind==="bank"?7:127)),3);
}
g.fillStyle="#16463e";g.fillRect(0,224,240,16);
text("4 VOICES | "+displayStatus,5,235,9,"#c1e6b9");
}
function status(message){displayStatus=message.length>18?message.slice(0,18):message;const el=$("status");el.textContent=message;draw();}
function send(message){if(worklet)worklet.port.postMessage(message);}
function patchUpdate(){for(const [name,val] of Object.entries(params))send({type:"param",name,value:val});draw();}
function usePreset(i){preset=clamp(i,0,6);let v;
if(preset===6){try{v=JSON.parse(localStorage.getItem("wavefeld-fm1-user")||"null")}catch(e){}
if(!v){preset=0;v=presets[0][1];}}
else v=presets[preset][1];
params={...defaults};for(const [name,val] of Object.entries(v||{}))if(name in params&&Number.isFinite(val))params[name]=clamp(Math.round(val),0,name.startsWith("wave")?7:127);
patchUpdate();status("Preset: "+(preset===6?"USER PATCH":presets[preset][0]));
}
function selectSection(delta){section=(section+delta+sections.length)%sections.length;page=0;draw();}
function selectPage(delta){page=(page+delta+sections[section].pages.length)%sections[section].pages.length;draw();}
function editKnob(i,delta){const item=sections[section].pages[page].items[i];const max=item.kind==="bank"?7:127;
params[item.key]=clamp(params[item.key]+delta*(max===7?1:3),0,max);send({type:"param",name:item.key,value:params[item.key]});draw();}
function encoder(label,id,dec,inc,isKnob=false){
const parent=$(isKnob?"knobs":"encoders"),box=document.createElement("div");box.className="encoder";
const title=document.createElement("b");title.textContent=label;box.append(title);
if(isKnob){const param=document.createElement("label");param.id="lab-"+id;box.append(param);}
const row=document.createElement("div");row.className="encrow";
const minus=document.createElement("button");minus.textContent="−";minus.setAttribute("aria-label",label+" decrease");minus.addEventListener("click",()=>dec());
const out=document.createElement("output");out.id="out-"+id;out.textContent="•";
const plus=document.createElement("button");plus.textContent="+";plus.setAttribute("aria-label",label+" increase");plus.addEventListener("click",()=>inc());
row.append(minus,out,plus);box.append(row);parent.append(box);
}
encoder("SELECT","sel",()=>selectSection(-1),()=>selectSection(1));
encoder("ALGORITHM","alg",()=>selectPage(-1),()=>selectPage(1));
encoder("PRESETS","pre",()=>usePreset((preset+6)%7),()=>usePreset((preset+1)%7));
for(let i=0;i<4;i++)encoder("KNOB "+(i+1),"k"+i,()=>editKnob(i,-1),()=>editKnob(i,1),true);
$("master-volume").addEventListener("input",e=>{params.volume=clamp(Number(e.target.value),0,127);send({type:"param",name:"volume",value:params.volume});draw();});
const oldDraw=draw;
draw=function(){
oldDraw();
const sel=$("out-sel"),alg=$("out-alg"),pre=$("out-pre");
sel.textContent=String(section+1);alg.textContent=String(page+1);pre.textContent=String(preset+1);
for(let i=0;i<4;i++){
const item=sections[section].pages[page].items[i];$("lab-k"+i).textContent=item.title;$("out-k"+i).textContent=item.kind==="bank"?String(params[item.key]):String(Math.round(params[item.key]/127*99));
}
$("master-volume").value=String(params.volume);$("master-val").textContent=String(params.volume);
$("led").classList.toggle("on",Boolean(ctx&&ctx.state==="running"));
};
async function power(){if(!window.AudioWorkletNode){status("AudioWorklet not supported. Use Chrome/Edge.");return;}
try{
if(!ctx){const Ctor=window.AudioContext||window.webkitAudioContext;
try{ctx=new Ctor({sampleRate:44100,latencyHint:"interactive"});}catch(e){ctx=new Ctor();}
await ctx.audioWorklet.addModule("./fm1-worklet.js");
worklet=new AudioWorkletNode(ctx,"wavefeld-fm1-q15",{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
worklet.connect(ctx.destination);patchUpdate();}
else await ctx.resume();
$("audio").textContent="◉ AUDIO ON";status("Audio enabled — play notes");
}catch(e){status("Audio failed: "+e.message);}}
$("audio").addEventListener("click",power);
function noteOn(note,id,velocity=100){if(!worklet){status("Click ENABLE AUDIO first.");return;}note+=oct*12;note=clamp(note,0,127);if(held.has(id))return;held.set(id,note);send({type:"on",note,velocity});mark(note-oct*12,true);}
function noteOff(id){if(!held.has(id))return;const note=held.get(id);held.delete(id);send({type:"off",note});mark(note-oct*12,false);}
function mark(note,on){const key=document.querySelector('[data-note="'+note+'"]');if(key)key.classList.toggle("pressed",on);}
const keybed=$("keys");const whiteNotes=[];
for(let n=53;n<=79;n++){if(![1,3,6,8,10].includes(n%12))whiteNotes.push(n);}
for(const n of whiteNotes){const el=document.createElement("div");el.className="white";el.dataset.note=n;el.setAttribute("role","button");el.setAttribute("aria-label","Note "+n);keybed.append(el);}
for(let n=53;n<=79;n++){if(![1,3,6,8,10].includes(n%12))continue;
const previous=whiteNotes.filter(x=>x<n).length-1;if(previous<0)continue;
const el=document.createElement("div");el.className="black";el.dataset.note=n;el.style.left="calc("+((previous+1)/whiteNotes.length*100).toFixed(4)+"% - 2.1%)";el.setAttribute("role","button");el.setAttribute("aria-label","Note "+n);keybed.append(el);}
keybed.addEventListener("pointerdown",e=>{const key=e.target.closest("[data-note]");if(!key)return;e.preventDefault();key.setPointerCapture(e.pointerId);noteOn(+key.dataset.note,"ptr"+e.pointerId);});
keybed.addEventListener("pointerup",e=>noteOff("ptr"+e.pointerId));
keybed.addEventListener("pointercancel",e=>noteOff("ptr"+e.pointerId));
window.addEventListener("pointerup",e=>noteOff("ptr"+e.pointerId));
window.addEventListener("blur",()=>{for(const id of [...held.keys()])noteOff(id);});
const pc={z:53,s:54,x:55,d:56,c:57,v:58,g:59,b:60,h:61,n:62,j:63,m:64,",":65,q:65,"2":66,w:67,"3":68,e:69,r:70,"5":71,t:72,"6":73,y:74,"7":75,u:76,i:77,"9":78,o:79};
document.addEventListener("keydown",e=>{if(e.repeat||e.target.matches("input,select,textarea,button"))return;const key=e.key.toLowerCase();
if(key===" "){e.preventDefault();toggleArp();return;}
if(key==="["){selectPage(-1);return;}if(key==="]"){selectPage(1);return;}
const note=pc[key];if(note!==undefined){e.preventDefault();noteOn(note,"kbd"+e.code);}});
document.addEventListener("keyup",e=>noteOff("kbd"+e.code));
function toggleArp(){
arp=!arp;if(arp){if(!worklet){arp=false;status("Enable audio before ARP");return;}
if(arpTimer)clearInterval(arpTimer);arpIndex=0;arpTimer=setInterval(()=>{
const notes=[53,60,65,69],note=notes[(arpIndex++)%notes.length]+oct*12;
send({type:"on",note,velocity:84});setTimeout(()=>send({type:"off",note}),260);
},440);status("Arpeggiator enabled");
}else{if(arpTimer)clearInterval(arpTimer);arpTimer=null;status("Arpeggiator stopped");}}
function toggleDrone(){
drone=!drone;if(drone){if(!worklet){drone=false;status("Enable audio before PLAY");return;}
droneNotes=[53,60,65,69].map(n=>n+oct*12);for(const note of droneNotes)send({type:"on",note,velocity:82});status("Four-voice drone active");
}else{for(const note of droneNotes)send({type:"off",note});droneNotes=[];status("Drone released");}}
function save(){
try{localStorage.setItem("wavefeld-fm1-user",JSON.stringify(params));status("Saved USER patch in browser");}
catch(e){status("Local storage unavailable");}}
const buttons=[
["OCT−",()=>{oct=clamp(oct-1,-2,2);status("Octave shift "+oct);}],
["OCT+",()=>{oct=clamp(oct+1,-2,2);status("Octave shift "+oct);}],
["FX",()=>{section=4;page=0;draw();}],
["SEL",()=>selectSection(1)],
["ENV",()=>{section=2;page=0;draw();}],
["LFO",()=>{section=3;page=0;draw();}],
["EDIT",()=>{section=0;page=0;draw();}],
["GLO",()=>{section=5;page=0;draw();}],
["HOME",()=>{section=0;page=0;draw();}],
["SAVE",save],
["ARP",toggleArp],
["SEQ",null],
["PLAY",toggleDrone],
["REC",null]];
for(const [label,fn] of buttons){const btn=document.createElement("button");btn.className="hwbutton";btn.textContent=label;btn.disabled=!fn;btn.title=fn?label+" physical FM-1 button":"Not included in 4-voice hardware target";if(fn)btn.addEventListener("click",fn);$("buttons").append(btn);}
$("save").addEventListener("click",save);
$("reset").addEventListener("click",()=>usePreset(preset));
$("midi").addEventListener("click",async()=>{
if(!navigator.requestMIDIAccess){status("Web MIDI needs Chrome/Edge & HTTPS");return;}
try{midiAccess=await navigator.requestMIDIAccess({sysex:false});const input=[...midiAccess.inputs.values()][0];
if(!input){status("No MIDI keyboard detected");return;}
midiInput=input;input.onmidimessage=e=>{const [b,n,v]=e.data;if((b&240)===144&&v)noteOn(n,"m"+n,v);else if((b&240)===128||((b&240)===144&&!v))noteOff("m"+n);};
status("MIDI connected: "+input.name);
}catch(e){status("MIDI access denied");}});
try{const saved=JSON.parse(localStorage.getItem("wavefeld-fm1-user")||"null");if(saved)presets.push(["USER PATCH",saved]);}catch(e){}
usePreset(0);draw();
})();