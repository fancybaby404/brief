import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, Image, Modal, Pressable, ScrollView, Text, TextInput, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated,{ Extrapolation, FadeIn, FadeOut, interpolate, useAnimatedStyle, useReducedMotion as useReanimatedReducedMotion, useSharedValue, withSpring, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardEvents } from 'react-native-keyboard-controller';
import { scheduleOnRN } from 'react-native-worklets';
import { EASE_OUT, EASE_OUT_CSS, EASE_SHEET, SPRING_SHEET, project, rubberband } from '../theme/motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { C,R,SPRING } from '../theme/tokens';
export function Icon({name,size=20,color=C.ink}:{name:string,size?:number,color?:string}) {return <Ionicons name={name as any} size={size} color={color}/>;}
export function Txt({children,size=14,bold=false,color=C.ink,style,numberOfLines,selectable}:{children:React.ReactNode,size?:number,bold?:boolean,color?:string,style?:any,numberOfLines?:number,selectable?:boolean}) {return <Text selectable={selectable} numberOfLines={numberOfLines} style={[{fontSize:size,fontWeight:bold?'700':'400',color,lineHeight:size*1.37},style]}>{children}</Text>}
/** Large titles get negative tracking, like SF Pro Display. */
export function Heading({children}:{children:React.ReactNode}) {return <Txt size={27} bold style={{letterSpacing:-0.6,lineHeight:33}}>{children}</Txt>}
export function Card({children,style}:{children:React.ReactNode,style?:StyleProp<ViewStyle>}) {return <View style={[{backgroundColor:C.white,borderRadius:R.card,padding:15,borderWidth:1,borderColor:C.line},style]}>{children}</View>}
/** Pressable with an immediate press-down highlight (feedback on touch-down, not release). */
const APressable=Reanimated.createAnimatedComponent(Pressable);
const PRESS_TRANSITION={transitionProperty:'transform',transitionDuration:120,transitionTimingFunction:EASE_OUT_CSS} as const;
/** Every pressable: 3% scale on touch-down in 120 ms (feedback on press-in, commit on release).
 *  A CSS transition, not a worklet: it's a two-state change, and setState fires twice per press, never per frame. */
