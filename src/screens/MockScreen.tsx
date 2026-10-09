import React,{useCallback,useEffect,useState,useRef} from 'react';
import {Alert,AppState,Linking,ScrollView,TextInput,View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSharedValue,withTiming} from 'react-native-reanimated';
import {useBrief} from '../lib/appContext';import {uid,saveMessage,listMessages,archiveThread,listThreadMessages,getPref,setPref} from '../lib/db';
import {mockInterview,mockFeedback,stopGeneration,isCancelled,releaseVision,MODEL_MISSING} from '../lib/ai';import {C} from '../theme/tokens';
import {LiveMascot} from '../components/LiveMascot';
import {EmptyState,InlineError,MessageBubble,ModelSetupCard,useModelInstalled} from '../components/States';
import {FeedbackCard,MicButton,SessionReviewSheet,SpeakingBars} from '../components/Voice';
import {FormSheet} from '../components/FormSheet';
import {hasProfileDetails} from '../lib/profile';
import {MOCK_BEGIN as BEGIN,MOCK_FINISH as FINISH} from '../lib/prompts';
import {MOCK_MODES,type MockMode} from '../lib/agent/types';
import {voiceReducer,initialVoiceState,canListen,PHASE_LABEL,type VoiceEvent,type VoiceState} from '../lib/voice/machine';
import {answersGiven,isFinished,questionsAsked,shouldWrapUp,summarizeSessions,formatDuration,TARGET_QUESTIONS,type SessionSummary} from '../lib/voice/sessions';
import {createRecorder,loadSpeech,releaseSpeech,requestMic,speechInstalled,transcribe} from '../lib/voice/stt';
import {kittenVoice as getKittenVoice,speak,speechRate,stopSpeaking,ttsEngine,voiceChoice} from '../lib/voice/tts';
import {installKitten,kittenCacheInfo,releaseKitten,subscribeKittenDownload,isKittenInstalling,verifyKitten} from '../lib/voice/kitten';
import type {VoiceChoice} from '../lib/voice/catalog';
import {throttle} from '../lib/throttle';
import {CloudHalo,CompanyLogo,Icon,StatusPill,Tap,Txt,useKeyboardVisible,useFloatingNavClearance} from '../components/Ui';import type {Message} from '../types';

type Recorder=ReturnType<typeof createRecorder>;
const pill=(on:boolean)=>({minHeight:36,paddingHorizontal:12,borderRadius:18,justifyContent:'center' as const,backgroundColor:on?C.blue:C.white});
const small={minHeight:40,paddingHorizontal:14,borderRadius:20,justifyContent:'center' as const,alignItems:'center' as const,flexDirection:'row' as const,gap:6,backgroundColor:C.pale};

