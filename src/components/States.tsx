// Shared empty / loading / error states. Every state says what happened, why, and offers the next step.
import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,View} from 'react-native';
import {C} from '../theme/tokens';
import {Card,Icon,Mascot,Primary,Tap,Txt,useReducedMotion,type Mood} from './Ui';
import {LiveMascot} from './LiveMascot';
import {modelPath} from '../lib/ai';

type Action={label:string,onPress:()=>void,icon?:string};

/** Friendly empty/error state: mascot mood + title + one-line reason + primary action (+ optional text action). */
export function EmptyState({mood='happy',title,body,action,secondary,compact=false,card=false,mascot=true}:{mood?:Mood,title:string,body?:string,action?:Action,secondary?:Action,compact?:boolean,card?:boolean,mascot?:boolean}){
 const content=<View style={{alignItems:'center',gap:8,paddingVertical:compact?16:28,paddingHorizontal:compact?8:20}}>
  {mascot&&<LiveMascot size={compact?64:92} mood={mood}/>}
  <Txt bold size={compact?16:18} style={{textAlign:'center',marginTop:6}}>{title}</Txt>
  {!!body&&<Txt size={14} color={C.muted} style={{textAlign:'center',lineHeight:20,maxWidth:310}}>{body}</Txt>}
  {action&&<View style={{width:'100%',maxWidth:300,marginTop:8}}><Primary label={action.label} icon={action.icon} onPress={action.onPress}/></View>}
  {secondary&&<Tap accessibilityRole="button" onPress={secondary.onPress} style={{minHeight:44,justifyContent:'center',paddingHorizontal:12}}><Txt bold size={14} color={C.blue}>{secondary.label}</Txt></Tap>}
 </View>;
 return card?<Card>{content}</Card>:content;
}

/** One shared 0↔1 pulse so every skeleton breathes in sync; static under Reduce Motion. */
function usePulse(){const reduce=useReducedMotion();const v=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(reduce){v.setValue(0.5);return;}const ease=Easing.inOut(Easing.quad);
  const loop=Animated.loop(Animated.sequence([Animated.timing(v,{toValue:1,duration:700,easing:ease,useNativeDriver:true}),Animated.timing(v,{toValue:0,duration:700,easing:ease,useNativeDriver:true})]));loop.start();return ()=>loop.stop();},[reduce]);
 return v.interpolate({inputRange:[0,1],outputRange:[0.55,1]});}
const Block=({w,h=10,r=5}:{w:number|`${number}%`,h?:number,r?:number})=><View style={{width:w,height:h,borderRadius:r,backgroundColor:'#E6EEF9'}}/>;

/** Placeholder cards shaped like Explore results while jobs load. */
export function JobsSkeleton({count=4}:{count?:number}){const opacity=usePulse();
 return <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading jobs" style={{gap:13}}>
 {Array.from({length:count},(_,i)=><Animated.View key={i} style={{opacity,backgroundColor:C.white,borderRadius:18,padding:14,borderWidth:1,borderColor:C.line,gap:12}}>
  <View style={{flexDirection:'row',gap:12}}><Block w={48} h={48} r={12}/><View style={{flex:1,gap:8,paddingTop:2}}><Block w="72%" h={13}/><Block w="45%"/><Block w="58%"/></View></View>
  <View style={{flexDirection:'row',gap:8}}><Block w={90} h={20} r={10}/><Block w={70} h={20} r={10}/></View>
 </Animated.View>)}
 </View>;
}

export function TypingDots(){
 const reduce=useReducedMotion();const t=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(reduce)return;const loop=Animated.loop(Animated.timing(t,{toValue:1,duration:1300,easing:Easing.linear,useNativeDriver:true}));loop.start();return ()=>{loop.stop();t.setValue(0);};},[reduce]);
 return <View style={{flexDirection:'row',gap:6}}>{[0,1,2].map(i=><Animated.View key={i} style={{width:7,height:7,borderRadius:4,backgroundColor:C.blue,opacity:reduce?0.8:t.interpolate({inputRange:[0,0.15+i*0.15,0.4+i*0.15,1],outputRange:[0.3,1,0.3,0.3]})}}/>)}</View>;
}

/** Shown in the conversation while the on-device model is generating. */
export function ThinkingBubble(){
 return <View accessible accessibilityRole="progressbar" accessibilityLabel="Brief is thinking" style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'flex-end',gap:7}}>
 <Mascot size={31} mood="question"/>
 <View style={{backgroundColor:C.pale,borderRadius:18,borderBottomLeftRadius:6,paddingHorizontal:16,paddingVertical:14}}><TypingDots/></View>
 </View>;
}

/** An AI request failed: say so plainly and offer to retry without retyping. */
export function InlineError({message,onRetry}:{message:string,onRetry?:()=>void}){
 return <View accessibilityRole="alert" style={{flexDirection:'row',gap:10,alignItems:'flex-start',backgroundColor:C.redSoft,borderRadius:16,padding:13}}>
 <Icon name="alert-circle" size={20} color={C.danger}/>
 <View style={{flex:1,gap:8}}><Txt size={14} color={C.ink} style={{lineHeight:20}}>{message}</Txt>
  {onRetry&&<Tap accessibilityRole="button" onPress={onRetry} style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,minHeight:36}}><Icon name="refresh" size={16} color={C.blue}/><Txt bold size={14} color={C.blue}>Try again</Txt></Tap>}
 </View>
 </View>;
}

/** null while checking, so the setup card never flashes for people who already have a model. */
export function useModelInstalled(){const [v,setV]=useState<boolean|null>(null);useEffect(()=>{void modelPath().then(p=>setV(!!p));},[]);return v;}

/** Proactive "no model yet" card for Ask Brief and Mock, shown before the user hits an error. */
export function ModelSetupCard({onOpenSettings,feature}:{onOpenSettings:()=>void,feature:string}){
 return <Card style={{gap:12,padding:16}}>
 <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>
  <LiveMascot size={58} mood="question"/>
  <View style={{flex:1,gap:3}}><Txt bold size={16}>Set up on-device AI</Txt><Txt size={13} color={C.muted} style={{lineHeight:18}}>{feature} runs on a model stored on your phone, so nothing goes to the cloud. Add one in Settings — job tracking works without it.</Txt></View>
 </View>
 <Primary label="Open Settings" icon="chevron-forward" onPress={onOpenSettings}/>
 </Card>;
}
