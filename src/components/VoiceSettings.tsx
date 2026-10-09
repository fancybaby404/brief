import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Linking,View} from 'react-native';
import type {DownloadResumable} from 'expo-file-system/legacy';
import {C} from '../theme/tokens';
import {Card,Icon,Tap,Txt} from './Ui';
import {STT_MODELS,formatMB,type SpeechModel,type VoiceChoice} from '../lib/voice/catalog';
import {createRecorder,downloadSpeechModels,installedModel,loadSpeech,releaseSpeech,removeSpeechModels,requestMic,speechInstalled,transcribe} from '../lib/voice/stt';
import {setSpeechRate,speak,speechRate,stopSpeaking,voiceChoice} from '../lib/voice/tts';
import {releaseVision} from '../lib/ai';

const RATES=[{v:0.85,label:'Slower'},{v:1,label:'Normal'},{v:1.15,label:'Faster'}];
const row={flexDirection:'row' as const,alignItems:'center' as const,gap:10,minHeight:48};
const chip=(on:boolean)=>({minHeight:34,paddingHorizontal:12,borderRadius:17,justifyContent:'center' as const,backgroundColor:on?C.blue:C.pale2});

/** Settings → Voice interviews: offline speech models (checksum-verified), the interviewer voice, and
 *  on-device self-tests for the microphone→Whisper path and the voice. Results are real measurements. */
