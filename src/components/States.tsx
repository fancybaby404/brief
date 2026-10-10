// Shared empty / loading / error states. Every state says what happened, why, and offers the next step.
import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Modal,View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import Reanimated,{cancelAnimation,FadeIn,FadeOut,interpolate,useAnimatedStyle,useSharedValue,withRepeat,withSequence,withTiming,Easing as ReanimatedEasing,type EntryExitAnimationFunction} from 'react-native-reanimated';
import {EASE_IN_OUT,EASE_OUT,ROW_IN} from '../theme/motion';
import {C} from '../theme/tokens';
import {Card,Icon,Mascot,Primary,Tap,Txt,Wordmark,useReducedMotion,type Mood} from './Ui';
import {LiveMascot} from './LiveMascot';
import {modelPath,onModelChanged} from '../lib/ai';

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

function ThinkingDot({phase,progress,reduced}:{phase:number,progress:{get:()=>number},reduced:boolean}){
 const style=useAnimatedStyle(()=>{const p=(progress.get()+phase)%1,peak=p<0.5?p*2:(1-p)*2;return {opacity:reduced?0.75:interpolate(peak,[0,1],[0.3,1]),transform:[{translateY:reduced?0:interpolate(peak,[0,1],[0,-2])}]};});
 return <Reanimated.View style={[{width:7,height:7,borderRadius:4,backgroundColor:C.blue},style]}/>;
}
export function TypingDots(){
 const reduce=useReducedMotion();const progress=useSharedValue(0);
 useEffect(()=>{if(reduce){progress.set(0);return;}progress.set(withRepeat(withTiming(1,{duration:1300,easing:ReanimatedEasing.linear}),-1,false));return()=>cancelAnimation(progress);},[progress,reduce]);
 return <View style={{flexDirection:'row',gap:6}}>{[0,1,2].map(i=><ThinkingDot key={i} phase={i/3} progress={progress} reduced={reduce}/>)}</View>;
}

// A new message rises 10 px into place (it came from the composer below); history doesn't animate.
const MESSAGE_IN:EntryExitAnimationFunction=()=>{'worklet';return {initialValues:{opacity:0,transform:[{translateY:10}]},animations:{opacity:withTiming(1,{duration:220,easing:EASE_OUT}),transform:[{translateY:withTiming(0,{duration:220,easing:EASE_OUT})}]}};};
const MESSAGE_FADE=FadeIn.duration(150).easing(EASE_OUT);
const THINK_IN=FadeIn.duration(150).easing(EASE_OUT),THINK_OUT=FadeOut.duration(120).easing(EASE_OUT);

/** One chat / mock message. `animate` only for messages created while the screen is open. */
/** Memoized: streaming and new messages don't re-render the bubbles already on screen. */
export const MessageBubble=React.memo(function MessageBubble({role,text,imageUri,animate,avatar=31}:{role:'user'|'assistant',text:string,imageUri?:string,animate:boolean,avatar?:number}){
 const reduce=useReducedMotion();const mine=role==='user';
 return <Reanimated.View entering={animate?(reduce?MESSAGE_FADE:MESSAGE_IN):undefined} style={{maxWidth:'88%',alignSelf:mine?'flex-end':'flex-start',flexDirection:'row',alignItems:'flex-end',gap:7}}>
 {!mine&&<Mascot size={avatar}/>}
 <View style={{backgroundColor:mine?C.blue:C.pale,padding:13,borderRadius:18,flexShrink:1,gap:imageUri&&text?8:0}}>{!!imageUri&&<Image source={{uri:imageUri}} accessibilityLabel="Attached image" resizeMode="cover" style={{width:190,height:130,borderRadius:11}}/>}{!!text&&<Txt selectable color={mine?C.white:C.ink}>{text}</Txt>}</View>
 </Reanimated.View>;
});