export function Tap({style,onPressIn,onPressOut,...p}:Omit<PressableProps,'style'>&{style?:StyleProp<ViewStyle>}) {
 const [pressed,setPressed]=useState(false);
 return <APressable {...p} pressRetentionOffset={16}
  onPressIn={e=>{setPressed(true);onPressIn?.(e);}} onPressOut={e=>{setPressed(false);onPressOut?.(e);}}
  style={[style,PRESS_TRANSITION,{transform:[{scale:pressed?0.97:1}]}]}/>;
}
export function Primary({label,onPress,secondary=false,disabled=false,large=false,icon}:{label:string,onPress:()=>void,secondary?:boolean,disabled?:boolean,large?:boolean,icon?:string}) {const color=secondary?C.blue:C.white;return <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={{minHeight:large?54:46,justifyContent:'center',paddingHorizontal:16,backgroundColor:secondary?C.pale:C.blue,borderRadius:large?16:13,opacity:disabled?.55:1,alignItems:'center'}}><Txt color={color} bold size={large?17:14}>{label}</Txt>{!!icon&&<View style={{position:'absolute',right:18}}><Icon name={icon} size={large?20:17} color={color}/></View>}</Tap>}
export function Input({value,onChangeText,placeholder,multiline=false}:{value:string,onChangeText:(text:string)=>void,placeholder?:string,multiline?:boolean}) {return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.soft} multiline={multiline} style={{backgroundColor:C.pale2,color:C.ink,borderRadius:12,padding:12,marginTop:5,minHeight:multiline?100:45,textAlignVertical:multiline?'top':'center',fontSize:14}}/>}
export function Field({label,value,onChangeText,placeholder,multiline}:{label:string,value:string,onChangeText:(v:string)=>void,placeholder?:string,multiline?:boolean}) {return <View style={{marginBottom:11}}><Txt size={12} color={C.muted}>{label}</Txt><Input {...{value,onChangeText,placeholder,multiline}}/></View>}
export function SmallIconButton({icon,onPress}:{icon:string,onPress:()=>void}) {return <Tap onPress={onPress} hitSlop={10} style={{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:18,backgroundColor:C.pale2}}><Icon name={icon} color={C.blue} size={18}/></Tap>}
/** Mascot faces, all cropped to the same 842×924 frame so swapping never shifts the body. No arms, ever. */
export const FACES={
 happy:require('../../assets/mascot-happy.png'),shocked:require('../../assets/mascot/shocked.png'),
 question:require('../../assets/mascot/question.png'),sad:require('../../assets/mascot/sad.png'),error:require('../../assets/mascot/error.png'),
} as const;
export type Mood=keyof typeof FACES;
export function Mascot({size=125,mood='happy'}:{size?:number,mood?:Mood}) {return <Image source={FACES[mood]} resizeMode="contain" style={{width:size,height:size}} accessibilityIgnoresInvertColors/>}
/** Wordmark: lowercase "brief" in Fredoka Bold (700), loaded in App.tsx. */
export const BRAND_FONT='Fredoka_700Bold';
export function Wordmark({size=31}:{size?:number}) {return <View accessible accessibilityLabel="brief" style={{flexDirection:'row',alignItems:'center',gap:size*0.1}}><Text allowFontScaling={false} style={{fontFamily:BRAND_FONT,fontSize:size,lineHeight:size*1.23,color:'#050505',letterSpacing:-size*0.02,includeFontPadding:false}}>brief</Text><Mascot size={size*1.03}/></View>}
export function Brand({onPress}:{onPress?:()=>void}) {return <Tap accessibilityRole="button" accessibilityLabel="brief, home" onPress={onPress} style={{minHeight:44,justifyContent:'center'}}><Wordmark/></Tap>}
/** Three blue rounded dashes radiating toward the mascot (the "sparkle" from the brand references). */
export function Sparkles({size=44}:{size?:number}) {const w=size*0.15,h=size*0.4;
 const dash=(left:number,top:number,deg:number)=><View style={{position:'absolute',left:left*size,top:top*size,width:w,height:h,borderRadius:w/2,backgroundColor:C.blue,transform:[{rotate:`${deg}deg`}]}}/>;
 return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size}}>{dash(0.62,0,22)}{dash(0.3,0.22,-28)}{dash(0.04,0.56,-68)}</View>;}
export function StatusPill({status}:{status:string}) { const label:{[k:string]:string}={interested:'Interested',applied:'Applied',interview:'Interview',under_review:'Under review',offer:'Offer',rejected:'Rejected'};const green=['applied','offer'].includes(status); return <View style={{paddingHorizontal:10,paddingVertical:5,borderRadius:20,backgroundColor:green?C.greenSoft:status==='rejected'?C.redSoft:C.pale}}><Txt size={11} color={green?C.green:status==='rejected'?C.danger:C.blue}>{label[status]||status}</Txt></View>}
export function SectionTitle({children,right,onRight}:{children:string,right?:string,onRight?:()=>void}) {return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9}}><Txt size={17} bold>{children}</Txt>{right&&<Tap accessibilityRole="button" hitSlop={12} onPress={onRight}><Txt size={13} color={C.blue}>{right}</Txt></Tap>}</View>}
/** Provider logo when available; a neutral briefcase tile when missing or offline. Never a guessed logo. */
export function CompanyLogo({uri,size=40}:{uri?:string,size?:number}) {const [failed,setFailed]=useState(false);const box={width:size,height:size,borderRadius:size*0.26};
 return uri&&!failed?<Image source={{uri}} onError={()=>setFailed(true)} resizeMode="contain" accessibilityIgnoresInvertColors style={[box,{backgroundColor:C.white,borderWidth:1,borderColor:C.line}]}/>
 :<View style={[box,{backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}]}><Icon name="briefcase-outline" color={C.blue} size={size*0.5}/></View>;}
