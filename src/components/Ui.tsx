import React,{useEffect,useRef,useState} from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, Image, Keyboard, Modal, PanResponder, Pressable, Text, TextInput, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { C,R,SPRING } from '../theme/tokens';
export function Icon({name,size=20,color=C.ink}:{name:string,size?:number,color?:string}) {return <Ionicons name={name as any} size={size} color={color}/>;}
export function Txt({children,size=14,bold=false,color=C.ink,style,numberOfLines}:{children:React.ReactNode,size?:number,bold?:boolean,color?:string,style?:any,numberOfLines?:number}) {return <Text numberOfLines={numberOfLines} style={[{fontSize:size,fontWeight:bold?'700':'400',color,lineHeight:size*1.37},style]}>{children}</Text>}
/** Large titles get negative tracking, like SF Pro Display. */
export function Heading({children}:{children:React.ReactNode}) {return <Txt size={27} bold style={{letterSpacing:-0.6,lineHeight:33}}>{children}</Txt>}
export function Card({children,style}:{children:React.ReactNode,style?:StyleProp<ViewStyle>}) {return <View style={[{backgroundColor:C.white,borderRadius:R.card,padding:15,borderWidth:1,borderColor:C.line},style]}>{children}</View>}
/** Pressable with an immediate press-down highlight (feedback on touch-down, not release). */
export function Tap({style,...p}:PressableProps) {return <Pressable {...p} style={s=>[typeof style==='function'?style(s):style,s.pressed&&{opacity:0.6}]}/>}
export function Primary({label,onPress,secondary=false,disabled=false}:{label:string,onPress:()=>void,secondary?:boolean,disabled?:boolean}) {return <Tap accessibilityRole="button" onPress={onPress} disabled={disabled} style={{minHeight:46,justifyContent:'center',paddingHorizontal:16,backgroundColor:secondary?C.pale:C.blue,borderRadius:13,opacity:disabled?.55:1,alignItems:'center'}}><Txt color={secondary?C.blue:C.white} bold>{label}</Txt></Tap>}
export function Input({value,onChangeText,placeholder,multiline=false}:{value:string,onChangeText:(text:string)=>void,placeholder?:string,multiline?:boolean}) {return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.soft} multiline={multiline} style={{backgroundColor:C.pale2,color:C.ink,borderRadius:12,padding:12,marginTop:5,minHeight:multiline?100:45,textAlignVertical:multiline?'top':'center',fontSize:14}}/>}
export function Field({label,value,onChangeText,placeholder,multiline}:{label:string,value:string,onChangeText:(v:string)=>void,placeholder?:string,multiline?:boolean}) {return <View style={{marginBottom:11}}><Txt size={12} color={C.muted}>{label}</Txt><Input {...{value,onChangeText,placeholder,multiline}}/></View>}
export function SmallIconButton({icon,onPress}:{icon:string,onPress:()=>void}) {return <Tap onPress={onPress} hitSlop={10} style={{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:18,backgroundColor:C.pale2}}><Icon name={icon} color={C.blue} size={18}/></Tap>}
export function Mascot({size=125}:{size?:number}) {return <Image source={require('../../assets/mascot-happy.png')} resizeMode="contain" style={{width:size,height:size}} accessibilityIgnoresInvertColors/>}
/** Wordmark: lowercase "brief" in Fredoka Bold (700), loaded in App.tsx. */
export const BRAND_FONT='Fredoka_700Bold';
export function Brand({onPress}:{onPress?:()=>void}) {return <Tap accessibilityRole="button" accessibilityLabel="brief, home" onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:3,minHeight:44}}><Text allowFontScaling={false} style={{fontFamily:BRAND_FONT,fontSize:31,lineHeight:38,color:'#050505',letterSpacing:-0.6,includeFontPadding:false}}>brief</Text><Mascot size={32}/></Tap>}
export function StatusPill({status}:{status:string}) { const label:{[k:string]:string}={interested:'Interested',applied:'Applied',interview:'Interview',under_review:'Under review',offer:'Offer',rejected:'Rejected'};const green=['applied','offer'].includes(status); return <View style={{paddingHorizontal:10,paddingVertical:5,borderRadius:20,backgroundColor:green?C.greenSoft:status==='rejected'?C.redSoft:C.pale}}><Txt size={11} color={green?C.green:status==='rejected'?C.danger:C.blue}>{label[status]||status}</Txt></View>}
export function SectionTitle({children,right,onRight}:{children:string,right?:string,onRight?:()=>void}) {return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9}}><Txt size={17} bold>{children}</Txt>{right&&<Tap accessibilityRole="button" hitSlop={12} onPress={onRight}><Txt size={13} color={C.blue}>{right}</Txt></Tap>}</View>}
/** Provider logo when available; a neutral briefcase tile when missing or offline. Never a guessed logo. */
export function CompanyLogo({uri,size=40}:{uri?:string,size?:number}) {const [failed,setFailed]=useState(false);const box={width:size,height:size,borderRadius:size*0.26};
 return uri&&!failed?<Image source={{uri}} onError={()=>setFailed(true)} resizeMode="contain" accessibilityIgnoresInvertColors style={[box,{backgroundColor:C.white,borderWidth:1,borderColor:C.line}]}/>
 :<View style={[box,{backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}]}><Icon name="briefcase-outline" color={C.blue} size={size*0.5}/></View>;}
