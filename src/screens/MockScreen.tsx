import React,{useEffect,useState,useRef} from 'react';
import {ScrollView,TextInput,View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBrief} from '../lib/appContext';import {uid,saveMessage,listMessages} from '../lib/db';import {mockInterview,MODEL_MISSING} from '../lib/ai';import {C} from '../theme/tokens';
import {LiveMascot} from '../components/LiveMascot';
import {EmptyState,InlineError,MessageBubble,ModelSetupCard,ThinkingBubble,useModelInstalled} from '../components/States';
import {hasProfileDetails} from '../lib/profile';
import {CloudHalo,CompanyLogo,Icon,Mascot,StatusPill,Tap,Txt,useKeyboardVisible} from '../components/Ui';import type {Message} from '../types';
const BEGIN='Begin the interview with your first question.';
const FINISH='Please end this interview and give me specific overall feedback.';
export function MockScreen(){const {applications,profile,mockJob:job,openMock,go,goTab}=useBrief();const [messages,setMessages]=useState<Message[]>([]),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const scroll=useRef<ScrollView>(null);
 const insets=useSafeAreaInsets();const kb=useKeyboardVisible();
 const openedAt=useRef(new Date().toISOString()).current; // messages newer than this animate in; history doesn't
 const installed=useModelInstalled();const noModel=installed===false||error===MODEL_MISSING;
 const thread=job?'mock:'+job.id:'';
 useEffect(()=>{setError('');if(thread)void listMessages(thread).then(setMessages);else setMessages([]);},[thread]);
 /** Gets the interviewer's next turn for `t` given the conversation before it (shared by send and retry). */
 async function reply(t:string,history:Message[]){if(!job)return;setError('');setBusy(true);
  try{const out=await mockInterview(t,profile,job,history,t===FINISH);const assistant:Message={id:uid('mock'),role:'assistant',content:out,thread,createdAt:new Date().toISOString()};await saveMessage(assistant);setMessages(old=>[...old,assistant]);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function send(text:string){const t=text.trim();if(!job||busy||!t||noModel)return;const history=messages;const m:Message={id:uid('mock'),role:'user',content:t,thread,createdAt:new Date().toISOString()};setMessages(old=>[...old,m]);await saveMessage(m);setValue('');await reply(t,history);}
 function retry(){const i=messages.map(m=>m.role).lastIndexOf('user');if(i>=0&&!busy)void reply(messages[i].content,messages.slice(0,i));}

 if(!job)return <ScrollView contentContainerStyle={{padding:20,paddingBottom:115,alignItems:'center',gap:16}}><View style={{marginTop:12}}><CloudHalo size={204}><LiveMascot size={140}/></CloudHalo></View><Txt size={21} bold style={{textAlign:'center'}}>Who are you interviewing for?</Txt><Txt color={C.muted} style={{textAlign:'center'}}>Choose one of your saved applications to start a mock interview.</Txt>
 <View style={{width:'100%',gap:8}}>
  {applications.length===0?<EmptyState card compact mascot={false} title="No saved jobs yet" body="Mock interviews are built from a job you’ve saved, so the questions fit the role." action={{label:'Add a job',onPress:()=>go('add-job')}} secondary={{label:'Explore jobs',onPress:()=>goTab('jobs')}}/>:<>
  {installed===false&&<ModelSetupCard feature="Mock interview practice" onOpenSettings={()=>go('settings')}/>}
  {!hasProfileDetails(profile)&&<Tap accessibilityRole="button" onPress={()=>go('resume')} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:14,backgroundColor:C.pale}}><Icon name="document-text-outline" size={20} color={C.blue}/><Txt size={13} color={C.ink} style={{flex:1}}>Add your resume for questions tailored to you</Txt><Icon name="chevron-forward" size={15} color={C.blue}/></Tap>}
  {applications.map(a=><Tap key={a.id} accessibilityRole="button" onPress={()=>openMock(a)} style={{padding:13,backgroundColor:C.white,borderColor:C.line,borderWidth:1,borderRadius:18,flexDirection:'row',gap:10,alignItems:'center'}}><CompanyLogo uri={a.logoUrl} size={40}/><View style={{flex:1}}><Txt bold>{a.company}</Txt><Txt color={C.muted} size={12} style={{flexShrink:1}}>{a.title}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={15}/></Tap>)}
 </>}</View></ScrollView>;

 const answered=messages.some(m=>m.role==='user'&&m.content!==BEGIN&&m.content!==FINISH);
 return <KeyboardAvoidingView style={{flex:1}} behavior="padding" keyboardVerticalOffset={insets.top+59}>
 {!kb&&<View style={{alignItems:'center'}}><CloudHalo size={132}><LiveMascot size={90} mood={busy?'question':error?'sad':'happy'} label={busy?'Brief is thinking':'Brief, the mascot'}/></CloudHalo></View>}
 <Tap accessibilityRole="button" onPress={()=>openMock(null)} style={{alignSelf:'center',padding:8}}><Txt color={C.blue} size={12}>‹ Change job · {job.title} at {job.company}</Txt></Tap>
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:true})} contentContainerStyle={{flexGrow:1,justifyContent:'flex-end',gap:9,padding:15,paddingBottom:14}}>
 {messages.length===0&&!noModel&&<Tap accessibilityRole="button" onPress={()=>void send(BEGIN)} style={{backgroundColor:C.pale,padding:14,borderRadius:17}}><Txt bold>Ready to practice?</Txt><Txt color={C.muted}>Tap to get your first question. Everything runs on your phone.</Txt></Tap>}
 {messages.filter(m=>m.content!==BEGIN).map(m=><MessageBubble key={m.id} role={m.role} avatar={29} text={m.content===FINISH?'Finish and give me feedback.':m.content} animate={m.createdAt>openedAt}/>)}
 {busy&&<ThinkingBubble/>}
 {noModel&&<ModelSetupCard feature="Mock interview practice" onOpenSettings={()=>go('settings')}/>}
 {!!error&&!noModel&&<InlineError message={error} onRetry={retry}/>}
 </ScrollView>
 <View style={{paddingHorizontal:17,paddingBottom:kb?8:insets.bottom+82,gap:7,opacity:noModel?0.5:1}}>
 {answered&&!noModel&&<Tap accessibilityRole="button" disabled={busy} onPress={()=>void send(FINISH)} style={{alignSelf:'flex-start',paddingVertical:6}}><Txt color={C.blue} size={13} bold>Finish & get feedback</Txt></Tap>}
 <View style={{flexDirection:'row',backgroundColor:C.white,borderRadius:22,alignItems:'center',padding:6,borderWidth:1,borderColor:C.line}}><TextInput accessibilityLabel="Your answer" editable={!noModel} value={value} onChangeText={setValue} style={{flex:1,padding:8,color:C.ink,maxHeight:120}} placeholder={noModel?'Set up on-device AI to practice':'Type your answer...'} placeholderTextColor={C.soft} multiline/><Tap accessibilityRole="button" accessibilityLabel="Send answer" disabled={busy||noModel||!value.trim()} onPress={()=>void send(value)} style={{backgroundColor:C.blue,opacity:busy||noModel||!value.trim()?.5:1,borderRadius:20,width:40,height:40,alignItems:'center',justifyContent:'center'}}><Icon name="arrow-up" color={C.white}/></Tap></View></View>
 </KeyboardAvoidingView>;
}
