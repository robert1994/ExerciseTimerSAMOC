/* WAVEFELD v0.2. Independent browser interface (MIT). */
(()=>{"use strict";
const $=id=>document.getElementById(id),deep=x=>JSON.parse(JSON.stringify(x));
const Engine=window.WavefeldEngine,engine=new Engine(),base=deep(engine.patch);
const groupNames=["OSCILLATORS","FILTERS","ENVELOPES","LFO","MOD MATRIX","EFFECTS","ARPEGGIATOR"];
const banks=Engine.banks,types=["LOWPASS","HIGHPASS","BANDPASS","NOTCH"],shapes=["SINE","TRIANGLE","SAW","SQUARE"];
const sources=Engine.sources,targets=Engine.targets,arpModes=["UP","DOWN","UP/DOWN","RANDOM","AS PLAYED"];
const make=(label,key,type="pct")=>({label,key,type});
const m=make;
const pgs=[
[
["OSC 1 / WAVE",m("WAVE BANK","osc1Bank","bank"),m("WAVE POSITION","osc1Pos"),m("BRILLIANCE","osc1Brill"),m("LEVEL","osc1Level")],
["OSC 1 / PITCH",m("SEMITONE","osc1Semi","semi"),m("DETUNE","osc1Fine","fine"),m("WT POSITION","osc1Pos"),m("LEVEL","osc1Level")],
["OSC 2 / WAVE",m("WAVE BANK","osc2Bank","bank"),m("WAVE POSITION","osc2Pos"),m("BRILLIANCE","osc2Brill"),m("LEVEL","osc2Level")],
["OSC 2 / PITCH",m("SEMITONE","osc2Semi","semi"),m("DETUNE","osc2Fine","fine"),m("WT POSITION","osc2Pos"),m("LEVEL","osc2Level")],
["OSC 3 / ANALOG",m("SHAPE","osc3Shape","shape"),m("LEVEL","osc3Level"),m("SEMITONE","osc3Semi","semi"),m("FINE TUNE","osc3Fine","fine")],
["OSC MIX / NOISE",m("OSC 1","osc1Level"),m("OSC 2","osc2Level"),m("OSC 3","osc3Level"),m("NOISE","noise")],
["OSC MIX / RING",m("RING MOD","ring"),m("NOISE","noise"),m("OSC 1","osc1Level"),m("OSC 2","osc2Level")]
],
[
["FILTER 1 / MAIN",m("CUTOFF","f1Cut","freq"),m("RESONANCE","f1Res"),m("TYPE","f1Type","filter"),m("ENV DEPTH","f1Env")],
["FILTER 1 / MORE",m("DRIVE","f1Drive"),m("KEYTRACK","f1Key","bipolar"),m("CUTOFF","f1Cut","freq"),m("RESONANCE","f1Res")],
["FILTER 2 / MAIN",m("CUTOFF","f2Cut","freq"),m("RESONANCE","f2Res"),m("TYPE","f2Type","filter"),m("ENV DEPTH","f2Env")],
["FILTER 2 / MORE",m("DRIVE*","f2Drive"),m("KEYTRACK","f2Key","bipolar"),m("CUTOFF","f2Cut","freq"),m("RESONANCE","f2Res")],
["FILTER ROUTING",m("ROUTING","routing","route"),m("FILTER 1","f1Cut","freq"),m("FILTER 2","f2Cut","freq"),m("DRIVE","f1Drive")]
],
[
["AMP / ADSR",m("ATTACK","ampA","timeA"),m("DECAY","ampD","timeD"),m("SUSTAIN","ampS"),m("RELEASE","ampR","timeR")],
["FILTER / ADSR",m("ATTACK","fltA","timeA"),m("DECAY","fltD","timeD"),m("SUSTAIN","fltS"),m("RELEASE","fltR","timeR")],
["ENVELOPE 3",m("ATTACK","e3A","timeA"),m("DECAY","e3D","timeD"),m("SUSTAIN","e3S"),m("RELEASE","e3R","timeR")],
["ENVELOPE 4",m("ATTACK","e4A","timeA"),m("DECAY","e4D","timeD"),m("SUSTAIN","e4S"),m("RELEASE","e4R","timeR")]
],
[
["LFO 1 / WAVETABLE",m("RATE","l1Rate","rate"),m("SHAPE","l1Shape","lfoshape"),m("WT SCAN","l1Amt"),m("SYNC*","l1Sync","switch")],
["LFO 2 / FILTER",m("RATE","l2Rate","rate"),m("SHAPE","l2Shape","lfoshape"),m("DEPTH","l2Amt"),m("SYNC*","l2Sync","switch")],
["LFO 3 / PITCH",m("RATE","l3Rate","rate"),m("SHAPE","l3Shape","lfoshape"),m("DEPTH","l3Amt"),m("SYNC*","l3Sync","switch")]
],
Array.from({length:16},(_,i)=>["MOD / SLOT "+String(i+1).padStart(2,"0"),m("SOURCE","matrix."+i+".source","source"),m("TARGET","matrix."+i+".target","target"),m("AMOUNT","matrix."+i+".amount","bipolar"),m("CURVE","matrix."+i+".curve")]),
[
["FX 1 / CHORUS",m("MIX","chorus"),m("RATE","chorusRate","rate"),m("DEPTH","chorusDepth"),m("OUTPUT","output")],
["FX 2 / DELAY",m("TIME","delay","delaytime"),m("FEEDBACK","feedback"),m("MIX","delayMix"),m("CHORUS","chorus")],
["FX 2 / REVERB",m("MIX","reverb"),m("SIZE*","reverbSize"),m("DELAY","delayMix"),m("FEEDBACK","feedback")],
["AMPLIFIER",m("VOLUME","output"),m("PAN","pan","bipolar"),m("CHORUS","chorus"),m("REVERB","reverb")]
],
[
["ARP / MAIN",m("TEMPO","tempo","tempo"),m("MODE","arpMode","arpMode"),m("GATE","arpGate"),m("OCTAVE RANGE","arpOct","oct")],
["ARP / PROBABILITY",m("DENSITY","arpProbability"),m("GATE","arpGate"),m("TEMPO","tempo","tempo"),m("OCTAVES","arpOct","oct")],
...Array.from({length:4},(_,page)=>["ARP STEPS "+(page*4+1)+"–"+(page*4+4),...Array.from({length:4},(_,i)=>m("STEP "+(page*4+i+1),"arpSteps."+(page*4+i),"switch"))])
]
];
const descriptions=[
"Two independent 64-position original wavetable banks, plus a virtual analogue oscillator. Use slight detune and slow scanning.",
"Two multimode filters, with independent cutoffs and a series/parallel audio route. Resonance and drive alter the tone.",
"Four ADSR pages. The amplitude and filter envelopes shape each voice; ENV 3 and ENV 4 can feed the modulation matrix.",
"Three LFOs: wavetable scan, filter sweep and gentle pitch drift. Shapes include sine, triangle, saw and square.",
"16 modulation slots. Sources include LFO 1–3, ENV 3–4, velocity and mod wheel. Route to wavetable, filters and pitch.",
"Chorus, feedback delay, convolution reverb and output volume. Designed for slowly evolving ambient layers.",
"Arpeggiator with modes, octaves, probability and a 16-step gate pattern. Use the 4 STEP pages for pattern programming."
];
const patches=[
["A01 GLASS CATHEDRAL",{osc1Bank:2,osc1Pos:.62,osc2Bank:6,osc2Pos:.76,ampA:.68,ampR:.81,f1Cut:.66,l1Amt:.72,reverb:.69}],
["A02 QUANTUM CHOIR",{osc1Bank:6,osc1Pos:.48,osc2Bank:1,osc2Pos:.69,osc3Level:.05,routing:1,f2Type:2,f1Cut:.47,ampA:.74,ampR:.86,reverb:.73}],
["A03 ARCTIC SIGNAL",{osc1Bank:3,osc1Pos:.84,osc2Bank:5,osc2Pos:.36,ampA:.03,ampS:.15,ampR:.44,f1Res:.72,f1Cut:.34,delayMix:.63,feedback:.68}],
["A04 PPG DAYDREAM",{osc1Bank:0,osc1Pos:.28,osc2Bank:5,osc2Pos:.79,osc3Shape:2,osc3Level:.2,l1Amt:.86,ampA:.53,ampR:.72}],
["A05 ABYSSAL CURRENT",{osc1Bank:4,osc1Pos:.12,osc2Bank:3,osc2Pos:.39,osc1Semi:.25,osc2Semi:.25,f1Cut:.19,f2Cut:.36,ampA:.67,ampR:.9}],
["A06 ANALOG DUSK",{osc1Bank:0,osc1Pos:.08,osc2Bank:0,osc2Pos:.9,osc3Level:.4,osc2Fine:.58,f1Drive:.34,chorus:.69,ampA:.38}],
["A07 SPECTRAL RAIN",{osc1Bank:2,osc1Pos:.96,osc2Bank:3,osc2Pos:.66,f1Type:2,f1Cut:.84,ampA:.04,ampS:.2,ampR:.58,delayMix:.62}],
["A08 NIGHT ORGAN",{osc1Bank:7,osc1Pos:.32,osc2Bank:4,osc2Pos:.67,osc3Shape:3,osc3Level:.16,ampS:.93,ampR:.62,f1Cut:.62}]
];
let section=0,page=0,patchName=patches[0][0],playing=false,drone=false,arpTimer=null,arpWhen=0,arpStep=0,midiAccess=null,midiInput=null,midiOutput=null,requestFrame=false,held=[],pressed=new Map(),droneVoices=[];
const css=document.createElement("style");
css.textContent=".wf-menu{background:#0b1924;border:1px solid #526578;border-radius:12px;padding:13px;margin:20px 0 5px}.wf-menu .wf-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.wf-menu select,.wf-menu button{background:#223a49;color:#e5fbf6;border:1px solid #61768a;border-radius:7px;padding:8px 9px;font-size:12px}.wf-menu select{flex:1;min-width:140px}.wf-menu p{font-size:12px;color:#9cc9c2;margin:8px 0 0}.wf-menu .wf-num{font-size:12px;color:#9cf2cd}#pages{overflow-x:auto;flex-wrap:nowrap;max-width:100%;padding-bottom:5px}#pages .btn{flex-shrink:0}.knob label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.knob output{font-size:11px}.wf-menu button:hover{background:#3b6071}";
document.head.append(css);
const nav=document.createElement("div");nav.className="wf-menu";
nav.innerHTML='<div class="wf-row"><button id="wfBack" aria-label="Previous page">◀</button><select id="wfSection" aria-label="Synthesis section"></select><select id="wfSub" aria-label="Menu page"></select><button id="wfForward" aria-label="Next page">▶</button><span class="wf-num" id="wfCount"></span></div><p id="wfHelp"></p>';
document.querySelector(".deck").after(nav);
const tag=document.querySelector(".pill");if(tag)tag.textContent="BROWSER DEMO v0.2 · NOT FLASHABLE";
const intro=document.querySelector(".intro");if(intro)intro.textContent="Deeper menus. A three-oscillator wavetable engine, two multimode filters, three LFOs, four envelopes and 16 modulation routes.";
const desc=document.querySelectorAll(".info");if(desc[0])desc[0].innerHTML='<h3>EXPLORE THE SYNTHESIS PAGES</h3><p>Choose a section and page using the two dropdowns, or use ◀ ▶ to dive through menus. Each page maps its four controls to the four on-screen knobs. Play with the keyboard (Z–M), start the arp with SPACE, and switch between 8 original ambient patches.</p><p class="note">Asterisks (*) identify planned parameters not yet connected to the Web Audio DSP. They can be edited but do not currently change the sound.</p>';
if(desc[1])desc[1].innerHTML='<h3>INDEPENDENT BLOFELD-INSPIRED SYNTHESIS</h3><p>The signal path has three oscillators, two multimode filters, ADSR, original procedurally synthesized wavetables, 16 modulation slots, chorus, delay and reverb. This is not Waldorf firmware, not an accurate software clone, and not yet flashable on the FM-1.</p><p class="note">For the FM-1 hardware port, use the separate C DSP source and carefully validate the processor limits before flashing.</p>';
function opt(t){return t==="bank"?banks:t==="filter"?types:t==="shape"?shapes:t==="lfoshape"?shapes:t==="route"?["SERIAL","PARALLEL"]:t==="arpMode"?arpModes:t==="switch"?["OFF","ON"]:t==="source"?sources:t==="target"?targets:null;}
function fmt(v,t){const options=opt(t);if(options)return options[v|0]||options[0];if(t==="semi")return (Math.round((v-.5)*48)>=0?"+":"")+Math.round((v-.5)*48)+" st";
if(t==="fine")return Math.round((v-.5)*80)+" ct";
if(t==="bipolar")return Math.round((v*2-1)*100)+"%";
if(t==="freq")return Math.round(45*Math.pow(14500/45,v))+" Hz";
if(t==="rate")return (.018*Math.pow(12/.018,v)).toFixed(2)+" Hz";
if(t==="timeA")return (.005*Math.pow(7/.005,v)).toFixed(2)+" s";
if(t==="timeD")return (.03*Math.pow(12/.03,v)).toFixed(2)+" s";
if(t==="timeR")return (.05*Math.pow(15/.05,v)).toFixed(2)+" s";
if(t==="tempo")return Math.round(35+v*145)+" BPM";
if(t==="delaytime")return (.09+v*1.65).toFixed(2)+" s";
if(t==="oct")return (1+Math.floor(v*2.99))+" oct";
return Math.round(v*100)+"%";}
function get(k){return k.split(".").reduce((o,key)=>o[key],engine.patch);}
function put(k,v){const path=k.split(".");let o=engine.patch;for(let i=0;i<path.length-1;i++)o=o[path[i]];o[path[path.length-1]]=v;engine.update();}
function buildKnobs(){
$("knobs").replaceChildren();
for(const d of pgs[section][page].slice(1)){
const root=document.createElement("div");root.className="knob";
const label=document.createElement("label");label.textContent=d.label;
const dial=document.createElement("div");dial.className="dial";
const slider=document.createElement("input");slider.type="range";slider.setAttribute("aria-label",d.label);
const options=opt(d.type);slider.min="0";slider.max=String(options?options.length-1:1000);slider.step="1";
slider.value=String(options?(get(d.key)|0):Math.round(get(d.key)*1000));
const output=document.createElement("output");
const paint=()=>{const val=get(d.key),position=options?val/(options.length-1):val;dial.style.setProperty("--deg",(268*position)+"deg");output.textContent=fmt(val,d.type);};
slider.addEventListener("input",()=>{put(d.key,options?+slider.value:(+slider.value/1000));if(!patchName.startsWith("EDIT"))patchName="EDIT "+patchName;paint();drawDisplay();});
paint();root.append(label,dial,slider,output);$("knobs").append(root);
}}
function drawDisplay(){
$("mode").textContent=groupNames[section]+" / PAGE "+(page+1)+"/"+pgs[section].length;
$("screenname").textContent=pgs[section][page][0];
$("screenpatch").textContent=patchName;
$("desc").textContent=descriptions[section];
$("wavename").textContent=banks[engine.patch.osc1Bank|0]+" / "+banks[engine.patch.osc2Bank|0];
$("clock").textContent=Math.round(35+engine.patch.tempo*145)+" BPM · "+(playing?"ARP":"STOP");
$("poly").textContent=engine.voices.filter(v=>!v.dead).length+" / 6 VOICES";
$("play").setAttribute("aria-pressed",String(playing));$("drone").setAttribute("aria-pressed",String(drone));
$("led").classList.toggle("active",Boolean(engine.ctx&&engine.ctx.state==="running"));
}
function navigate(a,b){
section=clip(a,0,pgs.length-1);page=clip(b,0,pgs[section].length-1);
$("wfSection").replaceChildren();groupNames.forEach((name,i)=>{const o=document.createElement("option");o.value=i;o.textContent=name;$("wfSection").append(o);});$("wfSection").value=String(section);
$("wfSub").replaceChildren();pgs[section].forEach((p,i)=>{const o=document.createElement("option");o.value=i;o.textContent=p[0];$("wfSub").append(o);});$("wfSub").value=String(page);
$("wfCount").textContent=(page+1)+"/"+pgs[section].length;$("wfHelp").textContent=descriptions[section];
$("pages").replaceChildren();groupNames.forEach((name,i)=>{const b=document.createElement("button");b.className="btn"+(i===section?" sel":"");b.textContent=name;b.addEventListener("click",()=>navigate(i,0));$("pages").append(b);});
buildKnobs();drawDisplay();
}
function step(dir){let c=section,s=page+dir;if(s<0){c=(c-1+pgs.length)%pgs.length;s=pgs[c].length-1;}if(s>=pgs[c].length){c=(c+1)%pgs.length;s=0;}navigate(c,s);}
$("wfBack").addEventListener("click",()=>step(-1));$("wfForward").addEventListener("click",()=>step(1));
$("wfSection").addEventListener("change",e=>navigate(+e.target.value,0));
$("wfSub").addEventListener("change",e=>navigate(section,+e.target.value));
function status(s){$("status").textContent=s;}
function setPreset(name,override){
const patch=deep(base);
for(const key of Object.keys(patch)){if(key==="matrix"&&Array.isArray(override.matrix))patch.matrix=override.matrix.slice(0,16).map((slot,i)=>Object.assign({},patch.matrix[i],slot));
else if(key==="arpSteps"&&Array.isArray(override.arpSteps))patch.arpSteps=override.arpSteps.slice(0,16).map(v=>v?1:0);
else if(typeof override[key]==="number"&&Number.isFinite(override[key]))patch[key]=override[key];}
engine.patch=patch;engine.update();patchName=name;navigate(section,page);status("Loaded "+name);
}
$("presets").replaceChildren();patches.forEach(([name])=>{const o=document.createElement("option");o.value=name;o.textContent=name;$("presets").append(o);});
$("presets").addEventListener("change",e=>{const row=patches.find(x=>x[0]===e.target.value);if(row)setPreset(row[0],row[1]);});
$("save").addEventListener("click",()=>{try{localStorage.setItem("wavefeld-v2",JSON.stringify({name:patchName,patch:engine.patch}));status("Patch saved to this browser.");}catch(e){status("Browser storage not available.");}});
$("export").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({format:"wavefeld-v2",name:patchName,patch:engine.patch},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="wavefeld-v2-patch.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);});
$("import").addEventListener("click",()=>$("file").click());
$("file").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.patch)throw Error("Not a v2 patch");setPreset(String(data.name||"Imported").slice(0,50),data.patch);}catch(err){status("Import failed: "+err.message);}e.target.value="";});
async function powerOn(){try{await engine.start();$("power").textContent="◉ Audio on";$("power").classList.add("on");if(!requestFrame){requestFrame=true;requestAnimationFrame(frame);}drawDisplay();status("Audio ready — play notes or start a drone.");}catch(e){status("Audio failed: "+e.message);}}
$("power").addEventListener("click",async()=>{if(!engine.ctx||engine.ctx.state!=="running")await powerOn();else{await engine.ctx.suspend();$("power").textContent="◉ Resume audio";$("power").classList.remove("on");drawDisplay();status("Audio suspended.");}});
const notes={z:48,s:49,x:50,d:51,c:52,v:53,g:54,b:55,h:56,n:57,j:58,m:59,",":60,q:60,"2":61,w:62,"3":63,e:64,r:65,"5":66,t:67,"6":68,y:69,"7":70,u:71,i:72};
function midiSend(bytes,time){if(!midiOutput||!$("midiout").checked)return;try{midiOutput.send(bytes,time);}catch(e){}}
function down(n,id,vel=100){if(!engine.ctx){status("Switch on audio first.");return;}if(pressed.has(id))return;pressed.set(id,n);if(!held.includes(n))held.push(n);if(!playing)engine.noteOn(n,vel);midiSend([0x90,n,vel]);document.querySelectorAll('[data-note="'+n+'"]').forEach(k=>k.classList.add("down"));drawDisplay();}
function up(id){if(!pressed.has(id))return;const n=pressed.get(id);pressed.delete(id);if(![...pressed.values()].includes(n)){held=held.filter(x=>x!==n);if(!playing)engine.noteOff(n);midiSend([0x80,n,0]);}document.querySelectorAll('[data-note="'+n+'"]').forEach(k=>k.classList.remove("down"));drawDisplay();}
const keys=$("keys"),whites=[0,2,4,5,7,9,11],blackpos={1:0,3:1,6:3,8:4,10:5};
keys.replaceChildren();
for(let oct=0;oct<2;oct++)for(const semi of whites){const key=document.createElement("div");key.className="white";key.dataset.note=48+oct*12+semi;key.setAttribute("role","button");key.setAttribute("aria-label","MIDI note "+key.dataset.note);keys.append(key);}
const high=document.createElement("div");high.className="white";high.dataset.note=72;keys.append(high);
for(let oct=0;oct<2;oct++)for(const semi of [1,3,6,8,10]){
const key=document.createElement("div");key.className="black";key.dataset.note=48+oct*12+semi;key.style.left="calc(6px + (100% - 12px) * "+((oct*7+blackpos[semi]+1)/15)+" - 1.775%)";keys.append(key);}
keys.addEventListener("pointerdown",e=>{const key=e.target.closest("[data-note]");if(!key)return;e.preventDefault();key.setPointerCapture(e.pointerId);down(+key.dataset.note,"p"+e.pointerId);});
keys.addEventListener("pointerup",e=>up("p"+e.pointerId));keys.addEventListener("pointercancel",e=>up("p"+e.pointerId));
window.addEventListener("pointerup",e=>up("p"+e.pointerId));window.addEventListener("blur",()=>{for(const k of pressed.keys())up(k);});
document.addEventListener("keydown",e=>{if(e.repeat||e.target.matches("input,select,button,textarea"))return;if(e.code==="Space"){e.preventDefault();toggleArp();return;}if(e.key==="["){e.preventDefault();step(-1);return;}if(e.key==="]"){e.preventDefault();step(1);return;}const n=notes[e.key.toLowerCase()];if(n!==undefined){e.preventDefault();down(n,"k"+e.code);}});
document.addEventListener("keyup",e=>up("k"+e.code));
function arpNote(i){const p=engine.patch,seq=held.length?held.slice():[48,55,60,64,67,72];seq.sort((a,b)=>a-b);const oct=1+Math.floor(p.arpOct*2.99),pool=[];
for(let k=0;k<oct;k++)pool.push(...seq.map(n=>n+12*k));const mode=p.arpMode|0;
if(mode===1)return pool[pool.length-1-i%pool.length];
if(mode===2){const last=Math.max(1,pool.length*2-2),ix=i%last;return pool[ix<pool.length?ix:last-ix];}
if(mode===3)return pool[Math.floor(Math.random()*pool.length)];
if(mode===4)return seq[i%seq.length]+12*(Math.floor(i/seq.length)%oct);
return pool[i%pool.length];}
function tickArp(){if(!engine.ctx||!playing||engine.ctx.state!=="running")return;const p=engine.patch,t=engine.ctx.currentTime,dur=30/(35+p.tempo*145);
if(!arpWhen||arpWhen<t-.4)arpWhen=t+.02;
while(arpWhen<t+.10){const stepno=arpStep++;if(p.arpSteps[stepno%16]&&Math.random()<p.arpProbability){
const n=arpNote(stepno),len=dur*(.1+.82*p.arpGate),v=engine.noteOn(n,94,arpWhen);
if(v)engine.release(v,arpWhen+len,.12+p.ampR*.5);
const when=performance.now()+Math.max(0,arpWhen-t)*1000;midiSend([0x90,n,94],when);midiSend([0x80,n,0],when+len*1000);}arpWhen+=dur;}
}
function toggleArp(){playing=!playing;arpWhen=0;arpStep=0;if(playing){if(!arpTimer)arpTimer=setInterval(tickArp,30);status("Arpeggiator on.");}else{if(arpTimer)clearInterval(arpTimer);arpTimer=null;status("Arpeggiator off.");}drawDisplay();}
$("play").addEventListener("click",async()=>{if(!engine.ctx)await powerOn();toggleArp();});
$("drone").addEventListener("click",async()=>{if(!engine.ctx)await powerOn();
if(drone){for(const v of droneVoices)engine.release(v,engine.ctx.currentTime);droneVoices=[];drone=false;status("Drone stopped.");}
else{droneVoices=[48,55,60,64].map(n=>engine.noteOn(n,88)).filter(Boolean);drone=true;status("Drone running.");}drawDisplay();});
$("panic").addEventListener("click",()=>{playing=false;drone=false;arpWhen=0;if(arpTimer)clearInterval(arpTimer);arpTimer=null;droneVoices=[];engine.allOff();for(const k of [...pressed.keys()])up(k);midiSend([0xB0,123,0]);drawDisplay();status("All notes off.");});
$("midi").addEventListener("click",async()=>{if(!navigator.requestMIDIAccess){status("Web MIDI needs Chrome/Edge over HTTPS.");return;}
try{midiAccess=await navigator.requestMIDIAccess({sysex:false});midiInput=[...midiAccess.inputs.values()][0]||null;midiOutput=[...midiAccess.outputs.values()][0]||null;
if(midiInput)midiInput.onmidimessage=e=>{const [st,n,v]=e.data,type=st&0xf0;if(type===0x90&&v){if(engine.ctx){if(!playing)engine.noteOn(n,v);if(!held.includes(n))held.push(n);}}else if(type===0x80||(type===0x90&&!v)){if(engine.ctx&&!playing)engine.noteOff(n);held=held.filter(a=>a!==n);}else if(type===0xb0&&n===1)engine.modWheel=v/127;};
status("MIDI IN "+(midiInput?midiInput.name:"none")+" / OUT "+(midiOutput?midiOutput.name:"none"));
}catch(e){status("MIDI error: "+e.message);}});
let lastDisplay=0;function frame(t){if(!requestFrame)return;if(engine.ctx&&engine.ctx.state==="running"){
engine.tick(engine.ctx.currentTime);const a=engine.nodes.analyser,data=new Uint8Array(a.frequencyBinCount);
a.getByteFrequencyData(data);const signal=data.reduce((s,v)=>s+v,0)/Math.max(1,data.length)/255;
$("meter").style.width=Math.max(2,Math.min(100,signal*240))+"%";
if(t-lastDisplay>250){drawDisplay();lastDisplay=t;}}requestAnimationFrame(frame);}
try{const saved=JSON.parse(localStorage.getItem("wavefeld-v2")||"null");if(saved&&saved.patch)setPreset(saved.name||"Saved patch",saved.patch);else setPreset(patches[0][0],patches[0][1]);}
catch(e){setPreset(patches[0][0],patches[0][1]);}
navigate(0,0);status("WAVEFELD v0.2 loaded. Switch on audio.");
})();