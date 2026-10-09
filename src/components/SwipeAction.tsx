import React,{useRef} from 'react';
import {Animated,PanResponder,View} from 'react-native';
import * as Haptics from 'expo-haptics';
import {C,SPRING} from '../theme/tokens';
import {Icon,Txt} from './Ui';

const COMMIT=88; // px of leftward travel that commits

/** Spotify-style swipe left to reveal and trigger one action.
 *  1:1 tracking, rubber-band past the threshold, a haptic tick when crossing it (and back),
 *  a fast flick also commits, and the row springs home with the finger's velocity.
 *  Only claims clearly horizontal-left drags, so vertical scrolling is untouched.
 *  Not swipe-only: callers must also expose the action as a button / accessibilityAction. */
export function SwipeAction({children,onCommit,done,label,doneLabel,icon,doneIcon,radius=18}:{children:React.ReactNode,onCommit:()=>void,done:boolean,label:string,doneLabel:string,icon:string,doneIcon:string,radius?:number}) {
 const x=useRef(new Animated.Value(0)).current;const armed=useRef(false);
 const latest=useRef({onCommit,done});latest.current={onCommit,done};
 const home=(velocity=0)=>Animated.spring(x,{toValue:0,velocity,...SPRING.sheet,useNativeDriver:true}).start();
 const pan=useRef(PanResponder.create({
  onMoveShouldSetPanResponder:(_,g)=>g.dx<-10&&Math.abs(g.dx)>Math.abs(g.dy)*1.6,
  onPanResponderTerminationRequest:()=>false,
  onPanResponderGrant:()=>{armed.current=false;},
  onPanResponderMove:(_,g)=>{
   const d=Math.min(0,g.dx);
   x.setValue(d<-COMMIT?-COMMIT+(d+COMMIT)*0.35:d);
   const past=d<=-COMMIT;
   if(past!==armed.current){armed.current=past;void Haptics.impactAsync(past?Haptics.ImpactFeedbackStyle.Medium:Haptics.ImpactFeedbackStyle.Light);}
  },
  onPanResponderRelease:(_,g)=>{
   const commit=armed.current||(g.vx<-0.9&&g.dx<-40);
   armed.current=false;home(g.vx*1000);
   if(commit&&!latest.current.done)latest.current.onCommit();
  },
  onPanResponderTerminate:()=>{armed.current=false;home();},
 })).current;
 const reveal=x.interpolate({inputRange:[-COMMIT,-12,0],outputRange:[1,0.35,0],extrapolate:'clamp'});
 const iconScale=x.interpolate({inputRange:[-COMMIT,0],outputRange:[1.12,0.7],extrapolate:'clamp'});
 return <View>
 <Animated.View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0,borderRadius:radius,backgroundColor:done?C.pale:C.blue,opacity:reveal,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',paddingRight:20,gap:7}}>
  <Animated.View style={{transform:[{scale:iconScale}]}}><Icon name={done?doneIcon:icon} size={22} color={done?C.blue:C.white}/></Animated.View>
  <Txt bold size={14} color={done?C.blue:C.white}>{done?doneLabel:label}</Txt>
 </Animated.View>
 <Animated.View {...pan.panHandlers} style={{transform:[{translateX:x}]}}>{children}</Animated.View>
 </View>;
}