/** True while the software keyboard is up; the floating bar hides so it never covers a composer. */
/** "Will" events (both platforms via keyboard-controller) so the bar leaves as the keyboard starts, not after it lands. */
export function useKeyboardVisible() {const [v,setV]=useState(false);useEffect(()=>{const a=KeyboardEvents.addListener('keyboardWillShow',()=>setV(true)),b=KeyboardEvents.addListener('keyboardWillHide',()=>setV(false));return ()=>{a.remove();b.remove();};},[]);return v;}
/** Reduce Motion: correct on the first frame (Reanimated reads it synchronously), then follows changes live. */
export function useReducedMotion() {const initial=useReanimatedReducedMotion();const [r,setR]=useState(initial);useEffect(()=>{const s=AccessibilityInfo.addEventListener('reduceMotionChanged',setR);return ()=>s.remove();},[]);return r;}

/** Soft looping cloud behind the mascot. Puffs drift out of phase; static when Reduce Motion is on. */
function Puff({d,left,top,color,period,dx,dy,still}:{d:number,left:number,top:number,color:string,period:number,dx:number,dy:number,still:boolean}) {
 const t=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(still){t.stopAnimation();t.setValue(0);return;}
  const ease=Easing.inOut(Easing.sin);
  const loop=Animated.loop(Animated.sequence([Animated.timing(t,{toValue:1,duration:period/2,easing:ease,useNativeDriver:true}),Animated.timing(t,{toValue:0,duration:period/2,easing:ease,useNativeDriver:true})]));
  loop.start();return ()=>loop.stop();},[still,period]);
 const move=(to:number)=>t.interpolate({inputRange:[0,1],outputRange:[0,to]});
 return <Animated.View style={{position:'absolute',left,top,width:d,height:d,borderRadius:d/2,backgroundColor:color,transform:[{translateX:move(dx)},{translateY:move(dy)},{scale:t.interpolate({inputRange:[0,1],outputRange:[1,1.045]})}]}}/>;
}
export function CloudHalo({size,children}:{size:number,children:React.ReactNode}) {const still=useReducedMotion();const s=size;
 return <View style={{width:s,height:s*0.92,alignItems:'center',justifyContent:'center'}}>
 <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
 <Puff still={still} d={s*0.46} left={0} top={s*0.3} color="#DCEAFF" period={7000} dx={-3} dy={2}/>
 <Puff still={still} d={s*0.5} left={s*0.5} top={s*0.22} color="#DCEAFF" period={8200} dx={3} dy={-2}/>
 <Puff still={still} d={s*0.66} left={s*0.17} top={0} color="#E3EFFF" period={9400} dx={1} dy={-4}/>
 <Puff still={still} d={s*0.24} left={s*0.2} top={s*0.1} color="rgba(255,255,255,0.75)" period={6200} dx={2} dy={-1}/>
 <View style={{position:'absolute',left:s*0.06,right:s*0.06,bottom:s*0.06,height:s*0.3,borderRadius:s*0.15,backgroundColor:'#E6F1FF'}}/>
 </View>
 {children}
 </View>;
}

/** Bottom sheet: dims the screen, springs up from the bottom, drag down or tap outside to dismiss.
 *  Reduce Motion swaps the slide for a short cross-fade. */