export function VoiceSettings(){
 const [model,setModel]=useState<SpeechModel|null>(null),[ready,setReady]=useState(false),[choice,setChoice]=useState<VoiceChoice|null>(null),[rate,setRate]=useState(1);
 const [busy,setBusy]=useState<null|{stage:'download'|'verify',pct:number}>(null),[result,setResult]=useState(''),[testing,setTesting]=useState<''|'mic'|'voice'>('');
 const task=useRef<DownloadResumable|null>(null);
 const refresh=()=>void Promise.all([speechInstalled(),installedModel(),voiceChoice(),speechRate()]).then(([ok,m,c,r])=>{setReady(ok);setModel(ok?m:null);setChoice(c);setRate(r);});
 useEffect(refresh,[]);
 async function download(m:SpeechModel){setResult('');setBusy({stage:'download',pct:0});
  try{const r=await downloadSpeechModels(m,(stage,f)=>setBusy({stage,pct:Math.round(f*100)}),t=>{task.current=t;});
   setResult(r?`${m.name} speech model installed and verified (SHA-256).`:'Download canceled.');refresh();}
  catch(e){setResult((e as Error).message);}finally{setBusy(null);task.current=null;}}
 function choose(m:SpeechModel){Alert.alert(`Download ${m.name.toLowerCase()} speech model?`,`About ${formatMB(m.bytes)} from Hugging Face (whisper.cpp, MIT). After that, speech recognition works offline.`,[{text:'Cancel',style:'cancel'},{text:'Download',onPress:()=>void download(m)}]);}
 /** Records up to 6 s, then runs the same VAD + Whisper path as interviews. */
 async function testMic(){setResult('');const perm=await requestMic();if(perm!=='granted'){setResult(perm==='blocked'?'Microphone access is off for Brief. Turn it on in system Settings.':'Microphone permission is needed for this test.');return;}
  setTesting('mic');
  try{await releaseVision();await loadSpeech();
   const rec=createRecorder({autoStop:true,onEndOfSpeech:()=>void finish()});let done=false;
   const finish=async()=>{if(done)return;done=true;const pcm=await rec.stop();const t=await transcribe(pcm,'Interview answer.');setResult(t.text?`Heard: “${t.text}” · ${(t.audioMs/1000).toFixed(1)} s of audio transcribed in ${(t.ms/1000).toFixed(1)} s on this phone.`:t.reason==='no-speech'?'No speech detected. Try again a little closer to the phone.':'Too short. Say a full sentence.');setTesting('');void releaseSpeech();};
   await rec.start();setResult('Listening… say a sentence, then pause.');setTimeout(()=>void finish(),6000);
  }catch(e){setResult(`Microphone test failed: ${(e as Error).message}`);setTesting('');}}
 async function testVoice(){if(!choice?.voice)return;setTesting('voice');setResult('');
  const t0=Date.now();
  await speak('Hi, I’m Brief. Tell me about a project you’re proud of.',choice.voice,rate,(_,finished)=>{setTesting('');setResult(finished?`Spoke in ${((Date.now()-t0)/1000).toFixed(1)} s with “${choice.voice!.name}”. To confirm it works offline, run this again with airplane mode on.`:'Stopped.');});}
 const changeRate=(r:number)=>{setRate(r);void setSpeechRate(r);};

 return <Card style={{padding:14,gap:6}}>
  <View style={row}><View style={{width:42,height:42,borderRadius:22,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name="mic-outline" size={21} color={C.blue}/></View>
   <View style={{flex:1}}><Txt bold>Speech recognition</Txt><Txt size={12} color={C.muted}>{ready&&model?`${model.name} · ${model.description} · on this phone`:'Not installed · interviews stay typed until you add it'}</Txt></View></View>
  {busy?<View style={{gap:6,paddingVertical:6}} accessible accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:busy.pct}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><ActivityIndicator color={C.blue}/><Txt size={13}>{busy.stage==='download'?`Downloading… ${busy.pct}%`:`Checking file integrity… ${busy.pct}%`}</Txt></View>
    <View style={{height:6,borderRadius:3,backgroundColor:C.line,overflow:'hidden'}}><View style={{width:`${busy.pct}%`,height:6,backgroundColor:C.blue}}/></View>
    {busy.stage==='download'&&<Tap accessibilityRole="button" onPress={()=>void task.current?.cancelAsync()} style={{alignSelf:'flex-start',minHeight:36,justifyContent:'center'}}><Txt bold size={13} color={C.blue}>Cancel</Txt></Tap>}
   </View>
   :<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{STT_MODELS.map(m=>{const on=model?.id===m.id;return <Tap key={m.id} accessibilityRole="button" accessibilityState={{selected:on}} disabled={on} onPress={()=>choose(m)} style={chip(on)}><Txt size={13} bold color={on?C.white:C.ink}>{on?`${m.name} ✓`:`${m.name} · ${formatMB(m.bytes)}`}</Txt></Tap>;})}
    {ready&&<Tap accessibilityRole="button" onPress={()=>Alert.alert('Remove speech models?','Voice interviews will be typed until you download them again.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void removeSpeechModels().then(refresh)}])} style={chip(false)}><Txt size={13} bold color={C.danger}>Remove</Txt></Tap>}
   </View>}
  {ready&&!busy&&<Tap accessibilityRole="button" disabled={!!testing} onPress={()=>void testMic()} style={[row,{minHeight:44}]}><Icon name="pulse-outline" size={18} color={C.blue}/><Txt size={14} bold color={C.blue}>{testing==='mic'?'Listening…':'Test microphone & transcription'}</Txt></Tap>}
  <View style={{height:1,backgroundColor:C.line,marginVertical:6}}/>
  <View style={row}><View style={{width:42,height:42,borderRadius:22,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name="volume-high-outline" size={21} color={C.blue}/></View>
   <View style={{flex:1}}><Txt bold>Interviewer voice</Txt><Txt size={12} color={C.muted}>{choice?.voice?`${choice.voice.name} · ${choice.offline==='verified'?'on-device':'offline not confirmed'}`:choice?.reason??'Checking…'}</Txt></View></View>
  {!!choice&&choice.offline!=='verified'&&<Tap accessibilityRole="button" onPress={()=>void Linking.openSettings()}><Txt size={12} color={C.muted}>{choice.reason}</Txt></Tap>}
  {!!choice?.voice&&<>
   <View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:8}}>{RATES.map(r=><Tap key={r.v} accessibilityRole="radio" accessibilityState={{selected:rate===r.v}} onPress={()=>changeRate(r.v)} style={chip(rate===r.v)}><Txt size={13} bold color={rate===r.v?C.white:C.ink}>{r.label}</Txt></Tap>)}</View>
   <Tap accessibilityRole="button" onPress={()=>void (testing==='voice'?stopSpeaking():testVoice())} style={[row,{minHeight:44}]}><Icon name={testing==='voice'?'stop':'play-circle-outline'} size={18} color={C.blue}/><Txt size={14} bold color={C.blue}>{testing==='voice'?'Stop':'Test voice'}</Txt></Tap>
  </>}
  {!!result&&<View accessibilityLiveRegion="polite"><Txt size={12} color={C.muted}>{result}</Txt></View>}
  <Txt size={11} color={C.soft}>Audio is processed in memory on this phone and never saved or uploaded.</Txt>
 </Card>;
}
