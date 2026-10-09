import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Alert,Linking,Platform,ScrollView,View} from 'react-native';
import type {DownloadResumable} from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import {C} from '../theme/tokens';
import {ChoiceSheet} from './ChoiceSheet';
import {FormSheet} from './FormSheet';
import {SettingsDivider,SettingsGroup,SettingsRow,SettingsSection} from './SettingsPrimitives';
import {Icon,Tap,Txt} from './Ui';
import {STT_MODELS,formatMB,offlineEnglishVoices,type SpeechModel,type VoiceInfo} from '../lib/voice/catalog';
import {createRecorder,downloadSpeechModels,installedModel,loadSpeech,releaseSpeech,removeSpeechModels,requestMic,speechInstalled,transcribe} from '../lib/voice/stt';
import {previewKittenVoice,previewSystemVoice,setKittenVoice,setPreferredVoice,setSpeechRate,setTtsEngine,speak,speechRate,stopSpeaking,ttsEngine,kittenVoice,voiceChoice} from '../lib/voice/tts';
import {ALL_VOICES,KITTEN_DOWNLOAD_BYTES,KITTEN_PREVIEW_TEXT,KittenVoice,installKitten,isKittenInstalling,kittenCacheInfo,releaseKitten,removeKitten,subscribeKittenDownload,verifyKitten,voiceDisplayName} from '../lib/voice/kitten';
import {releaseVision} from '../lib/ai';

const RATES=[{value:'0.85',label:'Slower'},{value:'1',label:'Normal'},{value:'1.15',label:'Faster'}] as const;
const COMPARISON_SAMPLES=[
 "Hi! It's nice to meet you. Before we get started, could you tell me a little about yourself?",
 "That's interesting! You mentioned working with React Native. What's the most challenging part of that project?",
 "Take your time. There's no rush. What would you do differently if you had another opportunity?",
];
type RateValue=typeof RATES[number]['value'];
type Progress={stage:'download'|'verify',pct:number};
type ComparisonRatings={naturalness:number,pronunciation:number,continuity:number,stability:number};

const formatRate=(n:number)=>RATES.find(x=>Number(x.value)===n)?.label??'Normal';

