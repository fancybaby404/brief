import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,Pressable,View} from 'react-native';
import * as Haptics from 'expo-haptics';
import {FACES,Sparkles,useReducedMotion,type Mood} from './Ui';

// "???" overlay placement as fractions of the 842×924 face frame (measured when the assets were cropped).
const Q={left:0.849,top:-0.135,width:0.253,height:0.251};
const RATIO=842/924;
const MOODS=Object.keys(FACES) as Mood[];

type Reaction={face:Mood,marks:'sparkle'|'question',hold:number,haptic:Haptics.ImpactFeedbackStyle};
// Quick repeat taps escalate; a pause resets the sequence.
const REACTIONS:Reaction[]=[
 {face:'shocked',marks:'sparkle',hold:900,haptic:Haptics.ImpactFeedbackStyle.Light},
 {face:'question',marks:'question',hold:1300,haptic:Haptics.ImpactFeedbackStyle.Light},
 {face:'happy',marks:'sparkle',hold:900,haptic:Haptics.ImpactFeedbackStyle.Light},
 {face:'error',marks:'sparkle',hold:1400,haptic:Haptics.ImpactFeedbackStyle.Medium},
];
const spring=(v:Animated.Value,toValue:number,stiffness:number,damping:number)=>Animated.spring(v,{toValue,stiffness,damping,mass:1,useNativeDriver:true});
// Strong curves (same values as theme/motion): ease-out to leave the ground / fade, ease-in-out for on-screen wobble.
const EASE_OUT=Easing.bezier(0.23,1,0.32,1),EASE_IN_OUT=Easing.bezier(0.77,0,0.175,1);
const ease=(v:Animated.Value,toValue:number,duration:number,curve=EASE_IN_OUT)=>Animated.timing(v,{toValue,duration,easing:curve,useNativeDriver:true});

/** Tappable mascot: squishes on touch-down, then reacts (tilt on its feet, face swap, expressive marks)
 *  and settles back to `mood`. `mood` lets screens show state (e.g. 'question' while the AI thinks).
 *  Reduce Motion keeps the face and marks but drops the movement. */
export function LiveMascot({size,mood='happy',label='Brief, the mascot'}:{size:number,mood?:Mood,label?:string}){
 const reduce=useReducedMotion();
 const [reaction,setReaction]=useState<Reaction|null>(null);
 const face=reaction?.face??mood;
 const showQuestion=face==='question';
 const press=useRef(new Animated.Value(1)).current,rot=useRef(new Animated.Value(0)).current,hop=useRef(new Animated.Value(0)).current;
 const sparkle=useRef(new Animated.Value(0)).current,question=useRef(new Animated.Value(showQuestion?1:0)).current;
 const taps=useRef(0),resetTimer=useRef<ReturnType<typeof setTimeout>|null>(null),holdTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(resetTimer.current)clearTimeout(resetTimer.current);if(holdTimer.current)clearTimeout(holdTimer.current);},[]);
 // "???" floats in whenever the puzzled face is showing (tap reaction or a thinking mood) and fades when it isn't.
 useEffect(()=>{(showQuestion?spring(question,1,260,18):ease(question,0,220)).start();},[showQuestion]);

 function react(){
  const n=Math.min(taps.current,REACTIONS.length-1);const r=REACTIONS[n];taps.current+=1;
  if(resetTimer.current)clearTimeout(resetTimer.current);
  resetTimer.current=setTimeout(()=>{taps.current=0;},1200);
  void Haptics.impactAsync(r.haptic);
  setReaction(r);
  if(r.marks==='sparkle'){sparkle.setValue(0);spring(sparkle,1,420,16).start();}
  if(!reduce){
   if(n===0)Animated.sequence([spring(rot,-11,700,28),spring(rot,0,260,9)]).start();
   else if(n===1)Animated.sequence([spring(rot,9,700,28),spring(rot,0,260,9)]).start();
   else if(n===2)Animated.sequence([ease(hop,-size*0.13,140,EASE_OUT),spring(hop,0,500,11)]).start();
   else Animated.sequence([12,-10,8,-6,3,0].map(d=>ease(rot,d,95))).start();
  }
  if(holdTimer.current)clearTimeout(holdTimer.current);
  holdTimer.current=setTimeout(()=>{setReaction(null);ease(sparkle,0,260).start();},r.hold);
 }

 const imgW=size*RATIO,offset=(size-imgW)/2;
 const sparkleStyle=reduce?{opacity:sparkle}:{opacity:sparkle,transform:[{translateX:sparkle.interpolate({inputRange:[0,1],outputRange:[size*0.06,0]})},{translateY:sparkle.interpolate({inputRange:[0,1],outputRange:[size*0.06,0]})},{scale:sparkle.interpolate({inputRange:[0,1],outputRange:[0.5,1]})}]};
 const questionStyle=reduce?{opacity:question}:{opacity:question,transform:[{translateY:question.interpolate({inputRange:[0,1],outputRange:[size*0.06,0]})},{scale:question.interpolate({inputRange:[0,1],outputRange:[0.7,1]})}]};
 const bodyStyle=reduce?{}:{transformOrigin:'bottom' as const,transform:[{translateY:hop},{rotate:rot.interpolate({inputRange:[-30,30],outputRange:['-30deg','30deg']})},{scaleX:press.interpolate({inputRange:[0.9,1],outputRange:[1.04,1]})},{scaleY:press}]};

 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Tap to see Brief react" hitSlop={8}
  onPressIn={()=>{if(!reduce)spring(press,0.93,900,30).start();}} onPressOut={()=>{if(!reduce)spring(press,1,500,14).start();}} onPress={react}
  style={{width:size,height:size}}>
 <Animated.View style={[{width:size,height:size},bodyStyle]}>
  {/* All faces stay mounted (decoded once); only the active one is visible, so swaps are instant. */}
  {MOODS.map(m=><Image key={m} source={FACES[m]} resizeMode="contain" accessibilityIgnoresInvertColors style={{position:'absolute',width:size,height:size,opacity:m===face?1:0}}/>)}
 </Animated.View>
 <Animated.View pointerEvents="none" style={[{position:'absolute',left:-size*0.14,top:-size*0.04},sparkleStyle]}><Sparkles size={size*0.34}/></Animated.View>
 <Animated.View pointerEvents="none" style={[{position:'absolute',left:offset+Q.left*imgW,top:Q.top*size,width:Q.width*imgW,height:Q.height*size},questionStyle]}>
  <Image source={require('../../assets/mascot/marks-question.png')} resizeMode="contain" style={{width:'100%',height:'100%'}}/>
 </Animated.View>
 </Pressable>;
}
