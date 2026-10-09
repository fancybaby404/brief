import React,{useEffect,useMemo,useRef} from 'react';
import {View} from 'react-native';
import Reanimated,{Extrapolation,interpolate,useAnimatedReaction,useAnimatedStyle,useSharedValue,withSpring} from 'react-native-reanimated';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import {scheduleOnRN} from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import {C} from '../theme/tokens';
import {SPRING_SNAP,project,rubberband} from '../theme/motion';
import {Icon,Txt} from './Ui';

const COMMIT=88; // px of leftward travel (or projected travel) that commits
const tick=(past:boolean)=>void Haptics.impactAsync(past?Haptics.ImpactFeedbackStyle.Medium:Haptics.ImpactFeedbackStyle.Light);

/** Spotify-style swipe left to reveal and trigger one action — runs entirely on the UI thread.
 *  1:1 tracking, rubber-band past the threshold, one haptic when crossing it (and back), a flick commits
 *  via momentum projection, and the row springs home carrying the finger's velocity.
 *  Only claims clearly horizontal drags, so the list's vertical scroll is untouched.
 *  Not swipe-only: callers also expose the action as a button / accessibilityAction. */
export function SwipeAction({children,onCommit,done,label,doneLabel,icon,doneIcon,radius=18}:{children:React.ReactNode,onCommit:()=>void,done:boolean,label:string,doneLabel:string,icon:string,doneIcon:string,radius?:number}) {
 const x=useSharedValue(0),start=useSharedValue(0),isDone=useSharedValue(done);
 useEffect(()=>{isDone.set(done);},[done]); // never write shared values during render
 const latest=useRef(onCommit);latest.current=onCommit;
 const commit=useMemo(()=>()=>latest.current(),[]);
 // Haptic exactly when the threshold is crossed, from a UI-thread reaction (never per frame).
 useAnimatedReaction(()=>x.get()<=-COMMIT,(past,was)=>{if(was!==null&&past!==was)scheduleOnRN(tick,past);});
 const pan=useMemo(()=>Gesture.Pan().activeOffsetX([-12,12]).failOffsetY([-10,10])
  .onStart(()=>{start.set(x.get());})
  .onUpdate(e=>{const d=Math.min(0,start.get()+e.translationX);x.set(d<-COMMIT?-COMMIT+rubberband(d+COMMIT,COMMIT):d);})
  .onEnd(e=>{
   const commits=x.get()+project(e.velocityX)< -COMMIT;
   x.set(withSpring(0,{...SPRING_SNAP,velocity:e.velocityX}));
   if(commits&&!isDone.get())scheduleOnRN(commit);
  }),[]);
 const row=useAnimatedStyle(()=>({transform:[{translateX:x.get()}]}));
 const reveal=useAnimatedStyle(()=>({opacity:interpolate(x.get(),[-COMMIT,-12,0],[1,0.35,0],Extrapolation.CLAMP)}));
 const iconScale=useAnimatedStyle(()=>({transform:[{scale:interpolate(x.get(),[-COMMIT,0],[1.12,0.7],Extrapolation.CLAMP)}]}));
 return <View>
 <Reanimated.View pointerEvents="none" style={[{position:'absolute',top:0,bottom:0,left:0,right:0,borderRadius:radius,backgroundColor:done?C.pale:C.blue,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',paddingRight:20,gap:7},reveal]}>
  <Reanimated.View style={iconScale}><Icon name={done?doneIcon:icon} size={22} color={done?C.blue:C.white}/></Reanimated.View>
  <Txt bold size={14} color={done?C.blue:C.white}>{done?doneLabel:label}</Txt>
 </Reanimated.View>
 <GestureDetector gesture={pan}><Reanimated.View style={row}>{children}</Reanimated.View></GestureDetector>
 </View>;
}