/** Offline STT, available on-device TTS voices, speaking speed, and a real voice preview. */
export function VoiceSettings({onStatusChange,onBusyChange}:{onStatusChange?:(status:string)=>void,onBusyChange?:(busy:boolean)=>void}){
 const [model,setModel]=useState<SpeechModel|null>(null),[speechReady,setSpeechReady]=useState(false),[textTested,setTextTested]=useState(false),[checking,setChecking]=useState(true);
 const [voice,setVoice]=useState<Awaited<ReturnType<typeof voiceChoice>>|null>(null),[voices,setVoices]=useState<VoiceInfo[]>([]),[rate,setRate]=useState(1);
 const [compareSystemVoice,setCompareSystemVoice]=useState<VoiceInfo|null>(null);
 const [busy,setBusy]=useState<Progress|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [testing,setTesting]=useState<''|'mic'|'voice'>(''),[choiceSheet,setChoiceSheet]=useState<''|'model'|'voice'|'rate'>('');
 const [candidate,setCandidate]=useState<SpeechModel|null>(null);
 const [engine,setEngine]=useState<'system'|'kitten'>('system'),[kittenSelected,setKittenSelected]=useState<KittenVoice|null>(null),[kittenCached,setKittenCached]=useState(false),[kittenSupported,setKittenSupported]=useState(true),[kittenReady,setKittenReady]=useState(false),[kittenBusy,setKittenBusy]=useState(false),[kittenPct,setKittenPct]=useState(0),[kittenStage,setKittenStage]=useState<'download'|'verify'>('download'),[kittenError,setKittenError]=useState(''),[kittenPicker,setKittenPicker]=useState(false);
 const [compareTarget,setCompareTarget]=useState('system'),[compareSample,setCompareSample]=useState(0),[compareChoice,setCompareChoice]=useState(false),[comparison,setComparison]=useState<{target:string,sample:number,firstMs:number|null,totalMs:number|null,synthesisMs:number|null,finished:boolean}|null>(null),[ratings,setRatings]=useState<Record<string,ComparisonRatings>>({});
 const compareStarted=useRef(0),compareFirst=useRef<number|null>(null),compareSynthesis=useRef(0);
 const task=useRef<DownloadResumable|null>(null),recording=useRef<ReturnType<typeof createRecorder>|null>(null),testTimeout=useRef<ReturnType<typeof setTimeout>|null>(null),downloading=useRef(false),cancelDownload=useRef(false);
 const kittenTask=useRef(false);
 const selectedRate=String(rate) as RateValue;

 const refresh=useCallback(async()=>{
  try{
   const [installed,activeModel,currentVoice,currentRate,available,currentEngine,selectedKitten,kittenCache]=await Promise.all([
    speechInstalled(),installedModel(),voiceChoice(),speechRate(),Speech.getAvailableVoicesAsync().catch(()=>[] as VoiceInfo[]),ttsEngine(),kittenVoice(),kittenCacheInfo().catch(()=>null),
   ]);
   const chosen=installed?activeModel:null;
   const offline=offlineEnglishVoices(available,Platform.OS);
   setSpeechReady(installed);setModel(chosen);setVoice(currentVoice);setVoices(offline);setCompareSystemVoice(offline.find(item=>/samantha/i.test(`${item.name} ${item.identifier}`))??currentVoice.voice??null);setRate(currentRate);setEngine(currentEngine);setKittenSelected(selectedKitten??null);setKittenSupported(!!kittenCache);setKittenCached(!!kittenCache?.isCached);
   onStatusChange?.(installed?'Installed':'Not installed');
  }catch(e){const text=(e as Error).message||'Voice settings could not be loaded.';setError(text);onStatusChange?.('Error');}
  finally{setChecking(false);}
 },[onStatusChange]);
 useEffect(()=>subscribeKittenDownload((progress,info)=>{
  setKittenBusy(isKittenInstalling()||kittenTask.current);setKittenPct(Math.round(progress*100));
  if(info?.stage==='complete'){
   setKittenStage('verify');setKittenError(info.message??'');
   if(!isKittenInstalling())void refresh();
  }else if(info?.stage==='downloading'||info?.stage==='retrying')setKittenStage('download');
 }),[refresh]);
 useEffect(()=>{void refresh();return()=>{if(testTimeout.current)clearTimeout(testTimeout.current);void recording.current?.cancel();void releaseSpeech();void stopSpeaking();void releaseKitten();};},[refresh]);

 const download=useCallback(async(next:SpeechModel)=>{
  if(downloading.current)return;
  downloading.current=true;cancelDownload.current=false;onBusyChange?.(true);onStatusChange?.('Downloading');
  setCandidate(next);setError('');setMessage('');setTextTested(false);setBusy({stage:'download',pct:0});
  try{
   const result=await downloadSpeechModels(next,(stage,fraction)=>setBusy({stage,pct:Math.round(fraction*100)}),current=>{task.current=current;if(current&&cancelDownload.current)void current.cancelAsync();});
   if(!result){setMessage('Download canceled. Your current speech model is unchanged.');await refresh();return;}
   setMessage(`${next.name} is installed and verified.`);await refresh();
  }catch(e){const text=(e as Error).message||'Speech recognition could not be installed.';setError(text);onStatusChange?.('Error');}
  finally{setBusy(null);task.current=null;downloading.current=false;cancelDownload.current=false;onBusyChange?.(false);}
 },[onBusyChange,onStatusChange,refresh]);

 async function setupKitten(force=false){
  if(kittenTask.current||testing)return;
  kittenTask.current=true;
  setKittenBusy(true);setKittenPct(0);setKittenStage('download');setKittenError('');
  try{
   if(force)await removeKitten();
   const cache=await installKitten();
   setKittenCached(cache.isCached);setKittenStage('verify');
   await verifyKitten();setKittenReady(true);setKittenError('');
   setMessage('KittenTTS Mini is installed and passed a local synthesis check.');
  }catch(e){setKittenReady(false);setKittenError((e as Error).message||'KittenTTS Mini could not be installed.');}
  finally{await releaseKitten().catch(()=>undefined);setKittenBusy(false);kittenTask.current=false;void refresh();}
 }

 function confirmRemoveKitten(){
  Alert.alert('Remove offline voice model?','Kitten voices will no longer be available until you install Mini again.',[
   {text:'Cancel',style:'cancel'},
   {text:'Remove',style:'destructive',onPress:()=>void (async()=>{try{await removeKitten();setKittenCached(false);setKittenReady(false);setKittenError('');if(engine==='kitten'){await setTtsEngine('system');setEngine('system');}await refresh();}catch(e){setKittenError((e as Error).message||'The voice model could not be removed.');}})()},
  ]);
 }

 const stopMicTest=useCallback(async()=>{
  if(testTimeout.current){clearTimeout(testTimeout.current);testTimeout.current=null;}
  const recorder=recording.current;recording.current=null;
  if(!recorder)return;
  try{
   const pcm=await recorder.stop(),result=await transcribe(pcm,'Interview answer.');
   if(result.text){setTextTested(true);setError('');setMessage(`Speech recognition is ready · ${result.ms} ms for ${(result.audioMs/1000).toFixed(1)} s of audio.`);onStatusChange?.('Ready');}
   else setMessage(result.reason==='no-speech'?'No speech detected. Try again a little closer to the phone.':'That was too short. Say a full sentence.');
  }catch(e){const text=(e as Error).message||'Speech recognition could not start.';setError(text);onStatusChange?.('Error');}
  finally{setTesting('');void releaseSpeech();}
 },[onStatusChange]);

 async function testMic(){
  if(!speechReady||testing)return;
  setError('');setMessage('');setTesting('mic');
  try{
   const permission=await requestMic();
   if(permission!=='granted'){
    setTesting('');setMessage(permission==='blocked'?'Microphone access is off for Brief. Turn it on in system Settings.':'Microphone access is needed for this test.');
    if(permission==='blocked')void Linking.openSettings();
    return;
   }
   await stopSpeaking();await releaseVision();await loadSpeech();
   let ended=false;
   const finish=async()=>{if(ended)return;ended=true;await stopMicTest();};
   const recorder=createRecorder({autoStop:true,onEndOfSpeech:()=>void finish()});
   recording.current=recorder;await recorder.start();setMessage('Listening… say a sentence, then pause.');
   testTimeout.current=setTimeout(()=>void finish(),6000);
  }catch(e){setTesting('');const text=(e as Error).message||'The microphone test could not start.';setError(text);onStatusChange?.('Error');}
 }

 function confirmRemoveModels(){
  Alert.alert('Remove speech model?','Voice interviews will be typed until you install a speech model again.',[
   {text:'Cancel',style:'cancel'},
   {text:'Remove',style:'destructive',onPress:()=>void (async()=>{
    try{await removeSpeechModels();setTextTested(false);setError('');setMessage('Speech recognition models were removed.');await refresh();}
    catch(e){const text=(e as Error).message||'Speech models could not be removed.';setError(text);onStatusChange?.('Error');}
   })()},
  ]);
 }

 async function previewVoice(){
  if(engine==='kitten'&&(!kittenCached||!kittenSelected)){setKittenError('Install Mini and choose a Kitten voice first.');return;}
  if(engine==='system'&&!voice?.voice)return;
  if(testing==='voice'){await stopSpeaking();return;}
  setTesting('voice');setError('');setMessage('');
  try{
   speak(KITTEN_PREVIEW_TEXT,voice?.voice,rate,(_id,finished)=>{
    setTesting('');setMessage(finished?'Voice preview finished.':'Voice preview stopped.');
    if(finished&&engine==='kitten')setKittenReady(true);
   },()=>undefined,setKittenError,voice?.offline??'none');
  }catch(e){setTesting('');setError((e as Error).message||'The interviewer voice could not start.');}
 }

 function previewKitten(selected:KittenVoice){
  if(!kittenCached||testing==='mic')return;
  if(testing==='voice'){void stopSpeaking();return;}
  setTesting('voice');setKittenError('');setMessage('');
  previewKittenVoice(KITTEN_PREVIEW_TEXT,selected,rate,(_id,finished)=>{
   setTesting('');setMessage(finished?`${voiceDisplayName(selected)} preview finished.`:`${voiceDisplayName(selected)} preview stopped.`);
   if(finished)setKittenReady(true);
  },undefined,undefined,setKittenError);
 }

 function runComparison(){
  if(testing==='voice'){void stopSpeaking();return;}
  if(testing||!COMPARISON_SAMPLES[compareSample])return;
  const text=COMPARISON_SAMPLES[compareSample];compareStarted.current=Date.now();compareFirst.current=null;compareSynthesis.current=0;setComparison(null);setTesting('voice');
  const onStart=()=>{if(compareFirst.current===null){compareFirst.current=Date.now()-compareStarted.current;}};
  const onSynthesis=(elapsedMs:number)=>{compareSynthesis.current+=elapsedMs;};
  const onEnd=(_id:number,finished:boolean)=>{setTesting('');setComparison({target:compareTarget,sample:compareSample,firstMs:compareFirst.current,totalMs:Date.now()-compareStarted.current,synthesisMs:compareTarget==='system'?null:compareSynthesis.current,finished});};
  if(compareTarget==='system')previewSystemVoice(text,compareSystemVoice??undefined,rate,onEnd,onStart);
  else previewKittenVoice(text,compareTarget as KittenVoice,rate,onEnd,onStart,onSynthesis,setKittenError);
 }

 const ratingKey=`${compareTarget}:${compareSample}`;
 const currentRatings=ratings[ratingKey]??{naturalness:0,pronunciation:0,continuity:0,stability:0};
 const setRating=(key:keyof ComparisonRatings,value:number)=>setRatings(current=>{const previous=current[ratingKey]??{naturalness:0,pronunciation:0,continuity:0,stability:0};return {...current,[ratingKey]:{...previous,[key]:previous[key]===value?0:value}};});

 async function chooseKitten(selected:KittenVoice){
  try{await setKittenVoice(selected);setKittenSelected(selected);setEngine('kitten');setKittenError('');void Haptics.selectionAsync();}
  catch(e){setKittenError((e as Error).message||'The interviewer voice could not be saved.');}
 }

 const chooseVoice=async(id:string)=>{
  if(id===voice?.voice?.identifier&&engine==='system')return;
  try{await stopSpeaking();await setPreferredVoice(id);await setTtsEngine('system');setEngine('system');await refresh();void Haptics.selectionAsync();}
  catch(e){setError((e as Error).message||'The interviewer voice could not be saved.');}
 };
 const chooseRate=async(value:RateValue)=>{
  const next=Number(value);if(next===rate)return;
  try{await setSpeechRate(next);setRate(next);void Haptics.selectionAsync();}
  catch(e){setError((e as Error).message||'Speaking speed could not be saved.');}
 };
 const status=checking?'Checking…':busy?`Downloading · ${busy.pct}%`:error?'Error':textTested?'Ready':speechReady?'Installed':'Not installed';
 const modelItems=STT_MODELS.map(item=>({value:item.id,label:item.name,detail:`${formatMB(item.bytes)} · ${item.description}${model?.id===item.id?' · Installed · Selected':''}`}));
 const installedVoiceCount=voices.length;
 const kittenStatus=!kittenSupported?'Unavailable in this app build':kittenBusy?`${kittenStage==='download'?'Downloading':'Checking voice'} · ${kittenPct}%`:kittenError?'Error':kittenReady?'Ready':kittenCached?'Installed · test voice':'Not installed';

 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:18,paddingTop:16,paddingBottom:28,gap:19}}>
  <Txt size={14} color={C.muted} style={{marginTop:-5}}>Make your practice interviews feel like real conversations.</Txt>

  <SettingsSection title="Speech recognition">
   <SettingsGroup>
    <SettingsRow icon="mic-outline" label="Offline speech model" value={status} detail={model?`${model.name} · ${formatMB(model.bytes)}`:checking?'Checking saved speech model':'Add a speech model to answer by voice.'}/>
    <SettingsDivider/>
    {busy?<View style={{paddingHorizontal:14,paddingVertical:12,gap:9}}>
      <View accessibilityRole="progressbar" accessibilityLabel={`${busy.stage==='download'?'Downloading':'Verifying'} speech model`} accessibilityValue={{min:0,max:100,now:busy.pct}} style={{height:5,borderRadius:3,backgroundColor:C.line,overflow:'hidden'}}><View style={{height:5,width:`${busy.pct}%`,backgroundColor:C.blue}}/></View>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Txt size={13} color={C.muted}>{busy.stage==='download'?'Downloading':'Verifying file'} · {busy.pct}%</Txt>{busy.stage==='download'&&<Tap accessibilityRole="button" onPress={()=>{cancelDownload.current=true;void task.current?.cancelAsync();}} style={{minHeight:40,justifyContent:'center',paddingHorizontal:5}}><Txt size={14} bold color={C.blue}>Cancel</Txt></Tap>}</View>
     </View>
     :<SettingsRow icon="cloud-download-outline" label={speechReady?'Change speech model':'Choose speech model'} value={speechReady?'Change':'Download'} disclosure onPress={()=>setChoiceSheet('model')}/>}
    {speechReady&&!busy&&<>
     <SettingsDivider/>
     <SettingsRow icon="pulse-outline" label="Test speech recognition" value={testing==='mic'?'Listening…':'Test'} onPress={()=>void testMic()} disabled={!!testing}/>
     <SettingsDivider/>
     <SettingsRow icon="trash-outline" label="Remove speech model" value="Remove" onPress={confirmRemoveModels} disabled={!!testing}/>
    </>}
   </SettingsGroup>
   {!!error&&<View style={{gap:4}} accessibilityRole="alert"><Txt size={13} color={C.danger}>{error}</Txt>{candidate&&!busy&&<Tap accessibilityRole="button" onPress={()=>void download(candidate)} style={{minHeight:40,alignSelf:'flex-start',justifyContent:'center'}}><Txt size={14} bold color={C.blue}>Try again</Txt></Tap>}</View>}
   {!!message&&<View accessibilityLiveRegion="polite"><Txt size={12} color={C.muted}>{message}</Txt></View>}
  </SettingsSection>

  <SettingsSection title="Offline voice model">
   <SettingsGroup>
    <SettingsRow icon="volume-high-outline" label="KittenTTS Mini" value={checking?'Checking…':kittenStatus} detail={`${formatMB(KITTEN_DOWNLOAD_BYTES)} model · supporting assets downloaded separately`}/>
    <SettingsDivider/>
    {kittenBusy?<View style={{paddingHorizontal:14,paddingVertical:12,gap:9}}>
      <View accessibilityRole="progressbar" accessibilityLabel={kittenStage==='download'?'Downloading KittenTTS Mini':'Checking KittenTTS Mini'} accessibilityValue={{min:0,max:100,now:kittenPct}} style={{height:5,borderRadius:3,backgroundColor:C.line,overflow:'hidden'}}><View style={{height:5,width:`${kittenPct}%`,backgroundColor:C.blue}}/></View>
      <Txt size={13} color={C.muted}>{kittenStage==='download'?'Downloading model and supporting assets':'Running a local synthesis check'} · {kittenPct}%</Txt>
     </View>
     :<SettingsRow icon={kittenCached?'checkmark-circle-outline':'cloud-download-outline'} label={kittenCached?(kittenReady?'Check voice model':'Verify voice model'):'Download voice model'} value={kittenCached?'Test':formatMB(KITTEN_DOWNLOAD_BYTES)} onPress={()=>void setupKitten()} disabled={!!testing||!kittenSupported}/>}
    {kittenCached&&!kittenBusy&&<>
     <SettingsDivider/>
     <SettingsRow icon="trash-outline" label="Remove KittenTTS Mini" value="Remove" onPress={confirmRemoveKitten} disabled={!!testing}/>
    </>}
   </SettingsGroup>
   {!!kittenError&&<View style={{gap:4}} accessibilityRole="alert"><Txt size={13} color={C.danger}>{kittenError}</Txt><Tap accessibilityRole="button" disabled={kittenBusy} onPress={()=>void setupKitten(kittenCached)} style={{minHeight:40,alignSelf:'flex-start',justifyContent:'center'}}><Txt size={14} bold color={C.blue}>{kittenCached?'Repair voice model':'Try again'}</Txt></Tap></View>}
   <Txt size={12} color={C.muted}>{kittenSupported?'Install while connected. Speech synthesis runs on this phone after setup; no audio is sent to a service.':'KittenTTS requires a Brief development build with its native audio and ONNX modules. The phone voice remains available.'}</Txt>
  </SettingsSection>

  <SettingsSection title="Interviewer voice">
   <SettingsGroup>
    <SettingsRow icon="volume-high-outline" label="Interviewer voice" value={engine==='kitten'?(kittenSelected?voiceDisplayName(kittenSelected):'Choose a Kitten voice'):voice?voice.voice?.name??'Unavailable':'Checking…'} detail={engine==='kitten'?'KittenTTS Mini · on-device':voice?.offline==='unverified'?'Offline playback is not confirmed on this device.':voice?.reason} disclosure onPress={()=>engine==='kitten'?setKittenPicker(true):installedVoiceCount>0?setChoiceSheet('voice'):void Linking.openSettings()}/>
    <SettingsDivider/>
    <SettingsRow icon="sparkles-outline" label="Kitten voices" value={kittenSelected?voiceDisplayName(kittenSelected):kittenCached?'Choose':'Install first'} detail="Eight voices included with Mini" disclosure onPress={()=>setKittenPicker(true)}/>
    {voices.length>0&&<>
     <SettingsDivider/>
     <SettingsRow icon="phone-portrait-outline" label="Use phone voice" value={engine==='system'?(voice?.voice?.name??'Selected'):'Available'} detail="Keep the current system voice as a fallback" disclosure onPress={()=>setChoiceSheet('voice')}/>
    </>}
    {voice?.offline==='none'&&<>
     <SettingsDivider/>
     <SettingsRow icon="settings-outline" label="Phone speech settings" value="Open" disclosure onPress={()=>void Linking.openSettings()}/>
    </>}
    <SettingsDivider/>
    <SettingsRow icon="speedometer-outline" label="Speaking speed" value={formatRate(rate)} disclosure onPress={()=>setChoiceSheet('rate')}/>
    <SettingsDivider/>
    <SettingsRow icon={testing==='voice'?'stop-circle-outline':'play-circle-outline'} label={testing==='voice'?'Stop voice preview':'Test interviewer voice'} value={testing==='voice'?'Stop':'Play'} onPress={()=>void previewVoice()} disabled={(engine==='kitten'?(!kittenCached||!kittenSelected):!voice?.voice)||testing==='mic'}/>
   </SettingsGroup>
   {voice?.offline==='unverified'&&<Txt size={12} color={C.muted}>This phone does not confirm whether the selected voice works offline. Test it with airplane mode on.</Txt>}
  </SettingsSection>

  {__DEV__&&<SettingsSection title="Voice comparison · development">
   <SettingsGroup>
    <SettingsRow icon="git-compare-outline" label="Comparison voice" value={compareTarget==='system'?`Phone · ${compareSystemVoice?.name??'unavailable'}`:voiceDisplayName(compareTarget as KittenVoice)} disclosure onPress={()=>setCompareChoice(true)}/>
    <SettingsDivider/>
    <View style={{padding:14,gap:10}}>
     <Txt size={13} bold>Sample {compareSample+1} of 3</Txt>
     <Txt size={13} color={C.muted} style={{lineHeight:19}}>{COMPARISON_SAMPLES[compareSample]}</Txt>
     <View style={{flexDirection:'row',gap:8}}>{COMPARISON_SAMPLES.map((_,index)=><Tap key={index} accessibilityRole="radio" accessibilityState={{selected:compareSample===index}} onPress={()=>setCompareSample(index)} style={{minWidth:42,minHeight:38,paddingHorizontal:10,borderRadius:12,backgroundColor:compareSample===index?C.pale:C.white,alignItems:'center',justifyContent:'center'}}><Txt size={13} bold color={compareSample===index?C.blue:C.muted}>{index+1}</Txt></Tap>)}</View>
     <Tap accessibilityRole="button" disabled={testing==='mic'||(!kittenCached&&compareTarget!=='system')||(compareTarget==='system'&&!compareSystemVoice)} onPress={runComparison} style={{minHeight:44,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center',opacity:testing==='mic'||(!kittenCached&&compareTarget!=='system')||(compareTarget==='system'&&!compareSystemVoice)?0.5:1}}><Txt size={14} bold color={C.blue}>{testing==='voice'?'Stop comparison':'Play comparison sample'}</Txt></Tap>
     {comparison&&<Txt size={12} color={C.muted}>Last run · {comparison.target==='system'?`Phone · ${compareSystemVoice?.name??'system'}`:voiceDisplayName(comparison.target as KittenVoice)} · Sample {comparison.sample+1}. First audible: {comparison.firstMs===null?'not reached':`${comparison.firstMs} ms`} · Request to playback end: {comparison.totalMs} ms · {comparison.synthesisMs===null?'phone synthesis timing unavailable':`Kitten synthesis compute: ${comparison.synthesisMs} ms`}{comparison.finished?'':' · stopped'}</Txt>}
     <Txt size={12} color={C.muted}>Rate the sound after listening. Compare the same sample and speed on the same device.</Txt>
     {([['naturalness','Naturalness'],['pronunciation','Pronunciation'],['continuity','Playback continuity'],['stability','Stability']] as const).map(([key,label])=><View key={key} style={{minHeight:40,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Txt size={12} color={C.muted} style={{flex:1}}>{label}</Txt><View style={{flexDirection:'row',gap:3}}>{[1,2,3,4,5].map(value=><Tap key={value} accessibilityRole="radio" accessibilityLabel={`${label} ${value} out of 5`} accessibilityState={{selected:currentRatings[key]===value}} onPress={()=>setRating(key,value)} style={{width:30,minHeight:36,alignItems:'center',justifyContent:'center'}}><Txt size={13} bold color={currentRatings[key]===value?C.blue:C.muted}>{value}</Txt></Tap>)}</View></View>)}
     <Txt size={11} color={C.muted} style={{lineHeight:16}}>Peak process memory needs Android Studio Profiler or iOS Instruments; JavaScript heap readings omit ONNX and native audio buffers. Kitten synthesis time sums per-sentence model calls; total elapsed also includes playback. The phone engine does not expose synthesis-only timing.</Txt>
    </View>
   </SettingsGroup>
  </SettingsSection>}

  <Txt size={12} color={C.muted} style={{lineHeight:18}}>
   {engine==='kitten'
    ?'Speech recognition and KittenTTS synthesis run on this phone. Interview transcripts are saved on this phone; microphone audio is discarded after transcription.'
    :voice?.offline==='unverified'
    ?'Speech recognition runs on this phone. This selected voice may use network speech; its offline behavior is not confirmed. Interview transcripts are saved on this phone, and microphone audio is discarded after transcription.'
    :voice?.offline==='verified'
     ?'Speech recognition and the selected interviewer voice run on this phone. Interview transcripts are saved on this phone; microphone audio is discarded after transcription.'
     :'Speech recognition runs on this phone. No compatible offline interviewer voice is available. Interview transcripts are saved on this phone; microphone audio is discarded after transcription.'}
  </Txt>

  <ChoiceSheet visible={choiceSheet==='model'} title="Speech recognition model" items={modelItems} selected={(model?.id??candidate?.id??STT_MODELS[0].id)} onClose={()=>setChoiceSheet('')} doneLabel={value=>value===model?.id?'Done':'Download'} onChoose={id=>{const next=STT_MODELS.find(item=>item.id===id);if(next&&next.id!==model?.id)void download(next);}}/>
  <ChoiceSheet visible={choiceSheet==='voice'} title="Interviewer voice" items={voices.map(item=>({value:item.identifier,label:item.name,detail:`${item.language.toUpperCase()} · on-device voice`}))} selected={voices.some(item=>item.identifier===voice?.voice?.identifier)?voice!.voice!.identifier:voices[0]?.identifier??''} onClose={()=>setChoiceSheet('')} onChoose={id=>void chooseVoice(id)}/>
  <ChoiceSheet visible={choiceSheet==='rate'} title="Speaking speed" items={RATES.map(item=>({value:item.value,label:item.label}))} selected={selectedRate} onClose={()=>setChoiceSheet('')} onChoose={chooseRate}/>
  {__DEV__&&<ChoiceSheet visible={compareChoice} title="Compare voice" items={[{value:'system',label:`Phone · ${compareSystemVoice?.name??'unavailable'}`,detail:'Samantha when installed; otherwise the selected phone voice'},...ALL_VOICES.map(item=>({value:item,label:voiceDisplayName(item),detail:'KittenTTS Mini'}))]} selected={compareTarget} onClose={()=>setCompareChoice(false)} onChoose={setCompareTarget}/>}
  <FormSheet visible={kittenPicker} title="Choose interviewer voice" onClose={()=>setKittenPicker(false)} doneLabel="Done" onDone={()=>setKittenPicker(false)}>
   <View style={{gap:4}}>
    <Txt size={12} color={C.muted} style={{marginBottom:6}}>{kittenCached?'KittenTTS Mini · on-device voices':'Install KittenTTS Mini to preview and select its voices.'}</Txt>
    {!kittenCached&&<Tap accessibilityRole="button" disabled={kittenBusy||!kittenSupported} onPress={()=>void setupKitten()} style={{minHeight:48,justifyContent:'center',paddingHorizontal:8,opacity:kittenSupported?1:0.5}}><Txt size={14} bold color={C.blue}>{kittenSupported?(kittenBusy?kittenStatus:'Install Mini voice model'):'Use a Brief development build'}</Txt></Tap>}
    {kittenCached&&ALL_VOICES.map((item,index)=><React.Fragment key={item}>
     {!!index&&<View style={{height:1,backgroundColor:C.line,marginLeft:34}}/>}
     <View style={{minHeight:54,flexDirection:'row',alignItems:'center',gap:8}}>
      <Tap accessibilityRole="radio" accessibilityState={{selected:engine==='kitten'&&kittenSelected===item}} onPress={()=>void chooseKitten(item)} style={{flex:1,minHeight:50,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:6}}>
       <View style={{width:22,alignItems:'center'}}>{engine==='kitten'&&kittenSelected===item&&<Icon name="checkmark" size={18} color={C.blue}/>}</View>
       <View style={{flex:1,gap:2}}><Txt size={15} bold={engine==='kitten'&&kittenSelected===item}>{voiceDisplayName(item)}</Txt><Txt size={12} color={C.muted}>KittenTTS Mini</Txt></View>
      </Tap>
      <Tap accessibilityRole="button" accessibilityLabel={`${testing==='voice'?'Stop':'Play'} ${voiceDisplayName(item)} preview`} onPress={()=>previewKitten(item)} disabled={testing==='mic'} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Icon name={testing==='voice'?'stop-circle-outline':'play-circle-outline'} size={21} color={C.blue}/></Tap>
     </View>
    </React.Fragment>)}
    {voices.length>0&&<>
     <View style={{height:1,backgroundColor:C.line,marginVertical:7}}/>
     <Tap accessibilityRole="button" onPress={()=>{setKittenPicker(false);setChoiceSheet('voice');}} style={{minHeight:48,justifyContent:'center',paddingHorizontal:8}}><Txt size={14} bold color={C.blue}>Use a phone voice</Txt></Tap>
    </>}
   </View>
  </FormSheet>
 </ScrollView>;
}
