import React,{useEffect,useState,useRef} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Pressable,ScrollView,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBrief} from '../lib/appContext';import {uid,saveMessage,listMessages} from '../lib/db';import {mockInterview,MODEL_MISSING} from '../lib/ai';import {C} from '../theme/tokens';
import {Icon,Mascot,Primary,StatusPill,Txt,useKeyboardVisible} from '../components/Ui';import type {Message} from '../types';
const BEGIN='Begin the interview with your first question.';
export function MockScreen(){const {applications,profile,mockJob:job,openMock,go}=useBrief();const [messages,setMessages]=useState<Message[]>([]),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const scroll=useRef<ScrollView>(null);
 const insets=useSafeAreaInsets();const kb=useKeyboardVisible();
 const thread=job?'mock:'+job.id:'';
 useEffect(()=>{setError('');if(thread)void listMessages(thread).then(setMessages);else setMessages([]);},[thread]);
 async function send(text:string,finish=false){const t=text.trim();if(!job||busy||!t)return;setError('');setBusy(true);const history=messages;const m:Message={id:uid('mock'),role:'user',content:t,thread,createdAt:new Date().toISOString()};setMessages(old=>[...old,m]);await saveMessage(m);setValue('');
 try{const out=await mockInterview(t,profile,job,history,finish);const assistant:Message={id:uid('mock'),role:'assistant',content:out,thread,createdAt:new Date().toISOString()};await saveMessage(assistant);setMessages(old=>[...old,assistant]);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!job)return <ScrollView contentContainerStyle={{padding:20,paddingBottom:115,alignItems:'center',gap:16}}><View style={{backgroundColor:C.pale,borderRadius:95,padding:20,marginTop:20}}><Mascot size={160}/></View><Txt size={21} bold style={{textAlign:'center'}}>Who are you interviewing for?</Txt><Txt color={C.muted} style={{textAlign:'center'}}>Choose one of your saved applications to start a mock interview.</Txt>
 <View style={{width:'100%',gap:8}}>{applications.length===0?<View style={{gap:10}}><Txt color={C.muted} style={{textAlign:'center'}}>No saved jobs yet.</Txt><Primary label="Add your first job" onPress={()=>go('add-job')}/></View>:applications.map(a=><Pressable key={a.id} accessibilityRole="button" onPress={()=>openMock(a)} style={{padding:15,backgroundColor:C.white,borderColor:C.line,borderWidth:1,borderRadius:18,flexDirection:'row',gap:10,alignItems:'center'}}><View style={{flex:1}}><Txt bold>{a.company}</Txt><Txt color={C.muted} size={12} style={{flexShrink:1}}>{a.title}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={15}/></Pressable>)}</View></ScrollView>;
 const answered=messages.some(m=>m.role==='user'&&m.content!==BEGIN);
 return <KeyboardAvoidingView style={{flex:1}} behavior="padding" keyboardVerticalOffset={insets.top+59}>
 {!kb&&<View style={{alignItems:'center'}}><View style={{backgroundColor:C.pale,borderRadius:70,padding:8}}><Mascot size={100}/></View></View>}
 <Pressable accessibilityRole="button" onPress={()=>openMock(null)} style={{alignSelf:'center',padding:8}}><Txt color={C.blue} size={12}>‹ Change job · {job.title} at {job.company}</Txt></Pressable>
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:true})} contentContainerStyle={{flexGrow:1,justifyContent:'flex-end',gap:9,padding:15,paddingBottom:14}}>
 {messages.length===0&&<Pressable accessibilityRole="button" onPress={()=>void send(BEGIN)} style={{backgroundColor:C.pale,padding:14,borderRadius:17}}><Txt bold>Ready to practice?</Txt><Txt color={C.muted}>Tap to get your first question. Everything runs on your phone.</Txt></Pressable>}
 {messages.filter(m=>m.content!==BEGIN).map(m=><View key={m.id} style={{alignSelf:m.role==='user'?'flex-end':'flex-start',maxWidth:'87%',flexDirection:'row',gap:6,alignItems:'flex-end'}}>{m.role==='assistant'&&<Mascot size={29}/>}<View style={{padding:13,backgroundColor:m.role==='user'?C.blue:C.pale,borderRadius:16,flexShrink:1}}><Txt color={m.role==='user'?C.white:C.ink}>{m.content}</Txt></View></View>)}
 {busy&&<ActivityIndicator color={C.blue} accessibilityLabel="Brief is thinking"/>}
 {!!error&&<View style={{gap:8}}><Txt color={C.danger}>{error}</Txt>{error===MODEL_MISSING&&<Primary secondary label="Open Settings" onPress={()=>go('settings')}/>}</View>}
 </ScrollView>
 <View style={{paddingHorizontal:17,paddingBottom:kb?8:insets.bottom+82,gap:7}}>
 {answered&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void send('Please end this interview and give me specific overall feedback.',true)} style={{alignSelf:'flex-start',paddingVertical:6}}><Txt color={C.blue} size={13} bold>Finish & get feedback</Txt></Pressable>}
 <View style={{flexDirection:'row',backgroundColor:C.white,borderRadius:22,alignItems:'center',padding:6,borderWidth:1,borderColor:C.line}}><TextInput accessibilityLabel="Your answer" value={value} onChangeText={setValue} style={{flex:1,padding:8,color:C.ink,maxHeight:120}} placeholder="Type your answer..." placeholderTextColor={C.soft} multiline/><Pressable accessibilityRole="button" accessibilityLabel="Send answer" disabled={busy||!value.trim()} onPress={()=>void send(value)} style={{backgroundColor:C.blue,opacity:busy||!value.trim()?.5:1,borderRadius:20,width:40,height:40,alignItems:'center',justifyContent:'center'}}><Icon name="arrow-up" color={C.white}/></Pressable></View></View>
 </KeyboardAvoidingView>;
}
