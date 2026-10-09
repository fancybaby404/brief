import React,{useEffect,useRef,useState} from 'react';import {Alert,Dimensions,Image,Modal,Pressable,ScrollView,TextInput,View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Reanimated,{FadeIn} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {useBrief} from '../lib/appContext';import * as DB from '../lib/db';import {uid,listMessages,saveMessage} from '../lib/db';
import {timer} from '../lib/perf';
import {throttle} from '../lib/throttle';
import {modelLoaded,askBrief,suggestBriefQuestions,visionInstalled,routeIntent,visionExtractJobs,visionExtractEvent,visionExtractResume,stopGeneration,isCancelled,MODEL_MISSING} from '../lib/ai';
import {pickJobImage,pickImageFile,importChatImage,recognizeJobImage} from '../lib/imports';import {C} from '../theme/tokens';import {Heading,Icon,Popover,Txt,useKeyboardVisible,Tap} from '../components/Ui';import type {Event,Message} from '../types';
import {CameraPanel} from '../components/CameraPanel';
import {LiveMascot} from '../components/LiveMascot';
import {InlineError,MessageBubble,ModelSetupCard,ThinkingBubble,TypingDots,useModelInstalled} from '../components/States';
import {AgentCardView,WorkingRow} from '../components/AgentCards';
import {EventSheet,type EventDraft} from '../components/EventSheet';
import {EASE_OUT} from '../theme/motion';
import {planTurn,type Turn} from '../lib/agent/plan';
import {looksLikeAction} from '../lib/agent/intent';
import {findDuplicateApplication,namedApplication} from '../lib/agent/resolve';
import {parseIsoParts} from '../lib/agent/dates';
import {kindInfo,suggestTitle,toLocalIso} from '../lib/events';
import {earlierSummary,visionUser} from '../lib/prompts';
import type {AgentCard,AgentStore} from '../lib/agent/types';

const PAGE=60;
const tomorrowAt10=()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);return d;};