/** Shown in the conversation while the on-device model is generating. */
export function ThinkingBubble(){
 return <Reanimated.View entering={THINK_IN} exiting={THINK_OUT}><View accessible accessibilityRole="progressbar" accessibilityLabel="Brief is thinking" style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'flex-end',gap:7}}>
 <Mascot size={31} mood="question"/>
 <View style={{backgroundColor:C.pale,borderRadius:18,borderBottomLeftRadius:6,paddingHorizontal:16,paddingVertical:14}}><TypingDots/></View>
 </View></Reanimated.View>;
}

/** An AI request failed: say so plainly and offer to retry without retyping. */
export function InlineError({message,onRetry}:{message:string,onRetry?:()=>void}){
 return <Reanimated.View entering={ROW_IN} accessibilityRole="alert" style={{flexDirection:'row',gap:10,alignItems:'flex-start',backgroundColor:C.redSoft,borderRadius:16,padding:13}}>
 <Icon name="alert-circle" size={20} color={C.danger}/>
 <View style={{flex:1,gap:8}}><Txt size={14} color={C.ink} style={{lineHeight:20}}>{message}</Txt>
  {onRetry&&<Tap accessibilityRole="button" onPress={onRetry} style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,minHeight:36}}><Icon name="refresh" size={16} color={C.blue}/><Txt bold size={14} color={C.blue}>Try again</Txt></Tap>}
 </View>
 </Reanimated.View>;
}

/** null while checking, so the setup card never flashes for people who already have a model. */
export function useModelInstalled(){const [v,setV]=useState<boolean|null>(null);useEffect(()=>{const read=()=>void modelPath().then(p=>setV(!!p));read();return onModelChanged(read);},[]);return v;}

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

export type ModelSetupStage='choose-model'|'import-model'|'download-model'|'choose-projector'|'import-projector'|'load-model'|'check-model';
const MODEL_SETUP_COPY:Record<ModelSetupStage,{title:string,body:string}>={
 'choose-model':{title:'Choose a local model',body:'Select a .gguf file saved on this device. It will stay private to Brief.'},
 'import-model':{title:'Adding your model',body:'Brief is preparing the model in private storage. Large files can take a little while.'},
 'download-model':{title:'Downloading local AI',body:'Brief is downloading the model and its matching image encoder directly to this phone.'},
 'choose-projector':{title:'Choose a vision projector',body:'Select the matching mmproj .gguf file to add image support.'},
 'import-projector':{title:'Adding image support',body:'Brief is preparing the vision projector on this device.'},
 'load-model':{title:'Waking Brief up',body:'Loading your local model for the first time can take a little while.'},
 'check-model':{title:'Checking your model',body:'Brief is running one short reply entirely on this device.'},
};

function ModelSetupMascot({downloadAnimation=false}:{downloadAnimation?:boolean}){
 const reduce=useReducedMotion(),bob=useSharedValue(0),breath=useSharedValue(0);
 useEffect(()=>{
  if(reduce||downloadAnimation){bob.set(0);breath.set(0);return;}
  const ease=EASE_IN_OUT;
  bob.set(withRepeat(withSequence(withTiming(-4,{duration:850,easing:ease}),withTiming(0,{duration:850,easing:ease})),-1,false));
  breath.set(withRepeat(withTiming(1,{duration:1700,easing:ReanimatedEasing.inOut(ReanimatedEasing.sin)}),-1,true));
  return()=>{cancelAnimation(bob);cancelAnimation(breath);};
 },[reduce,downloadAnimation]);
 const haloStyle=useAnimatedStyle(()=>({opacity:interpolate(breath.get(),[0,1],[0.55,0.9]),transform:[{scale:interpolate(breath.get(),[0,1],[0.94,1.03])}]}));
 const mascotStyle=useAnimatedStyle(()=>({transform:[{translateY:bob.get()}]}));
 if(downloadAnimation)return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:190,height:186,borderRadius:24,backgroundColor:C.white,overflow:'hidden'}}>
  <ExpoImage source={require('../../assets/briefcase-paper-loop.gif')} contentFit="contain" autoplay={!reduce} style={{width:'100%',height:'100%'}}/>
 </View>;
 return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:166,height:150,alignItems:'center',justifyContent:'center'}}>
  <Reanimated.View style={[{position:'absolute',width:142,height:142,borderRadius:72,backgroundColor:C.pale},haloStyle]}/>
  <Reanimated.View style={mascotStyle}><Mascot size={128}/></Reanimated.View>
 </View>;
}

