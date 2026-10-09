import React,{useEffect} from 'react';
import {View} from 'react-native';
import Reanimated,{cancelAnimation,useAnimatedStyle,useSharedValue,withRepeat,withSequence,withTiming,type SharedValue} from 'react-native-reanimated';
import {C} from '../theme/tokens';
import {EASE_IN_OUT,EASE_OUT} from '../theme/motion';
import {Icon,Tap,Txt,useReducedMotion} from './Ui';
import {FormSheet} from './FormSheet';
import {MessageBubble} from './States';
import {MOCK_BEGIN,MOCK_FINISH} from '../lib/prompts';
import {formatDuration,type SessionSummary} from '../lib/voice/sessions';
import {MOCK_MODES} from '../lib/agent/types';
import type {InterviewFeedback,Message} from '../types';

/** Big round mic control. While listening, a soft ring follows the real input level (UI thread). */
export function MicButton({listening,level,onPress,disabled,label}:{listening:boolean,level:SharedValue<number>,onPress:()=>void,disabled?:boolean,label:string}){
 const reduce=useReducedMotion();
 const ring=useAnimatedStyle(()=>{const l=Math.min(1,level.get()*6);return reduce?{opacity:listening?0.25+l*0.5:0,transform:[{scale:1.15}]}:{opacity:listening?0.35:0,transform:[{scale:1+l*0.35}]};});
 return <View style={{width:96,height:96,alignItems:'center',justifyContent:'center'}}>
  <Reanimated.View pointerEvents="none" style={[{position:'absolute',width:96,height:96,borderRadius:48,backgroundColor:C.blue},ring]}/>
  <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress} style={{width:76,height:76,borderRadius:38,backgroundColor:listening?C.ink:C.blue,alignItems:'center',justifyContent:'center',opacity:disabled?0.45:1}}>
   <Icon name={listening?'stop':'mic'} size={listening?26:32} color={C.white}/>
  </Tap>
 </View>;
}

/** Shown only while the speech engine is actually talking (never as decoration). */
export function SpeakingBars({active}:{active:boolean}){
 const reduce=useReducedMotion();
 const bars=[useSharedValue(0.4),useSharedValue(0.4),useSharedValue(0.4)];
 useEffect(()=>{bars.forEach((b,i)=>{cancelAnimation(b);
  if(active&&!reduce)b.set(withRepeat(withSequence(withTiming(1,{duration:260+i*70,easing:EASE_IN_OUT}),withTiming(0.35,{duration:260+i*70,easing:EASE_IN_OUT})),-1,true));
  else b.set(withTiming(active?0.8:0.4,{duration:150,easing:EASE_OUT}));});},[active,reduce]);
 const styles=bars.map(b=>useAnimatedStyle(()=>({transform:[{scaleY:b.get()}]})));
 return <View accessible accessibilityLabel={active?'Brief is speaking':undefined} style={{flexDirection:'row',gap:4,height:18,alignItems:'center',opacity:active?1:0}}>{styles.map((st,i)=><Reanimated.View key={i} style={[{width:4,height:18,borderRadius:2,backgroundColor:C.blue},st]}/>)}</View>;
}

const SCORES:[keyof InterviewFeedback,string][]=[['relevance','Relevance'],['clarity','Clarity'],['completeness','Completeness'],['examples','Real examples'],['technical','Technical']];
/** Structured feedback: one restrained blue scale per skill, then specifics. */
export function FeedbackCard({feedback,text}:{feedback?:InterviewFeedback,text:string}){
 if(!feedback)return <View style={{backgroundColor:C.white,borderRadius:18,padding:14}}><Txt bold size={16} style={{marginBottom:6}}>Feedback</Txt><Txt selectable>{text}</Txt></View>;
 const list=(title:string,items:string[])=>items.length?<View style={{gap:4}}><Txt bold size={14}>{title}</Txt>{items.map((x,i)=><View key={i} style={{flexDirection:'row',gap:6}}><Txt color={C.blue}>•</Txt><Txt size={14} style={{flex:1}} selectable>{x}</Txt></View>)}</View>:null;
 return <View style={{backgroundColor:C.white,borderRadius:18,padding:14,gap:14}}>
  <View style={{gap:4}}><Txt bold size={17}>Your feedback</Txt><Txt size={14} color={C.muted} selectable>{feedback.summary}</Txt></View>
  <View style={{gap:8}}>{SCORES.filter(([k])=>k!=='technical'||feedback.technical>0).map(([k,label])=>{const v=feedback[k] as number;return <View key={k} accessible accessibilityLabel={`${label}: ${v} out of 5`} style={{flexDirection:'row',alignItems:'center',gap:10}}>
   <Txt size={13} style={{width:104}}>{label}</Txt>
   <View style={{flex:1,flexDirection:'row',gap:4}}>{[1,2,3,4,5].map(n=><View key={n} style={{flex:1,height:6,borderRadius:3,backgroundColor:n<=v?C.blue:C.line}}/>)}</View>
   <Txt size={13} color={C.muted} style={{width:28,textAlign:'right'}}>{v}/5</Txt></View>;})}</View>
  {list('What worked',feedback.strengths)}
  {list('To improve',feedback.improvements)}
  {!!feedback.betterAnswer&&<View style={{backgroundColor:C.pale2,borderRadius:12,padding:12,gap:4}}><Txt bold size={14}>A stronger answer, from what you said</Txt><Txt size={14} selectable>{feedback.betterAnswer}</Txt></View>}
  {list('Practice next',feedback.nextSteps)}
 </View>;
}

/** Read-only review of a past session: transcript and feedback, from SQLite. */
export function SessionReviewSheet({session,messages,title,visible,onClose,onContinue}:{session:SessionSummary|null,messages:Message[],title:string,visible:boolean,onClose:()=>void,onContinue?:()=>void}){
 const fb=session?.feedback;
 return <FormSheet visible={visible} title={title} onClose={onClose} doneLabel="Done" onDone={onClose}>
  {session&&<View style={{gap:10}}>
   <Txt size={13} color={C.muted}>{[session.question?`Practice: “${session.question}”`:MOCK_MODES.find(m=>m.value===session.mode)?.label,new Date(session.startedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}),formatDuration(session.durationMs),`${session.answers} answer${session.answers===1?'':'s'}`,session.voice?'voice':'typed'].filter(Boolean).join(' · ')}</Txt>
   {messages.filter(m=>m.content!==MOCK_BEGIN&&m.content!==MOCK_FINISH&&m.id!==fb?.id).map(m=><MessageBubble key={m.id} role={m.role} avatar={26} text={m.content} animate={false}/>)}
   {fb&&<FeedbackCard feedback={fb.feedback} text={fb.content}/>}
   {!session.finished&&session.current&&onContinue&&<Tap accessibilityRole="button" onPress={onContinue} style={{minHeight:48,borderRadius:14,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',marginTop:6}}><Txt bold color={C.white}>Continue this interview</Txt></Tap>}
  </View>}
 </FormSheet>;
}