export function Sheet({visible,onClose,title,children,footer,scroll=false}:{visible:boolean,onClose:()=>void,title:string,children:React.ReactNode,footer?:React.ReactNode,scroll?:boolean}) {
 const H=Dimensions.get('window').height;const reduce=useReducedMotion();
 const [mounted,setMounted]=useState(visible);
 const close=useRef(onClose);close.current=onClose;const callClose=useCallback(()=>close.current(),[]);
 // y: sheet offset from its resting position (UI thread). height: measured panel height for the dismiss threshold.
 const y=useSharedValue(H),fade=useSharedValue(0),start=useSharedValue(0),height=useSharedValue(H*0.5);
 useEffect(()=>{
  if(visible){setMounted(true);
   if(reduce){y.set(0);fade.set(withTiming(1,{duration:180,easing:EASE_OUT}));}
   else{fade.set(1);y.set(withSpring(0,{duration:300,dampingRatio:1}));} // opened by a tap: no momentum, so no overshoot
  }else if(mounted){
   const done=(finished?:boolean)=>{'worklet';if(finished)scheduleOnRN(setMounted,false);};
   if(reduce)fade.set(withTiming(0,{duration:150,easing:EASE_OUT},done));
   else y.set(withTiming(H,{duration:240,easing:EASE_SHEET},done));
  }},[visible]);
 const pan=useMemo(()=>Gesture.Pan().activeOffsetY([-10,10])
  .onStart(()=>{start.set(y.get());}) // grab mid-animation continues from where the sheet is
  .onUpdate(e=>{const next=start.get()+e.translationY;y.set(next>=0?next:rubberband(next,height.get()));})
  .onEnd(e=>{
   if(y.get()+project(e.velocityY)>height.get()*0.4){ // where the flick was going, not just how far it moved
    y.set(withSpring(H,{duration:300,dampingRatio:1,velocity:e.velocityY,overshootClamping:true},f=>{if(f)scheduleOnRN(callClose);}));
   }else y.set(withSpring(0,{...SPRING_SHEET,velocity:e.velocityY}));
  }),[]);
 const backdrop=useAnimatedStyle(()=>({opacity:fade.get()*interpolate(y.get(),[0,height.get()],[1,0],Extrapolation.CLAMP)}));
 const panel=useAnimatedStyle(()=>({opacity:fade.get(),transform:[{translateY:y.get()}]}));
 if(!mounted)return null;
 const header=<View collapsable={false}>
  <View style={{alignSelf:'center',width:38,height:5,borderRadius:3,backgroundColor:C.line,marginBottom:12}}/>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Txt bold size={18}>{title}</Txt><Tap accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} onPress={onClose} style={{width:30,height:30,borderRadius:15,backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={17} color={C.muted}/></Tap></View>
 </View>;
 // Long content scrolls; then only the grabber/header drags the sheet, so scrolling never fights dismissal.
 const body=scroll?<ScrollView style={{maxHeight:H*0.58}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>:children;
 const content=<SafeAreaView edges={['bottom']} style={{paddingHorizontal:18,paddingTop:8,paddingBottom:12}}>
  {scroll?<GestureDetector gesture={pan}>{header}</GestureDetector>:header}
  {body}
  {footer&&<View style={{paddingTop:14}}>{footer}</View>}
 </SafeAreaView>;
 // The modal draws edge to edge on purpose; the SafeAreaView measures the real bottom inset (home indicator / Android nav bar).
 return <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
 <GestureHandlerRootView style={{flex:1}}>
 <Reanimated.View style={[{flex:1,backgroundColor:'rgba(9,25,45,0.3)'},backdrop]}><Pressable accessibilityRole="button" accessibilityLabel="Close" style={{flex:1}} onPress={onClose}/></Reanimated.View>
 <Reanimated.View accessibilityViewIsModal onLayout={e=>height.set(e.nativeEvent.layout.height)} style={[{position:'absolute',left:0,right:0,bottom:0,backgroundColor:C.white,borderTopLeftRadius:24,borderTopRightRadius:24,shadowColor:'#33446A',shadowOpacity:0.15,shadowRadius:20,elevation:16},panel]}>
  {scroll?content:<GestureDetector gesture={pan}>{content}</GestureDetector>}
 </Reanimated.View>
 </GestureHandlerRootView>
 </Modal>;
}

// Popover motion: grows from its trigger (never from scale 0), leaves the way it came, ~20% faster.
const popIn:EntryExitAnimationFunction=()=>{'worklet';return {initialValues:{opacity:0,transform:[{scale:0.92}]},animations:{opacity:withTiming(1,{duration:150,easing:EASE_OUT}),transform:[{scale:withSpring(1,{duration:300,dampingRatio:1})}]}};};
const popOut:EntryExitAnimationFunction=()=>{'worklet';return {initialValues:{opacity:1,transform:[{scale:1}]},animations:{opacity:withTiming(0,{duration:140,easing:EASE_OUT}),transform:[{scale:withTiming(0.96,{duration:140,easing:EASE_OUT})}]}};};
const FADE_IN=FadeIn.duration(150).easing(EASE_OUT),FADE_OUT=FadeOut.duration(120).easing(EASE_OUT);
export const SCRIM_IN=FadeIn.duration(200).easing(EASE_OUT),SCRIM_OUT=FadeOut.duration(160).easing(EASE_OUT);

/** Anchored menu. Mount/unmount it conditionally: the entering/exiting animations run on the UI thread. */
export function Popover({origin,style,children}:{origin:'top right'|'bottom right',style:StyleProp<ViewStyle>,children:React.ReactNode}) {
 const reduce=useReducedMotion();
 return <Reanimated.View entering={reduce?FADE_IN:popIn} exiting={reduce?FADE_OUT:popOut} accessibilityViewIsModal style={[{position:'absolute',backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,shadowColor:'#33446A',shadowOpacity:0.16,shadowRadius:18,elevation:13,transformOrigin:origin},style]}>{children}</Reanimated.View>;
}

/** iOS-style pull-down: a compact pill showing the current choice; the menu opens anchored under it. */
export function PullDownMenu<T extends string>({label,value,options,onChange}:{label:string,value:T,options:{value:T,label:string}[],onChange:(v:T)=>void}) {
 const ref=useRef<View>(null);const [pos,setPos]=useState<{top:number,right:number}|null>(null),[open,setOpen]=useState(false);
 const current=options.find(o=>o.value===value)?.label??'';
 const show=()=>ref.current?.measureInWindow((x,y,w,h)=>{setPos({top:y+h+6,right:Dimensions.get('window').width-(x+w)});setOpen(true);});
 // Keep the modal up until the exit animation has played, then remove it.
 const hide=()=>{setOpen(false);setTimeout(()=>setPos(null),160);};
 const pick=(v:T)=>{hide();if(v!==value){void Haptics.selectionAsync();onChange(v);}};
 return <>
 <View ref={ref} collapsable={false}><Tap accessibilityRole="button" accessibilityLabel={label+', '+current} accessibilityHint="Opens a menu" hitSlop={8} onPress={show} style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:C.pale2,borderRadius:16,paddingHorizontal:12,minHeight:32}}><Txt size={13}>{current}</Txt><Icon name="chevron-down" size={14} color={C.muted}/></Tap></View>
 <Modal transparent visible={!!pos} animationType="none" statusBarTranslucent onRequestClose={hide}>
 <Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={{flex:1}} onPress={hide}/>
 {pos&&open&&<Popover origin="top right" style={{top:pos.top,right:pos.right,minWidth:200,paddingVertical:4}}>
 {options.map((o,i)=><Tap key={o.value} accessibilityRole="menuitem" accessibilityState={{selected:o.value===value}} onPress={()=>pick(o.value)} style={{flexDirection:'row',alignItems:'center',minHeight:44,paddingHorizontal:12,gap:8,borderTopWidth:i?1:0,borderTopColor:C.line}}><View style={{width:20}}>{o.value===value&&<Icon name="checkmark" size={17} color={C.blue}/>}</View><Txt size={15}>{o.label}</Txt></Tap>)}
 </Popover>}
 </Modal>
 </>;
}