export function MockScreen(){const {applications,profile,mockJob:job,mockSetup,openMock,go,goTab,openAddJob}=useBrief();const bottomClearance=useFloatingNavClearance();
 const insets=useSafeAreaInsets();const kb=useKeyboardVisible();
 const openedAt=useRef(new Date().toISOString()).current; // messages newer than this animate in; history doesn't
 const installed=useModelInstalled();
 const practice=!!mockSetup.question;
 const thread=job?(practice?'practice:':'mock:')+job.id:'';
 const [messages,setMessages]=useState<Message[]>([]);const msgs=useRef<Message[]>([]);
 const setMsgs=(m:Message[])=>{msgs.current=m;setMessages(m);};
 const [loaded,setLoaded]=useState(''),[value,setValue]=useState(''),[stream,setStreamNow]=useState(''),[pickMode,setPickMode]=useState<MockMode>(mockSetup.mode);
 // Turn-taking: every action goes through the reducer; an event it rejects does nothing.
 const [vs,setVs]=useState<VoiceState>(initialVoiceState());const vsRef=useRef(vs);
 const fire=(e:VoiceEvent)=>{const n=voiceReducer(vsRef.current,e);if(n===vsRef.current)return false;vsRef.current=n;setVs(n);return true;};
 const reset=(s:VoiceState)=>{vsRef.current=s;setVs(s);};
 // The session keeps its current system voice by default; Kitten is an explicit installed voice option.
 const [voice,setVoice]=useState<{installed:boolean,choice?:VoiceChoice,engine:'system'|'kitten',kittenVoice?:string,kittenCached:boolean,kittenSupported:boolean}>({installed:false,engine:'system',kittenCached:false,kittenSupported:true});
 const [voiceMode,setVoiceMode]=useState(false),[voiceLoading,setVoiceLoading]=useState(false),[rate,setRate]=useState(1),[handsFree,setHandsFree]=useState(false),[micIssue,setMicIssue]=useState<''|'denied'|'blocked'>('');
 const [voiceSetup,setVoiceSetup]=useState(false),[kittenProgress,setKittenProgress]=useState<number|null>(null),[kittenSetupError,setKittenSetupError]=useState(''),[ttsNotice,setTtsNotice]=useState('');
 const installingKitten=useRef(false);
 const voiceReady=voice.installed&&(voice.engine==='kitten'?(voice.kittenSupported?voice.kittenCached&&!!voice.kittenVoice:voice.choice?.offline==='verified'):!!voice.choice?.voice);
 const level=useSharedValue(0);const rec=useRef<Recorder|null>(null),speakId=useRef(0),via=useRef<'voice'|'text'>('text');
 const scroll=useRef<ScrollView>(null);
 const streamTo=useRef(throttle(setStreamNow,80)).current;const setStream=(t:string)=>{if(!t){streamTo.cancel();setStreamNow('');}else streamTo(t);};
 // Past sessions (picker) and the one being reviewed.
 const [sessions,setSessions]=useState<SessionSummary[]>([]),[review,setReview]=useState<{s:SessionSummary,ms:Message[]}|null>(null);

 const meta=messages[0]?.meta,mode:MockMode=meta?.mode??pickMode,question=meta?.question??mockSetup.question,topic=meta?.topic??mockSetup.topic;

 useEffect(()=>{setPickMode(mockSetup.mode);},[mockSetup]);
 const refreshVoice=useCallback(async()=>{
  const [ok,choice,r,hf,engine,selected,cache]=await Promise.all([speechInstalled(),voiceChoice(),speechRate(),getPref('voiceHandsFree'),ttsEngine(),getKittenVoice(),kittenCacheInfo().catch(()=>null)]);
  setVoice({installed:ok,choice,engine,kittenVoice:selected,kittenCached:!!cache?.isCached,kittenSupported:!!cache});setRate(r);setHandsFree(hf==='yes');
 },[]);
 // Mock isn't keep-alive (App.tsx), so mount=focus and unmount=blur; the cleanup releases mic/speech.
 useEffect(()=>{
  void refreshVoice().catch(()=>{});
  return()=>{
   const phase=vsRef.current.phase;
   if(phase==='listening'||phase==='speaking'||phase==='synthesizing')fire({type:'BACKGROUND'});
   if(phase==='speaking'||phase==='synthesizing')void stopSpeaking();
   if(phase==='listening')void dropRecording();
   void releaseSpeech();void releaseKitten();
  };
 },[refreshVoice]);
 useEffect(()=>subscribeKittenDownload(progress=>setKittenProgress(isKittenInstalling()?Math.round(progress*100):null)),[]);
 useEffect(()=>{if(job)return;void listThreadMessages('').then(all=>setSessions(summarizeSessions(all).filter(s=>applications.some(a=>a.id===s.applicationId)).slice(0,8))).catch(()=>{});},[job,applications.length]);
 useEffect(()=>{let active=true;setLoaded('');if(!thread){setMsgs([]);return;}
  void (async()=>{let rows=await listMessages(thread);
   // A different practice question starts fresh; the previous one stays as history.
   if(mockSetup.question&&rows.length&&rows[0].meta?.question!==mockSetup.question){await archiveThread(thread,`${thread}:${Date.now()}`);rows=[];}
   if(!active)return;
   setMsgs(rows);setLoaded(thread);
   reset({phase:isFinished(rows)?'completed':'ready',turn:questionsAsked(rows),draft:''});
   setVoiceMode(!!(mockSetup.voice??(rows.length?rows.some(m=>m.meta?.via==='voice'):false)));
  })().catch(e=>{if(active)reset({...initialVoiceState(),phase:'error',error:(e as Error).message});});
  return()=>{active=false};},[thread,mockSetup]);
 // Voice mode: free the vision encoder (not needed here) and load Whisper + VAD once for the session.
 useEffect(()=>{if(!voiceMode||!voiceReady)return;let active=true;setVoiceLoading(true);
  void releaseVision().then(loadSpeech).catch(e=>{if(active){setVoiceMode(false);Alert.alert('Voice isn’t available',`${(e as Error).message}\nYou can continue by typing.`);}}).finally(()=>{if(active)setVoiceLoading(false);});
  return()=>{active=false};},[voiceMode,voiceReady]);
 // Leaving the app pauses: speech stops, the mic closes, nothing is recorded in the background.
 useEffect(()=>{const sub=AppState.addEventListener('change',st=>{if(st==='active')return;const p=vsRef.current.phase;fire({type:'BACKGROUND'});if(p==='speaking'||p==='synthesizing')void stopSpeaking();if(p==='listening')void dropRecording();void releaseKitten();});return()=>sub.remove();},[]);
 useEffect(()=>()=>{void stopSpeaking();void rec.current?.cancel();void releaseSpeech();void releaseKitten();},[]);

 async function save(m:Omit<Message,'id'|'thread'|'createdAt'>){const msg:Message={id:uid('mock'),thread,createdAt:new Date().toISOString(),...m};await saveMessage(msg);setMsgs([...msgs.current,msg]);return msg;}
 const speakOn=()=>voiceMode&&voiceReady&&!voiceLoading;

 async function begin(){if(!job||installed===false)return;if(voiceMode&&!voiceReady){setVoiceSetup(true);return;}if(!fire({type:'SEND',text:BEGIN}))return;await save({role:'user',content:BEGIN,meta:{mode:pickMode,question:mockSetup.question,topic:mockSetup.topic}});await nextTurn();}
 async function submit(text?:string){const t=(text??vsRef.current.draft).trim();if(!t||!fire({type:'SEND',text:t}))return;setValue('');await save({role:'user',content:t,meta:{via:via.current}});via.current='text';await nextTurn();}
 /** The interviewer's next question (or, after the last answer of a full interview, the feedback). */
 async function nextTurn(){if(!job)return;
  const all=msgs.current;
  if(!practice&&shouldWrapUp(all,false)){fire({type:'END'});return finish();}
  try{setStream('');
   const last=all[all.length-1];
   const out=await mockInterview(last.content,profile,job,all.slice(0,-1),{mode,question,topic,asked:questionsAsked(all),voice:speakOn(),onText:setStream});
   await save({role:'assistant',content:out});
   const sp=speakOn()&&AppState.currentState==='active'; // never start talking while the app is in the background
   if(fire({type:'REPLY',turn:questionsAsked(msgs.current),speak:sp})&&sp)await speakCurrent();
  }catch(e){fire({type:'FAILED',error:isCancelled(e)?'Stopped. Tap Try again for the next question.':(e as Error).message});}
  finally{setStream('');}}
 async function finish(){if(!job)return;
  try{
   if(!answersGiven(msgs.current)){fire({type:'DONE'});return;}
   if(msgs.current[msgs.current.length-1]?.content!==FINISH)await save({role:'user',content:FINISH});
   const fb=await mockFeedback(profile,job,msgs.current,mode,question);
   await save({role:'assistant',content:fb.text,feedback:fb.data});
   fire({type:'DONE'});
   if(speakOn())void speak('That’s the end of the interview. Your feedback is on screen.',voice.choice?.voice,rate,()=>{});
  }catch(e){fire({type:'FAILED',error:isCancelled(e)?'Stopped before the feedback was ready. Tap Try again.':(e as Error).message});}}

 async function speakCurrent(){
  const turn=vsRef.current.turn,text=[...msgs.current].reverse().find(m=>m.role==='assistant'&&!m.feedback)?.content;
  if(!text){fire({type:'SPOKEN',turn});return;}
  setTtsNotice('');
  try{speakId.current=await speak(text,voice.choice?.voice,rate,(id,finished)=>{
    if(id!==speakId.current||!fire({type:'SPOKEN',turn}))return;
    // Hands-free: open the mic after the question, with a short gap so the speaker's tail isn't recorded.
    if(finished&&handsFree)setTimeout(()=>{if(vsRef.current.phase==='ready'&&vsRef.current.turn===turn)void startListening();},400);
   },()=>{if(vsRef.current.phase==='synthesizing'&&vsRef.current.turn===turn)fire({type:'PLAYBACK_STARTED',turn});},setTtsNotice,voice.choice?.offline);}
  catch(e){fire({type:'FAILED',error:`The voice couldn’t play. ${(e as Error).message}`});}}
 function replay(){if(fire({type:'SPEAK',turn:vsRef.current.turn}))void speakCurrent();}
 async function stopTalking(){await stopSpeaking();fire({type:'SPOKEN',turn:vsRef.current.turn});}

 async function startListening(){
  if(!canListen(vsRef.current.phase)||rec.current)return;
  const perm=await requestMic();
  if(perm!=='granted'){setMicIssue(perm);return;}
  setMicIssue('');
  if(!fire({type:'LISTEN'}))return;
  const r=createRecorder({autoStop:true,onLevel:l=>level.set(withTiming(l,{duration:90})),onEndOfSpeech:()=>void stopListening()});
  rec.current=r;
  try{await r.start();}catch(e){rec.current=null;fire({type:'FAILED',error:`The microphone couldn’t start. ${(e as Error).message}`});}}
 async function stopListening(){const r=rec.current;if(!r||!fire({type:'STOP_LISTENING'}))return;rec.current=null;level.set(withTiming(0,{duration:150}));
  try{const pcm=await r.stop();const t=await transcribe(pcm,`${job?.title??''} interview answer.`);
   if(!t.text){fire({type:'NOTHING_HEARD',notice:t.reason==='too-short'?'That was very short. Tap the mic and answer again.':'I didn’t catch any speech. Try again closer to the phone, or type your answer.'});return;}
   via.current='voice';fire({type:'HEARD',text:t.text});
   if(handsFree)await submit(t.text);
  }catch(e){fire({type:'FAILED',error:`Transcription failed. ${(e as Error).message}`});}}
 async function dropRecording(){const r=rec.current;rec.current=null;level.set(0);await r?.cancel();}
 async function cancelListening(){await dropRecording();fire({type:'CANCEL_LISTENING'});}
 async function pause(){const p=vsRef.current.phase;if(!fire({type:'PAUSE'}))return;if(p==='speaking'||p==='synthesizing')await stopSpeaking();if(p==='listening')await dropRecording();}
 async function end(){const p=vsRef.current.phase;if(!fire({type:'END'}))return;if(p==='speaking'||p==='synthesizing')await stopSpeaking();await finish();}
 async function retry(){const last=msgs.current[msgs.current.length-1];
  if(last?.content===FINISH)return end();
  if(last?.role==='user'){if(fire({type:'RETRY',to:'thinking'}))await nextTurn();return;}
  fire({type:'RETRY'});}
 async function continueSession(){if(fire({type:'CONTINUE'}))await nextTurn();}
 function newSession(){Alert.alert('Start a new session?','This one is saved, so you can review it later and Ask Brief can find its feedback.',[{text:'Cancel',style:'cancel'},{text:'New session',onPress:()=>void (async()=>{await stopSpeaking();await dropRecording();await archiveThread(thread,`${thread}:${Date.now()}`);setMsgs([]);reset({phase:'ready',turn:0,draft:''});})().catch(e=>Alert.alert('Couldn’t start a new session',(e as Error).message))}]);}
 const toggleHandsFree=()=>{const v=!handsFree;setHandsFree(v);void setPref('voiceHandsFree',v?'yes':'');};
 function chooseVoiceMode(){
  if(!voice.installed){setVoiceSetup(true);return;}
  if(voice.engine==='kitten'&&voice.kittenSupported&&(!voice.kittenCached||!voice.kittenVoice)){setVoiceSetup(true);return;}
  if(voice.engine==='kitten'&&!voice.kittenSupported&&voice.choice?.offline!=='verified'){setVoiceSetup(true);return;}
  if(voice.engine==='system'&&!voice.choice?.voice){setVoiceSetup(true);return;}
  setVoiceMode(true);
 }
 async function installKittenForInterview(){
  if(installingKitten.current)return;
  installingKitten.current=true;setKittenSetupError('');setKittenProgress(0);
  try{const cache=await installKitten();await verifyKitten();await releaseKitten();setVoice(current=>({...current,kittenCached:cache.isCached,kittenSupported:true}));}
  catch(e){setKittenSetupError((e as Error).message||'The offline voice could not be installed.');}
  finally{setKittenProgress(null);installingKitten.current=false;}
 }
 async function openReview(s:SessionSummary){setReview({s,ms:(await listThreadMessages(s.thread)).filter(m=>m.thread===s.thread)});}

 // ---------- Job picker + history ----------
 if(!job)return <ScrollView contentContainerStyle={{padding:20,paddingBottom:bottomClearance,alignItems:'center',gap:16}}><View style={{marginTop:12}}><CloudHalo size={204}><LiveMascot size={140}/></CloudHalo></View><Txt size={21} bold style={{textAlign:'center'}}>Who are you interviewing for?</Txt><Txt color={C.muted} style={{textAlign:'center'}}>Choose one of your saved applications to start a mock interview.</Txt>
 <View style={{width:'100%',gap:8}}>
  {applications.length===0?<EmptyState card compact mascot={false} title="No saved jobs yet" body="Mock interviews are built from a job you’ve saved, so the questions fit the role." action={{label:'Add a job',onPress:()=>openAddJob('manual')}} secondary={{label:'Explore jobs',onPress:()=>goTab('jobs')}}/>:<>
  {installed===false&&<ModelSetupCard feature="Mock interview practice" onOpenSettings={()=>go('settings')}/>}
  {!hasProfileDetails(profile)&&<Tap accessibilityRole="button" onPress={()=>go('resume')} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:14,backgroundColor:C.pale}}><Icon name="document-text-outline" size={20} color={C.blue}/><Txt size={13} color={C.ink} style={{flex:1}}>Add your resume for questions tailored to you</Txt><Icon name="chevron-forward" size={15} color={C.blue}/></Tap>}
  {applications.map(a=><Tap key={a.id} accessibilityRole="button" onPress={()=>openMock(a)} style={{padding:13,backgroundColor:C.white,borderColor:C.line,borderWidth:1,borderRadius:18,flexDirection:'row',gap:10,alignItems:'center'}}><CompanyLogo uri={a.logoUrl} size={40}/><View style={{flex:1}}><Txt bold>{a.company}</Txt><Txt color={C.muted} size={12} style={{flexShrink:1}}>{a.title}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={15}/></Tap>)}
  {sessions.length>0&&<View style={{gap:8,marginTop:12}}><Txt bold size={17}>Past interviews</Txt>
   {sessions.map(s=>{const a=applications.find(x=>x.id===s.applicationId)!;return <Tap key={s.thread} accessibilityRole="button" accessibilityHint="Opens the transcript and feedback" onPress={()=>void openReview(s)} style={{padding:12,backgroundColor:C.white,borderRadius:16,flexDirection:'row',gap:10,alignItems:'center'}}>
    <Icon name={s.voice?'mic-outline':'chatbubble-outline'} size={18} color={C.blue}/>
    <View style={{flex:1}}><Txt size={14} bold numberOfLines={1}>{a.company} · {s.question?'Question practice':MOCK_MODES.find(m=>m.value===s.mode)?.label}</Txt><Txt size={12} color={C.muted}>{new Date(s.endedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {s.answers} answer{s.answers===1?'':'s'} · {formatDuration(s.durationMs)} · {s.finished?'feedback ready':'paused'}</Txt></View>
    <Icon name="chevron-forward" size={15} color={C.soft}/></Tap>;})}
  </View>}
 </>}</View>
 <SessionReviewSheet visible={!!review} session={review?.s??null} messages={review?.ms??[]} title="Interview" onClose={()=>setReview(null)} onContinue={review?()=>{const a=applications.find(x=>x.id===review.s.applicationId);setReview(null);if(a)openMock(a,{mode:review.s.mode,question:review.s.question,voice:review.s.voice});}:undefined}/>
 </ScrollView>;

 // ---------- Session ----------
 const phase=vs.phase,answered=answersGiven(messages),started=messages.length>0,last=messages[messages.length-1];
 const needsContinue=phase==='ready'&&last?.role==='user'&&last.content!==FINISH&&!stream;
 const needsFeedback=phase==='ready'&&last?.content===FINISH;
 const feedbackMsg=messages.find(m=>m.role==='assistant'&&messages.indexOf(m)>messages.findIndex(x=>x.content===FINISH)&&messages.some(x=>x.content===FINISH));
 const label=question?`Practicing “${question}”`:`${MOCK_MODES.find(m=>m.value===mode)?.label}${topic?` · ${topic}`:''}`;
 const live=started&&phase!=='completed';
 const voiceNote=!voice.installed?'Voice needs the speech models: Settings → Voice interviews.':!voice.choice?.voice?voice.choice?.reason:voice.choice.offline==='unverified'?voice.choice.reason:'';
 return <KeyboardAvoidingView style={{flex:1}} behavior="padding" keyboardVerticalOffset={insets.top+59}>
 {/* Interviewer */}
 {!kb&&<View style={{alignItems:'center',gap:2}}><CloudHalo size={118}><LiveMascot size={80} mood={phase==='thinking'||phase==='transcribing'?'question':phase==='error'?'sad':'happy'} label={PHASE_LABEL[phase]}/></CloudHalo><SpeakingBars active={phase==='speaking'}/></View>}
 <View style={{alignItems:'center',paddingHorizontal:16,gap:2}}>
  <Tap accessibilityRole="button" accessibilityLabel={`Change job, currently ${job.title} at ${job.company}`} onPress={()=>openMock(null)} style={{flexDirection:'row',alignItems:'center',gap:8,maxWidth:'100%',paddingVertical:5,paddingLeft:6,paddingRight:11,borderRadius:22,backgroundColor:C.white,borderWidth:1,borderColor:C.line}}>
   <CompanyLogo uri={job.logoUrl} size={24} circle/>
   <Txt size={12} numberOfLines={1} style={{flexShrink:1}}><Txt size={12} bold>{job.company}</Txt><Txt size={12} color={C.muted}> · {job.title}</Txt></Txt>
   <Txt size={12} bold color={C.blue}>Change</Txt>
  </Tap>
  {started&&<View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
   <Txt size={12} color={C.muted} numberOfLines={1} style={{flexShrink:1}}>{label}</Txt>
   {!practice&&<View accessible accessibilityLabel={`Question ${Math.min(TARGET_QUESTIONS,Math.max(1,vs.turn))} of ${TARGET_QUESTIONS}`} style={{flexDirection:'row',gap:4}}>{Array.from({length:TARGET_QUESTIONS},(_,i)=><View key={i} style={{width:7,height:7,borderRadius:4,backgroundColor:i<answered?C.blue:i<vs.turn?C.pale:C.line}}/>)}</View>}
   {live&&(phase==='paused'?null:<Tap accessibilityRole="button" disabled={phase==='thinking'||phase==='transcribing'} onPress={()=>void pause()} hitSlop={8} style={{minHeight:30,justifyContent:'center'}}><Txt size={12} bold color={C.blue}>Pause</Txt></Tap>)}
   {live&&<Tap accessibilityRole="button" disabled={phase==='thinking'||phase==='transcribing'} onPress={()=>Alert.alert('End the interview?',answered?'Brief will give you feedback on your answers so far.':'You haven’t answered anything yet.',[{text:'Keep going',style:'cancel'},{text:'End',onPress:()=>void end()}])} hitSlop={8} style={{minHeight:30,justifyContent:'center'}}><Txt size={12} bold color={C.blue}>End</Txt></Tap>}
   {(phase==='completed'||phase==='ready'&&!live)&&<Tap accessibilityRole="button" onPress={newSession} hitSlop={8} style={{minHeight:30,justifyContent:'center'}}><Txt size={12} bold color={C.blue}>New session</Txt></Tap>}
  </View>}
 </View>
 {/* Transcript */}
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:true})} contentContainerStyle={{flexGrow:1,justifyContent:'flex-end',gap:9,padding:15,paddingBottom:14}}>
 {!started&&loaded===thread&&installed!==false&&<View style={{backgroundColor:C.pale,padding:14,borderRadius:17,gap:12}}>
  <Txt bold>{question?'Practice one question':'Ready to practice?'}</Txt>
  <Txt color={C.muted}>{question?`Brief will ask “${question}”, then rate your answer and help you improve it. Try as many times as you like.`:`About ${TARGET_QUESTIONS} questions, then feedback. Questions use this job’s description${hasProfileDetails(profile)?' and the resume details you allowed':''}.`} Everything runs on your phone.</Txt>
  {!question&&<View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{MOCK_MODES.map(m=><Tap key={m.value} accessibilityRole="radio" accessibilityState={{selected:pickMode===m.value}} onPress={()=>setPickMode(m.value)} style={pill(pickMode===m.value)}><Txt size={13} bold color={pickMode===m.value?C.white:C.ink}>{m.label}</Txt></Tap>)}</View>}
  <View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:8}}>
   <Tap accessibilityRole="radio" accessibilityState={{selected:voiceMode,disabled:!voice.installed}} disabled={!voice.installed} onPress={chooseVoiceMode} style={[pill(voiceMode),{flexDirection:'row',alignItems:'center',gap:6,opacity:voice.installed?1:0.5}]}><Icon name="mic-outline" size={15} color={voiceMode?C.white:C.ink}/><Txt size={13} bold color={voiceMode?C.white:C.ink}>Speak</Txt></Tap>
   <Tap accessibilityRole="radio" accessibilityState={{selected:!voiceMode}} onPress={()=>setVoiceMode(false)} style={[pill(!voiceMode),{flexDirection:'row',alignItems:'center',gap:6}]}><Icon name="chatbubble-outline" size={15} color={!voiceMode?C.white:C.ink}/><Txt size={13} bold color={!voiceMode?C.white:C.ink}>Type</Txt></Tap>
  </View>
  {!!voiceNote&&<Tap accessibilityRole="button" onPress={()=>go('settings')}><Txt size={12} color={C.muted}>{voiceNote} <Txt size={12} bold color={C.blue}>Settings</Txt></Txt></Tap>}
  <Tap accessibilityRole="button" disabled={phase!=='ready'||voiceLoading} onPress={()=>void begin()} style={{minHeight:46,borderRadius:13,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',opacity:phase!=='ready'||voiceLoading?0.6:1}}><Txt bold color={C.white}>{voiceLoading?'Loading speech…':question?'Ask me':'Start interview'}</Txt></Tap>
 </View>}
 {messages.filter(m=>m.content!==BEGIN&&m.id!==feedbackMsg?.id).map(m=><MessageBubble key={m.id} role={m.role} avatar={29} text={m.content===FINISH?'Finish and give me feedback.':m.content} animate={m.createdAt>openedAt}/>)}
 {phase==='thinking'&&!!stream&&<MessageBubble role="assistant" avatar={29} text={stream} animate={false}/>}
 {feedbackMsg&&<FeedbackCard feedback={feedbackMsg.feedback} text={feedbackMsg.content}/>}
 {installed===false&&<ModelSetupCard feature="Mock interview practice" onOpenSettings={()=>go('settings')}/>}
 {phase==='error'&&<InlineError message={vs.error===MODEL_MISSING?vs.error:vs.error||'Something went wrong.'} onRetry={()=>void retry()}/>}
 {!!micIssue&&<InlineError message={micIssue==='blocked'?'Microphone access is off for Brief. Turn it on in Settings, or type your answer.':'Brief needs the microphone to hear your answer. You can also type it.'} onRetry={micIssue==='blocked'?()=>void Linking.openSettings():()=>void startListening()}/>}
 </ScrollView>
 {/* Controls */}
 <View style={{paddingHorizontal:17,paddingBottom:kb?8:82,gap:8}}>
  {!!vs.notice&&<View accessibilityLiveRegion="polite"><Txt size={13} color={C.muted} style={{textAlign:'center'}}>{vs.notice}</Txt></View>}
  {started&&live&&<View accessibilityLiveRegion="polite" style={{alignItems:'center'}}><Txt size={13} bold color={phase==='listening'?C.blue:C.muted}>{phase==='ready'&&voiceMode&&voiceReady?'Your turn — tap the mic to answer':PHASE_LABEL[phase]}</Txt></View>}
  {needsContinue&&<Tap accessibilityRole="button" onPress={()=>void continueSession()} style={[small,{alignSelf:'center'}]}><Icon name="play" size={15} color={C.blue}/><Txt bold size={14} color={C.blue}>Continue interview</Txt></Tap>}
  {needsFeedback&&<Tap accessibilityRole="button" onPress={()=>void end()} style={[small,{alignSelf:'center'}]}><Txt bold size={14} color={C.blue}>Get my feedback</Txt></Tap>}
  {phase==='paused'&&<View style={{flexDirection:'row',gap:8,justifyContent:'center'}}><Tap accessibilityRole="button" onPress={()=>fire({type:'RESUME'})} style={[small,{backgroundColor:C.blue}]}><Icon name="play" size={15} color={C.white}/><Txt bold size={14} color={C.white}>Resume</Txt></Tap></View>}
  {(phase==='speaking'||phase==='synthesizing')&&<View style={{flexDirection:'row',gap:8,justifyContent:'center'}}><Tap accessibilityRole="button" onPress={()=>void stopTalking()} style={small}><Icon name="stop" size={14} color={C.blue}/><Txt bold size={14} color={C.blue}>Stop speaking</Txt></Tap></View>}
  {phase==='thinking'&&<View style={{alignItems:'center'}}><Tap accessibilityRole="button" accessibilityLabel="Stop generating" onPress={()=>void stopGeneration()} style={small}><Icon name="stop" size={14} color={C.blue}/><Txt bold size={14} color={C.blue}>Stop</Txt></Tap></View>}
  {/* Voice: big mic; review the transcript before it's sent */}
  {voiceMode&&voiceReady&&started&&(phase==='ready'||phase==='listening')&&!needsContinue&&!needsFeedback&&<View style={{alignItems:'center',gap:6}}>
   <MicButton listening={phase==='listening'} level={level} disabled={voiceLoading} label={phase==='listening'?'Done speaking':'Answer by voice'} onPress={()=>void (phase==='listening'?stopListening():startListening())}/>
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
    {phase==='listening'?<Tap accessibilityRole="button" onPress={()=>void cancelListening()} style={small}><Txt bold size={13} color={C.blue}>Cancel</Txt></Tap>:<>
     <Tap accessibilityRole="button" accessibilityLabel="Replay the question" onPress={replay} style={small}><Icon name="refresh" size={14} color={C.blue}/><Txt bold size={13} color={C.blue}>Replay</Txt></Tap>
     {!practice&&<Tap accessibilityRole="button" onPress={()=>void submit('Can we skip this one? Please ask me a different question.')} style={small}><Icon name="play-skip-forward" size={14} color={C.blue}/><Txt bold size={13} color={C.blue}>Skip</Txt></Tap>}
     <Tap accessibilityRole="switch" accessibilityState={{checked:handsFree}} onPress={toggleHandsFree} style={[small,{backgroundColor:handsFree?C.blue:C.pale}]}><Txt bold size={13} color={handsFree?C.white:C.blue}>Hands-free</Txt></Tap>
    </>}
   </View>
  </View>}
  {phase==='reviewing'&&<View style={{gap:8}}>
   <Txt size={12} color={C.muted}>Transcribed on your phone. Fix anything it misheard, then send.</Txt>
   <TextInput accessibilityLabel="Your answer (edit before sending)" value={vs.draft} onChangeText={t=>fire({type:'EDIT',text:t})} multiline style={{backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.line,padding:12,maxHeight:150,color:C.ink,fontSize:15}}/>
   <View style={{flexDirection:'row',gap:8}}>
    <Tap accessibilityRole="button" onPress={()=>void startListening()} style={[small,{flex:1}]}><Icon name="mic-outline" size={15} color={C.blue}/><Txt bold size={14} color={C.blue}>Re-record</Txt></Tap>
    <Tap accessibilityRole="button" disabled={!vs.draft.trim()} onPress={()=>void submit()} style={[small,{flex:1,backgroundColor:C.blue,opacity:vs.draft.trim()?1:0.5}]}><Txt bold size={14} color={C.white}>Send answer</Txt></Tap>
   </View>
  </View>}
  {/* Text answers (text mode, or typing instead of speaking) */}
  {started&&phase==='ready'&&!needsContinue&&!needsFeedback&&installed!==false&&<View style={{flexDirection:'row',backgroundColor:C.white,borderRadius:22,alignItems:'center',padding:6,borderWidth:1,borderColor:C.line}}>
   <TextInput accessibilityLabel="Type your answer" value={value} onChangeText={setValue} style={{flex:1,padding:8,color:C.ink,maxHeight:120}} placeholder={voiceMode&&voiceReady?'Or type your answer…':'Type your answer…'} placeholderTextColor={C.soft} multiline/>
   <Tap accessibilityRole="button" accessibilityLabel="Send answer" disabled={!value.trim()} onPress={()=>{via.current='text';void submit(value);}} style={{backgroundColor:C.blue,opacity:value.trim()?1:.5,borderRadius:20,width:40,height:40,alignItems:'center',justifyContent:'center'}}><Icon name="arrow-up" color={C.white}/></Tap>
  </View>}
  {!!ttsNotice&&<Tap accessibilityRole="button" onPress={()=>setTtsNotice('')}><Txt size={12} color={C.muted} style={{textAlign:'center'}}>{ttsNotice}</Txt></Tap>}
 </View>
 <FormSheet visible={voiceSetup} title="Set up voice interviews" onClose={()=>setVoiceSetup(false)} doneLabel="Done" onDone={()=>setVoiceSetup(false)}>
  <View style={{gap:12,paddingBottom:8}}>
   <Txt size={14} color={C.muted} style={{lineHeight:20}}>{!voice.installed?'Install an offline speech recognition model before answering with your voice.':voice.engine==='kitten'&&!voice.kittenSupported?'This build does not have the Kitten native module. Rebuild Brief or switch to an installed offline phone voice.':voice.engine==='kitten'&&!voice.kittenCached?'Install the offline Mini voice model to continue with your selected interviewer voice.':voice.engine==='kitten'&&!voice.kittenVoice?'Choose a Kitten voice in Voice interviews settings, then return here.':'Choose an offline interviewer voice in Voice interviews settings.'}</Txt>
   {voice.engine==='kitten'&&voice.kittenSupported&&!voice.kittenCached&&<>
    <Txt size={13} color={C.muted}>KittenTTS Mini · about 83 MB plus supporting assets. Speech synthesis runs on this phone after setup.</Txt>
    {kittenProgress!==null&&<View accessibilityRole="progressbar" accessibilityLabel="Downloading KittenTTS Mini" accessibilityValue={{min:0,max:100,now:kittenProgress}} style={{height:5,borderRadius:3,backgroundColor:C.line,overflow:'hidden'}}><View style={{height:5,width:`${kittenProgress}%`,backgroundColor:C.blue}}/></View>}
    {!!kittenSetupError&&<View accessibilityRole="alert"><Txt size={13} color={C.danger}>{kittenSetupError}</Txt></View>}
    <Tap accessibilityRole="button" disabled={kittenProgress!==null} onPress={()=>void installKittenForInterview()} style={{minHeight:46,borderRadius:13,backgroundColor:C.blue,justifyContent:'center',alignItems:'center',opacity:kittenProgress!==null?0.6:1}}><Txt bold color={C.white}>{kittenProgress===null?'Download voice model':`Downloading · ${kittenProgress}%`}</Txt></Tap>
   </>}
   <Tap accessibilityRole="button" onPress={()=>{setVoiceSetup(false);go('settings');}} style={{minHeight:42,justifyContent:'center',alignItems:'center'}}><Txt size={14} bold color={C.blue}>Open Voice interviews settings</Txt></Tap>
  </View>
 </FormSheet>
 </KeyboardAvoidingView>;
}