/** True while the software keyboard is up; the floating bar hides so it never covers a composer. */
export function useKeyboardVisible() {const [v,setV]=useState(false);useEffect(()=>{const a=Keyboard.addListener('keyboardDidShow',()=>setV(true)),b=Keyboard.addListener('keyboardDidHide',()=>setV(false));return ()=>{a.remove();b.remove();};},[]);return v;}
/** Follows the OS Reduce Motion setting live. */
export function useReducedMotion() {const [r,setR]=useState(false);useEffect(()=>{void AccessibilityInfo.isReduceMotionEnabled().then(setR);const s=AccessibilityInfo.addEventListener('reduceMotionChanged',setR);return ()=>s.remove();},[]);return r;}

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
 return <View style={{width:s,height:s*0.92,alignItems:'center',justifyContent:'center'}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
 <Puff still={still} d={s*0.46} left={0} top={s*0.3} color="#DCEAFF" period={7000} dx={-3} dy={2}/>
 <Puff still={still} d={s*0.5} left={s*0.5} top={s*0.22} color="#DCEAFF" period={8200} dx={3} dy={-2}/>
 <Puff still={still} d={s*0.66} left={s*0.17} top={0} color="#E3EFFF" period={9400} dx={1} dy={-4}/>
 <Puff still={still} d={s*0.24} left={s*0.2} top={s*0.1} color="rgba(255,255,255,0.75)" period={6200} dx={2} dy={-1}/>
 <View style={{position:'absolute',left:s*0.06,right:s*0.06,bottom:s*0.06,height:s*0.3,borderRadius:s*0.15,backgroundColor:'#E6F1FF'}}/>
 {children}
 </View>;
}

/** Bottom sheet: dims the screen, springs up from the bottom, drag down or tap outside to dismiss.
 *  Reduce Motion swaps the slide for a short cross-fade. */