export function ChatScreen(){const brief=useBrief();const {profile,applications,events,chatJob,go,putApp,removeApp,putEvent,removeEvent}=brief;const thread=chatJob?'job:'+chatJob.id:'general';
 const [messages,setMessages]=useState<Message[]>([]),[entry,setEntry]=useState(''),[imageUri,setImageUri]=useState(''),[suggestions,setSuggestions]=useState<string[]>([]),[suggestionsBusy,setSuggestionsBusy]=useState(false),[loadedThread,setLoadedThread]=useState(''),[visionReady,setVisionReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const scroll=useRef<ScrollView>(null),suggestionCycle=useRef(0);
 const [stream,setStreamNow]=useState(''),[working,setWorking]=useState(''),[hasEarlier,setHasEarlier]=useState(false);
 // Streamed tokens repaint at most ~12×/s (not per token), so the transcript isn't re-rendered 20×/s while generating.
 const streamTo=useRef(throttle(setStreamNow,80)).current;const setStream=(t:string)=>{if(!t){streamTo.cancel();setStreamNow('');}else streamTo(t);};
 /** Older history pages in on request; the newest page loads with the screen. */
 async function loadEarlier(){const older=await listMessages(thread,PAGE,messages.length);setHasEarlier(older.length===PAGE);setMessages(m=>[...older,...m]);}
 // The job this conversation is about. Follow-ups ("Am I qualified?") use it; naming another job switches it.
 const defaultFocus=chatJob?.id??null;
 const [focus,setFocus]=useState<string|null>(defaultFocus);
 const [sheet,setSheet]=useState<{open:boolean,event?:Event,draft?:EventDraft,msgId?:string}>({open:false});
 const latest=useRef<Message[]>([]);latest.current=messages;
 const insets=useSafeAreaInsets();const kb=useKeyboardVisible();
 const openedAt=useRef(new Date().toISOString()).current; // messages newer than this animate in; history doesn't
 const installed=useModelInstalled();const noModel=installed===false||error===MODEL_MISSING;
 const aiReady=installed===true&&!noModel;
 const focusApp=applications.find(a=>a.id===focus)||null;
 // What the agent reads and changes: the same SQLite-backed state the rest of the app uses.
 const store:AgentStore={applications,events,profile,putApp,removeApp:id=>removeApp(id,false),putEvent,removeEvent,
  reload:async()=>({applications:await DB.listApplications(),events:await DB.listEvents()}),messages:DB.listThreadMessages};
 const fid=(m:Message)=>m.focusId===undefined?defaultFocus:m.focusId;

 useEffect(()=>{let active=true;setLoadedThread('');setMessages([]);setError('');setImageUri('');setSuggestions([]);setSuggestionsBusy(false);setFocus(defaultFocus);
  void listMessages(thread,PAGE).then(rows=>{if(!active)return;setMessages(rows);setHasEarlier(rows.length===PAGE);setLoadedThread(thread);const last=[...rows].reverse().find(m=>m.focusId!==undefined);if(last)setFocus(last.focusId??null);}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false};},[thread]);
 useEffect(()=>{if(!aiReady){setVisionReady(false);return;}let active=true;void visionInstalled().then(v=>{if(active)setVisionReady(v);}).catch(()=>{if(active)setVisionReady(false);});return()=>{active=false};},[aiReady]);
 // Chips are optional: generate them only if the model is already loaded (never load 1.2 GB just for chips).
 useEffect(()=>{if(loadedThread!==thread||!aiReady)return;const last=[...messages].reverse().find(m=>m.role==='assistant');if(last?.card)return;if(!last?.suggestions?.length&&!modelLoaded())return;if(last?.suggestions?.length){setSuggestions(last.suggestions);return;}let active=true;const cycle=++suggestionCycle.current;setSuggestionsBusy(true);void suggestBriefQuestions(profile,applications,modelHistory(messages,focus).recent,focusApp||undefined).then(xs=>{if(active&&suggestionCycle.current===cycle)setSuggestions(xs);}).catch(()=>{}).finally(()=>{if(active&&suggestionCycle.current===cycle)setSuggestionsBusy(false);});return()=>{active=false;suggestionCycle.current++;};},[loadedThread,thread,aiReady]);

 /** Only this job's recent turns go to the model (no cross-job leakage); older ones become a one-line summary. */
 function modelHistory(all:Message[],focusId:string|null){const relevant=all.filter(m=>!m.card&&!!m.content&&fid(m)===focusId);return {recent:relevant.slice(-6),earlier:earlierSummary(relevant.slice(0,-6))};}
 async function addAssistant(m:Omit<Message,'id'|'thread'|'role'|'createdAt'>){const msg:Message={id:uid('msg'),thread,role:'assistant',createdAt:new Date().toISOString(),...m};await saveMessage(msg);setMessages(old=>[...old,msg]);return msg;}
 /** A reply built from saved data (lists, confirmations, previews). */
 async function post(turn:Turn){if(turn.type!=='reply')return;const f=turn.focusId===undefined?focus:turn.focusId;if(f!==focus)setFocus(f);setSuggestions([]);await addAssistant({content:turn.text,card:turn.card,source:'saved',focusId:f});}
 const updateCard=(id:string)=>(card:AgentCard)=>{setMessages(old=>old.map(m=>m.id===id?{...m,card}:m));const m=latest.current.find(x=>x.id===id);if(m)void saveMessage({...m,card});};

 async function answer(prompt:string,history:Message[],focusId:string|null,facts?:string,image?:string){
  if(focusId!==focus)setFocus(focusId);
  const selected=applications.find(a=>a.id===focusId);const {recent,earlier}=modelHistory(history,focusId);
  const out=await askBrief(prompt,profile,applications,recent,selected,image,{facts,earlier},setStream);
  let next=out.suggestions;
  if(!next.length){try{next=await suggestBriefQuestions(profile,applications,[...recent,{id:'q',thread,role:'user',content:prompt,createdAt:''},{id:'a',thread,role:'assistant',content:out.answer,createdAt:''}],selected);}catch{}}
  await addAssistant({content:out.answer,suggestions:next,source:'model',focusId});setSuggestions(next);
 }
 /** Image turns: Qwen3-VL reads the image; native OCR text (if any) is a second, fenced source. */
 async function vision(task:'import'|'event'|'question'|'resume',followUps:NonNullable<Extract<AgentCard,{type:'job'}>['followUps']>,q:string,history:Message[],image:string){
  setWorking('Reading the image on your phone…');
  const ocr=await recognizeJobImage(image).catch(()=>'');
  if(task==='resume'){
   const r=await visionExtractResume(image,ocr);
   if(!r.isResume)return post({type:'reply',text:'This doesn’t look like a resume. Try a clearer photo of the page, or import the PDF in Resume.'});
   await addAssistant({source:'model',focusId:focus,content:'Here’s what I read from your resume. Check it, then save it to your profile.',card:{type:'resume',state:'pending',fields:{name:r.name,skills:r.skills,experience:r.experience,education:r.education,goals:r.goals},interview:/interview|practi|question/i.test(q)}});
   return;
  }
  if(task==='question'){setWorking('');return answer(visionUser(q,ocr),history,focus,undefined,image);}
  if(task==='import'){
   const r=await visionExtractJobs(image,q,ocr);
   if(!r.readable)return post({type:'reply',text:'I couldn’t read a job posting in this image. Try a sharper screenshot that shows the job title, or add it with + → Add Job.'});
   for(const [i,j] of r.jobs.entries())await addAssistant({source:'model',focusId:focus,content:i?'':r.jobs.length>1?`I found ${r.jobs.length} jobs in this image. Review each one before saving.`:'Here’s what I read. Check it, then save.',
    card:{type:'job',fields:j,status:'interested',state:'pending',duplicateId:findDuplicateApplication(applications,j.company,j.title)?.id,note:ocr?'Read on this phone with Qwen3-VL and text recognition.':'Read on this phone with Qwen3-VL.',followUps}});
   return;
  }
  const ev=await visionExtractEvent(image,q,ocr);
  if(!ev.is_invitation&&!ev.date)return post({type:'reply',text:'I didn’t find an interview or event date in this image. You can still add one in Calendar.'});
  const named=namedApplication(`${ev.company??''} ${ev.role??''}`,applications),job=named.kind==='one'?named.item:null;
  const kind=ev.kind??'interview',when=ev.date?parseIsoParts(ev.date,ev.time??''):null;
  await addAssistant({source:'model',focusId:job?.id??focus,
   content:job?`This looks like an invitation for ${job.title} at ${job.company}. Review it, then save.`:ev.company?`This looks like an invitation from ${ev.company}. It isn’t linked to a saved job.`:'Here’s what I read from the image.',
   card:{type:'event',state:'pending',offerInterviewStatus:kind==='interview'&&!!job&&['interested','applied','under_review'].includes(job.status),
    proposal:{applicationId:job?.id??null,kind,title:job?suggestTitle(kind,job):`${kindInfo(kind).label}${ev.company?` with ${ev.company}`:''}`,date:toLocalIso(when??tomorrowAt10()),location:ev.location,notes:ev.notes,
     assumed:!when?'Date not found in the image — set it before saving':!ev.time?'Time not found in the image — check it':undefined}}});
 }

 async function respond(q:string,history:Message[],user:Message,image?:string){setError('');setBusy(true);setStream('');const done=timer('agent.turn');
  try{
   let turn=await planTurn(q,store,{hasImage:!!image,focusId:focus});
   if(turn.type==='route'){
    // Rules couldn't read it. Action-like? The model classifies (schema-constrained); otherwise it's a question.
    if(aiReady&&looksLikeAction(q)){setWorking('Working out what you’d like to do…');turn=await planTurn(q,store,{focusId:focus,intent:await routeIntent(q)});setWorking('');}
    if(turn.type==='route')turn=await planTurn(q,store,{focusId:focus,intent:{kind:'chat'}});
   }
   const f=turn.type==='reply'||turn.type==='answer'?turn.focusId:undefined;
   if(f!==undefined&&f!==user.focusId){const u={...user,focusId:f};setMessages(old=>old.map(m=>m.id===u.id?u:m));void saveMessage(u);}
   if(turn.type==='reply')return await post(turn);
   if(!aiReady)throw new Error(MODEL_MISSING); // saved-data actions above work without a model; answers don't
   if(turn.type==='vision')return await vision(turn.task,turn.followUps,q,history,image!);
   if(turn.type==='answer')await answer(q,history,turn.focusId===undefined?focus:turn.focusId,turn.facts);
  }catch(e){
   if(isCancelled(e)){if(e.partial.trim())await addAssistant({content:`${e.partial.trim()}\n\n— Stopped`,source:'model',focusId:focus});}
   else setError((e as Error).message);
  }finally{done();setBusy(false);setStream('');setWorking('');}}
 async function attachUri(uri:string){try{setImageUri(await importChatImage(uri));}catch(e){Alert.alert('Couldn’t add image',(e as Error).message);}}
 async function attachImage(){if(!aiReady||!visionReady||busy)return;try{const picked=await pickJobImage();if(picked)await attachUri(picked);}catch(e){Alert.alert('Couldn’t add image',(e as Error).message);}}
 async function attachFile(){if(!aiReady||!visionReady||busy)return;try{const picked=await pickImageFile();if(picked)await attachUri(picked);}catch(e){Alert.alert('Couldn’t add image',(e as Error).message);}}
 const attachBtn=useRef<View>(null);
 const [attachPos,setAttachPos]=useState<{left:number,bottom:number}|null>(null),[attachOpen,setAttachOpen]=useState(false),[cameraOpen,setCameraOpen]=useState(false);
 const showAttach=()=>attachBtn.current?.measureInWindow((x,y)=>{setAttachPos({left:Math.max(8,x-6),bottom:Dimensions.get('window').height-y+8});setAttachOpen(true);});
 const hideAttach=(then?:()=>void)=>{setAttachOpen(false);setTimeout(()=>{setAttachPos(null);then?.();},160);};
 async function send(text=entry){const q=text.trim(),attachment=imageUri;if((!q&&!attachment)||busy||installed===null||(attachment&&!visionReady))return;suggestionCycle.current++;setSuggestionsBusy(false);const prompt=q||'Describe this image and suggest how it could help with my job search.';setEntry('');setImageUri('');setSuggestions([]);const m:Message={id:uid('msg'),thread,role:'user',content:prompt,imageUri:attachment||undefined,createdAt:new Date().toISOString(),focusId:focus};const previous=messages;setMessages(old=>[...old,m]);await saveMessage(m);await respond(prompt,previous,m,attachment||undefined);}
 function retry(){const i=messages.map(m=>m.role).lastIndexOf('user');if(i>=0&&!busy){suggestionCycle.current++;setSuggestionsBusy(false);setSuggestions([]);void respond(messages[i].content,messages.slice(0,i),messages[i],messages[i].imageUri);}}
 const reviewEvent=(msgId:string)=>(card:Extract<AgentCard,{type:'event'}>)=>{const p=card.proposal,existing=p.eventId?events.find(e=>e.id===p.eventId):undefined;
  if(p.eventId&&!existing)return Alert.alert('Event not found','It may have been deleted.');
  setSheet(existing?{open:true,event:{...existing,date:p.date},msgId}:{open:true,msgId,draft:{applicationId:p.applicationId,kind:p.kind,date:new Date(p.date),title:p.title,location:p.location,notes:p.notes}});};
 const cardActions=(m:Message)=>({store,update:updateCard(m.id),post:(t:Turn)=>void post(t),send:(t:string)=>void send(t),reviewEvent:reviewEvent(m.id),openEvent:(e:Event)=>setSheet({open:true,event:e}),busy});
 const canType=installed!==null;
 return <KeyboardAvoidingView style={{flex:1}} behavior="padding" keyboardVerticalOffset={insets.top+59}>
 <View style={{paddingHorizontal:18,paddingBottom:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}><Heading>Ask Brief</Heading><Txt color={C.muted} size={12} style={{flexShrink:1}}>{chatJob?chatJob.title+' · '+chatJob.company:'Your on-device job search companion'}</Txt></View>{!kb&&<View style={{backgroundColor:C.pale,borderRadius:45,padding:6}}><LiveMascot size={66} mood={busy?'question':error?'sad':'happy'} label={busy?'Brief is thinking':'Brief, the mascot'}/></View>}</View>
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:true})} contentContainerStyle={{paddingHorizontal:16,paddingBottom:12,gap:12,flexGrow:1,justifyContent:'flex-end'}}>
 {messages.length===0&&<View style={{alignItems:'center',gap:6,paddingHorizontal:20,paddingBottom:8}}>
  <Txt bold size={17} style={{textAlign:'center'}}>{chatJob?'Ask about this job':'Ask me, or tell me what to do'}</Txt>
  <Txt size={14} color={C.muted} style={{textAlign:'center',lineHeight:20}}>{chatJob?'Red flags, what to ask HR, or whether you’re a fit — answers use this job’s description.':'“Show my saved jobs”, “Schedule my Notion interview tomorrow at 2 PM”, or attach a job screenshot.'} Everything stays on this phone.</Txt>
 </View>}
 {hasEarlier&&<Tap accessibilityRole="button" onPress={()=>void loadEarlier()} style={{alignSelf:'center',minHeight:36,justifyContent:'center',paddingHorizontal:12}}><Txt size={13} bold color={C.blue}>Show earlier messages</Txt></Tap>}
 {messages.map(m=><View key={m.id} style={{gap:8}}>
  {(!!m.content||!!m.imageUri)&&<MessageBubble role={m.role} text={m.content} imageUri={m.imageUri} animate={m.createdAt>openedAt}/>}
  {/* Facts vs suggestions: replies built from records say so; model answers don't claim to be records. */}
  {m.role==='assistant'&&m.source==='saved'&&!!m.content&&<View style={{flexDirection:'row',alignItems:'center',gap:4,marginLeft:38,marginTop:-4}}><Icon name="server-outline" size={11} color={C.soft}/><Txt size={11} color={C.muted}>From your saved data</Txt></View>}
  {m.card&&<AgentCardView card={m.card} {...cardActions(m)}/>}
 </View>)}
 {busy&&(stream?<MessageBubble role="assistant" text={stream} animate={false}/>:<ThinkingBubble/>)}
 {busy&&!!working&&<WorkingRow label={working}/>}
 {noModel&&<ModelSetupCard feature="Answers and image reading" onOpenSettings={()=>go('settings')}/>}
 {!!error&&!noModel&&<InlineError message={error} onRetry={retry}/>}
 </ScrollView>
 <View style={{paddingHorizontal:15,gap:8,paddingBottom:kb?8:82}}>
 {!!focusApp&&!chatJob&&<View style={{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',backgroundColor:C.pale2,borderRadius:14,paddingLeft:10,minHeight:30}}><Icon name="briefcase-outline" size={14} color={C.muted}/><Txt size={12} color={C.muted} numberOfLines={1} style={{maxWidth:230}}>About {focusApp.company} · {focusApp.title}</Txt><Tap accessibilityRole="button" accessibilityLabel="Stop talking about this job" hitSlop={8} onPress={()=>setFocus(null)} style={{width:30,height:30,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={14} color={C.muted}/></Tap></View>}
 {(aiReady&&suggestions.length>0)&&<ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{gap:7}}>{suggestions.map((x,i)=><Reanimated.View key={`${thread}-${i}-${x}`} entering={FadeIn.duration(180).easing(EASE_OUT)}><Tap accessibilityRole="button" disabled={busy} onPress={()=>void send(x)} style={{minHeight:40,justifyContent:'center',borderRadius:22,backgroundColor:C.pale,paddingHorizontal:12}}><Txt color={C.blue} size={12}>{x}</Txt></Tap></Reanimated.View>)}</ScrollView>}
 {aiReady&&suggestionsBusy&&suggestions.length===0&&<View accessible accessibilityLabel="Brief is preparing question ideas" style={{height:32,alignItems:'flex-start',justifyContent:'center',paddingLeft:8}}><TypingDots/></View>}
 {!!imageUri&&<View style={{flexDirection:'row',alignItems:'center',gap:9,alignSelf:'flex-start',padding:6,backgroundColor:C.white,borderRadius:14,borderWidth:1,borderColor:C.line}}><Image source={{uri:imageUri}} style={{width:52,height:52,borderRadius:9}}/><Txt size={12} color={C.muted} style={{maxWidth:160}} numberOfLines={1}>Image attached</Txt><Tap accessibilityRole="button" accessibilityLabel="Remove attached image" onPress={()=>setImageUri('')} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><Icon name="close" color={C.muted}/></Tap></View>}
 <View style={{backgroundColor:C.white,borderRadius:28,borderWidth:1,borderColor:C.line,padding:6,flexDirection:'row',alignItems:'center',gap:5}}>
 <View ref={attachBtn} collapsable={false}><Tap accessibilityRole="button" accessibilityLabel="Attach" accessibilityHint={visionReady?'Take a photo or attach an image to discuss with Brief':'Images need the Qwen3-VL model and its vision encoder'} disabled={!aiReady||!visionReady||busy} onPress={showAttach} style={{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:C.pale2,opacity:aiReady&&visionReady&&!busy?1:0.42}}><Icon name="add" size={24} color={C.blue}/></Tap></View>
 <TextInput accessibilityLabel="Message Brief" editable={canType} value={entry} onChangeText={setEntry} placeholder={installed===null?'Checking on-device AI…':noModel?'Manage jobs here, or set up AI to chat':'Message Brief...'} placeholderTextColor={C.soft} style={{padding:8,flex:1,color:C.ink,maxHeight:120}} multiline/>
 {busy
  ?<Tap accessibilityRole="button" accessibilityLabel="Stop generating" onPress={()=>void stopGeneration()} style={{width:44,height:44,backgroundColor:C.ink,borderRadius:22,alignItems:'center',justifyContent:'center'}}><Icon name="stop" size={16} color={C.white}/></Tap>
  :<Tap accessibilityRole="button" accessibilityLabel="Send" disabled={!canType||(!entry.trim()&&!imageUri)} onPress={()=>void send()} style={{width:44,height:44,backgroundColor:C.blue,opacity:!canType||(!entry.trim()&&!imageUri)?.5:1,borderRadius:22,alignItems:'center',justifyContent:'center'}}><Icon name="arrow-up" color={C.white}/></Tap>}</View>
 </View>
 <EventSheet visible={sheet.open} event={sheet.event} draft={sheet.draft} onClose={()=>setSheet(s=>({...s,open:false}))}
  onSaved={e=>{const id=sheet.msgId;if(!id)return;const m=latest.current.find(x=>x.id===id);if(m?.card?.type==='event')updateCard(id)({...m.card,state:'done',savedId:e.id});}}/>
 <Modal transparent visible={!!attachPos} animationType="none" statusBarTranslucent onRequestClose={()=>hideAttach()}>
  <Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={{flex:1}} onPress={()=>hideAttach()}/>
  {attachPos&&attachOpen&&<Popover origin="bottom left" style={{left:attachPos.left,bottom:attachPos.bottom,minWidth:210,paddingVertical:4}}>
   {([{label:'Camera',icon:'camera-outline',action:()=>setCameraOpen(true)},{label:'Photo',icon:'images-outline',action:()=>void attachImage()},{label:'File',icon:'document-outline',action:()=>void attachFile()}] as const).map((o,i)=>
    <Tap key={o.label} accessibilityRole="menuitem" onPress={()=>{void Haptics.selectionAsync();hideAttach(o.action);}} style={{flexDirection:'row',alignItems:'center',minHeight:48,paddingHorizontal:14,gap:12,borderTopWidth:i?1:0,borderTopColor:C.line}}><Icon name={o.icon} size={21}/><Txt bold size={14} style={{flex:1}}>{o.label}</Txt></Tap>)}
  </Popover>}
 </Modal>
 {cameraOpen&&<CameraPanel onClose={()=>setCameraOpen(false)} onUsePhoto={uri=>{setCameraOpen(false);void attachUri(uri);}}/>}
 </KeyboardAvoidingView>;
}
