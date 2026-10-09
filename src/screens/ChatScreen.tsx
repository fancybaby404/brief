import React,{useEffect,useRef,useState} from 'react';import {ScrollView,TextInput,View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBrief} from '../lib/appContext';import {uid,listMessages,saveMessage} from '../lib/db';import {askBrief,MODEL_MISSING} from '../lib/ai';import {C} from '../theme/tokens';import {Heading,Icon,Mascot,Txt,useKeyboardVisible,Tap} from '../components/Ui';import type {Message} from '../types';
import {LiveMascot} from '../components/LiveMascot';
import {InlineError,MessageBubble,ModelSetupCard,ThinkingBubble,useModelInstalled} from '../components/States';
const CHIPS=['What should I ask?','Is this a red flag?','Am I qualified?'];
export function ChatScreen(){const {profile,applications,chatJob,go}=useBrief();const thread=chatJob?'job:'+chatJob.id:'general';
 const [messages,setMessages]=useState<Message[]>([]),[entry,setEntry]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const scroll=useRef<ScrollView>(null);
 const insets=useSafeAreaInsets();const kb=useKeyboardVisible();
 const openedAt=useRef(new Date().toISOString()).current; // messages newer than this animate in; history doesn't
 const installed=useModelInstalled();const noModel=installed===false||error===MODEL_MISSING;
 useEffect(()=>{setError('');void listMessages(thread).then(setMessages);},[thread]);
 /** Asks the on-device model to answer `q` given the conversation before it (shared by send and retry). */
 async function reply(q:string,history:Message[]){setError('');setBusy(true);
  try{const out=await askBrief(q,profile,applications,history,chatJob||undefined);const answer:Message={id:uid('msg'),thread,role:'assistant',content:out,createdAt:new Date().toISOString()};await saveMessage(answer);setMessages(old=>[...old,answer]);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function send(text=entry){const q=text.trim();if(!q||busy||noModel)return;setEntry('');const m:Message={id:uid('msg'),thread,role:'user',content:q,createdAt:new Date().toISOString()};const previous=messages;setMessages(old=>[...old,m]);await saveMessage(m);await reply(q,previous);}
 function retry(){const i=messages.map(m=>m.role).lastIndexOf('user');if(i>=0&&!busy)void reply(messages[i].content,messages.slice(0,i));}
 return <KeyboardAvoidingView style={{flex:1}} behavior="padding" keyboardVerticalOffset={insets.top+59}>
 <View style={{paddingHorizontal:18,paddingBottom:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}><Heading>Ask Brief</Heading><Txt color={C.muted} size={12} style={{flexShrink:1}}>{chatJob?chatJob.title+' · '+chatJob.company:'Your on-device job search companion'}</Txt></View>{!kb&&<View style={{backgroundColor:C.pale,borderRadius:45,padding:6}}><LiveMascot size={66} mood={busy?'question':error?'sad':'happy'} label={busy?'Brief is thinking':'Brief, the mascot'}/></View>}</View>
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:true})} contentContainerStyle={{paddingHorizontal:16,paddingBottom:12,gap:12,flexGrow:1,justifyContent:'flex-end'}}>
 {messages.length===0&&!noModel&&<View style={{alignItems:'center',gap:6,paddingHorizontal:20,paddingBottom:8}}>
  <Txt bold size={17} style={{textAlign:'center'}}>{chatJob?'Ask about this job':'Ask me about your job hunt'}</Txt>
  <Txt size={14} color={C.muted} style={{textAlign:'center',lineHeight:20}}>{chatJob?'Red flags, what to ask HR, or whether you’re a fit — answers use this job’s description.':'Your saved jobs, red flags, your resume, or interview prep.'} Your messages stay on this phone.</Txt>
 </View>}
 {messages.map(m=><MessageBubble key={m.id} role={m.role} text={m.content} animate={m.createdAt>openedAt}/>)}
 {busy&&<ThinkingBubble/>}
 {noModel&&<ModelSetupCard feature="Ask Brief" onOpenSettings={()=>go('settings')}/>}
 {!!error&&!noModel&&<InlineError message={error} onRetry={retry}/>}
 </ScrollView>
 <View style={{paddingHorizontal:15,gap:8,paddingBottom:kb?8:insets.bottom+82,opacity:noModel?0.5:1}}><ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{gap:7}}>{CHIPS.map(x=><Tap key={x} accessibilityRole="button" disabled={busy||noModel} onPress={()=>void send(x)} style={{borderRadius:22,backgroundColor:C.pale,paddingHorizontal:12,paddingVertical:10}}><Txt color={C.blue} size={12}>{x}</Txt></Tap>)}</ScrollView>
 <View style={{backgroundColor:C.white,borderRadius:28,borderWidth:1,borderColor:C.line,padding:6,flexDirection:'row',alignItems:'center',gap:7}}><TextInput accessibilityLabel="Message Brief" editable={!noModel} value={entry} onChangeText={setEntry} placeholder={noModel?'Set up on-device AI to chat':'Message Brief...'} placeholderTextColor={C.soft} style={{padding:8,flex:1,color:C.ink,maxHeight:120}} multiline/><Tap accessibilityRole="button" accessibilityLabel="Send" disabled={busy||noModel||!entry.trim()} onPress={()=>void send()} style={{width:40,height:40,backgroundColor:C.blue,opacity:busy||noModel||!entry.trim()?.5:1,borderRadius:20,alignItems:'center',justifyContent:'center'}}><Icon name="arrow-up" color={C.white}/></Tap></View>
 </View></KeyboardAvoidingView>;
}
