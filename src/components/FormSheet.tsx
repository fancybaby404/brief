import React,{useEffect,useRef,useState} from 'react';
import {Keyboard,Modal,Platform,ScrollView,View} from 'react-native';
import {C} from '../theme/tokens';
import {Tap,Txt,useReducedMotion} from './Ui';

/** Keyboard overlap measured in window coordinates when the keyboard arrives. RN's KeyboardAvoidingView
 *  measures relative to its parent, which under-counts inside an iOS page sheet (the sheet sits below the top). */
function useKeyboardInset(ref:React.RefObject<View|null>){
 const [inset,setInset]=useState(0);
 useEffect(()=>{const ios=Platform.OS==='ios';
  const show=Keyboard.addListener(ios?'keyboardWillShow':'keyboardDidShow',e=>ref.current?.measureInWindow((_x,y,_w,h)=>setInset(Math.max(0,y+h-e.endCoordinates.screenY))));
  const hide=Keyboard.addListener(ios?'keyboardWillHide':'keyboardDidHide',()=>setInset(0));
  return ()=>{show.remove();hide.remove();};},[]);
 return inset;
}

/** Native form sheet (pageSheet on iOS: swipe down to dismiss; full screen on Android) with a
 *  Cancel · Title · Done bar and a keyboard-safe body. `onClose` runs for Cancel, swipe-down and Android back. */
export function FormSheet({visible,title,onClose,cancelLabel='Cancel',doneLabel,onDone,doneDisabled=false,scroll=true,children,footer}:{visible:boolean,title:string,onClose:()=>void,cancelLabel?:string|null,doneLabel:string,onDone:()=>void,doneDisabled?:boolean,scroll?:boolean,children:React.ReactNode,footer?:React.ReactNode}){
 const body=useRef<View>(null);const inset=useKeyboardInset(body),reduce=useReducedMotion();
 return <Modal visible={visible} animationType={reduce?'fade':'slide'} presentationStyle="pageSheet" allowSwipeDismissal={!reduce} onRequestClose={onClose}>
 <View style={{flex:1,backgroundColor:C.white}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,height:56}}>
   {cancelLabel?<Tap accessibilityRole="button" onPress={onClose} style={{minWidth:72,minHeight:44,justifyContent:'center',paddingHorizontal:10}}><Txt size={17} color={C.blue}>{cancelLabel}</Txt></Tap>:<View style={{minWidth:72}}/>}
   <Txt bold size={17} numberOfLines={1} style={{letterSpacing:-0.2,flexShrink:1}}>{title}</Txt>
   <Tap accessibilityRole="button" accessibilityState={{disabled:doneDisabled}} disabled={doneDisabled} onPress={onDone} style={{minWidth:72,minHeight:44,justifyContent:'center',alignItems:'flex-end',paddingHorizontal:10,opacity:doneDisabled?0.4:1}}><Txt size={17} bold color={C.blue}>{doneLabel}</Txt></Tap>
  </View>
  <View ref={body} collapsable={false} style={{flex:1,paddingBottom:inset}}>
   {scroll?<ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{paddingHorizontal:18,paddingTop:6,paddingBottom:32}}>{children}{footer}</ScrollView>:<>{children}{footer}</>}
  </View>
 </View>
 </Modal>;
}

/** Grouped form label, iOS settings style. */
export function FormLabel({children}:{children:string}){return <Txt size={13} bold color={C.muted} style={{letterSpacing:0.2,marginTop:18,marginBottom:8}}>{children}</Txt>;}