export function Sheet({visible,onClose,title,children}:{visible:boolean,onClose:()=>void,title:string,children:React.ReactNode}) {
 const H=Dimensions.get('window').height;const reduce=useReducedMotion();const insets=useSafeAreaInsets();
 const [mounted,setMounted]=useState(visible);const close=useRef(onClose);close.current=onClose;
 const ty=useRef(new Animated.Value(H)).current,fade=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(visible){setMounted(true);
   if(reduce){ty.setValue(0);Animated.timing(fade,{toValue:1,duration:180,useNativeDriver:true}).start();}
   else{fade.setValue(1);Animated.spring(ty,{toValue:0,...SPRING.sheet,useNativeDriver:true}).start();}
  }else if(mounted){
   const done=()=>setMounted(false);
   if(reduce)Animated.timing(fade,{toValue:0,duration:150,useNativeDriver:true}).start(done);
   else Animated.timing(ty,{toValue:H,duration:220,easing:Easing.in(Easing.cubic),useNativeDriver:true}).start(done);
  }},[visible]);
 const pan=useRef(PanResponder.create({
  onMoveShouldSetPanResponder:(_,g)=>g.dy>8&&Math.abs(g.dy)>Math.abs(g.dx),
  onPanResponderMove:(_,g)=>ty.setValue(g.dy>0?g.dy:g.dy*0.15), // rubber-band when pulled up
  onPanResponderRelease:(_,g)=>{
   if(g.dy>110||g.vy>0.9)close.current();
   else Animated.spring(ty,{toValue:0,velocity:g.vy*1000,...SPRING.sheet,useNativeDriver:true}).start();
  },
 })).current;
 if(!mounted)return null;
 const dim=Animated.multiply(fade,ty.interpolate({inputRange:[0,H*0.5],outputRange:[1,0],extrapolate:'clamp'}));
 return <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
 <Animated.View style={{flex:1,backgroundColor:'rgba(9,25,45,0.3)',opacity:dim}}><Pressable accessibilityRole="button" accessibilityLabel="Close" style={{flex:1}} onPress={onClose}/></Animated.View>
 <Animated.View {...pan.panHandlers} accessibilityViewIsModal style={{position:'absolute',left:0,right:0,bottom:0,backgroundColor:C.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,paddingTop:8,paddingBottom:Math.max(insets.bottom,16)+4,opacity:fade,transform:[{translateY:ty}],shadowColor:'#33446A',shadowOpacity:0.15,shadowRadius:20,elevation:16}}>
 <View style={{alignSelf:'center',width:38,height:5,borderRadius:3,backgroundColor:C.line,marginBottom:12}}/>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Txt bold size={18}>{title}</Txt><Tap accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} onPress={onClose} style={{width:30,height:30,borderRadius:15,backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={17} color={C.muted}/></Tap></View>
 {children}
 </Animated.View>
 </Modal>;
}

/** Menu that grows out of its trigger (transform origin = the button), critically damped; fades only with Reduce Motion. */
export function Popover({origin,style,children}:{origin:'top right'|'bottom right',style:StyleProp<ViewStyle>,children:React.ReactNode}) {
 const reduce=useReducedMotion();const t=useRef(new Animated.Value(0)).current;
 useEffect(()=>{(reduce?Animated.timing(t,{toValue:1,duration:150,useNativeDriver:true}):Animated.spring(t,{toValue:1,...SPRING.ui,useNativeDriver:true})).start();},[]);
 const scale=reduce?1:t.interpolate({inputRange:[0,1],outputRange:[0.9,1]});
 return <Animated.View accessibilityViewIsModal style={[{position:'absolute',backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,shadowColor:'#33446A',shadowOpacity:0.16,shadowRadius:18,elevation:13,opacity:t,transformOrigin:origin,transform:[{scale}]},style]}>{children}</Animated.View>;
}

/** iOS-style pull-down: a compact pill showing the current choice; the menu opens anchored under it. */
export function PullDownMenu<T extends string>({label,value,options,onChange}:{label:string,value:T,options:{value:T,label:string}[],onChange:(v:T)=>void}) {
 const ref=useRef<View>(null);const [pos,setPos]=useState<{top:number,right:number}|null>(null);
 const current=options.find(o=>o.value===value)?.label??'';
 const open=()=>ref.current?.measureInWindow((x,y,w,h)=>setPos({top:y+h+6,right:Dimensions.get('window').width-(x+w)}));
 const pick=(v:T)=>{setPos(null);if(v!==value){void Haptics.selectionAsync();onChange(v);}};
 return <>
 <View ref={ref} collapsable={false}><Tap accessibilityRole="button" accessibilityLabel={label+', '+current} accessibilityHint="Opens a menu" hitSlop={8} onPress={open} style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:C.pale2,borderRadius:16,paddingHorizontal:12,minHeight:32}}><Txt size={13}>{current}</Txt><Icon name="chevron-down" size={14} color={C.muted}/></Tap></View>
 <Modal transparent visible={!!pos} animationType="none" statusBarTranslucent onRequestClose={()=>setPos(null)}>
 <Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={{flex:1}} onPress={()=>setPos(null)}/>
 {pos&&<Popover origin="top right" style={{top:pos.top,right:pos.right,minWidth:200,paddingVertical:4}}>
 {options.map((o,i)=><Tap key={o.value} accessibilityRole="menuitem" accessibilityState={{selected:o.value===value}} onPress={()=>pick(o.value)} style={{flexDirection:'row',alignItems:'center',minHeight:44,paddingHorizontal:12,gap:8,borderTopWidth:i?1:0,borderTopColor:C.line}}><View style={{width:20}}>{o.value===value&&<Icon name="checkmark" size={17} color={C.blue}/>}</View><Txt size={15}>{o.label}</Txt></Tap>)}
 </Popover>}
 </Modal>
 </>;
}