function ModelSetupProgress({progress,label}:{progress:number|null,label:string}){
 const width=useSharedValue(0),value=useSharedValue(progress??0),sweep=useSharedValue(0),reduce=useReducedMotion();
 useEffect(()=>{value.set(progress===null?0:withTiming(Math.max(0,Math.min(100,progress)),{duration:180,easing:EASE_OUT}));},[progress,value]);
 useEffect(()=>{
  if(progress!==null||reduce){sweep.set(0.5);return;}
  sweep.set(withRepeat(withTiming(1,{duration:900,easing:ReanimatedEasing.linear}),-1,true));
  return()=>cancelAnimation(sweep);
 },[progress,reduce,sweep]);
 const fillStyle=useAnimatedStyle(()=>progress===null
  ?{width:42,transform:[{translateX:Math.max(0,width.get()-42)*sweep.get()}]}
  :{width:width.get()*value.get()/100});
 return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={progress===null?undefined:{min:0,max:100,now:Math.round(progress)}} onLayout={e=>width.set(e.nativeEvent.layout.width)} style={{width:'100%',maxWidth:230,height:5,backgroundColor:C.line,borderRadius:3,overflow:'hidden'}}>
  <Reanimated.View style={[{height:5,backgroundColor:C.blue,borderRadius:3},fillStyle]}/>
 </View>;
}

/** Full-screen brand loading state for local model import and first load. */
export function ModelSetupOverlay({stage,progress=null,onCancel}:{stage:ModelSetupStage|null,progress?:number|null,onCancel?:()=>void}){
 const reduce=useReducedMotion();if(!stage)return null;
 const copy=MODEL_SETUP_COPY[stage];
 return <Modal visible transparent animationType={reduce?'none':'fade'} statusBarTranslucent navigationBarTranslucent onRequestClose={()=>{}}>
  <GestureHandlerRootView style={{flex:1,backgroundColor:C.background}}>
   <SafeAreaView accessibilityViewIsModal style={{flex:1,backgroundColor:C.background}} edges={['top','bottom']}>
    <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:28,gap:27}}>
     <Wordmark size={30}/>
     <ModelSetupMascot downloadAnimation={stage==='download-model'}/>
     <Reanimated.View key={stage} entering={reduce?FadeIn.duration(100):FadeIn.duration(180).easing(EASE_OUT)} exiting={reduce?FadeOut.duration(80):FadeOut.duration(120).easing(EASE_OUT)} style={{alignItems:'center',gap:8}}>
      <Txt bold size={22} style={{textAlign:'center'}}>{copy.title}</Txt>
      <Txt size={14} color={C.muted} style={{textAlign:'center',lineHeight:21,maxWidth:300}}>{copy.body}</Txt>
     </Reanimated.View>
     <View style={{width:'100%',alignItems:'center',gap:10}}>
      <ModelSetupProgress progress={stage==='load-model'||stage==='download-model'?progress:null} label={stage==='download-model'?'Downloading local AI':'Loading local AI'}/>
      <Txt size={12} color={C.muted}>{(stage==='load-model'||stage==='download-model')&&progress!==null?`${Math.round(progress)}%`:'Your model stays on this phone'}</Txt>
     </View>
     {stage==='download-model'&&onCancel&&<Tap accessibilityRole="button" onPress={onCancel} style={{minHeight:44,paddingHorizontal:18,alignItems:'center',justifyContent:'center'}}><Txt size={14} bold color={C.muted}>Cancel download</Txt></Tap>}
    </View>
   </SafeAreaView>
  </GestureHandlerRootView>
 </Modal>;
}
