import React,{useEffect,useRef,useState} from 'react';
import {Alert,AppState,Dimensions,TextInput,View} from 'react-native';
import {C} from '../theme/tokens';
import {Icon,Tap,Txt} from './Ui';
import {FormSheet} from './FormSheet';

/** Private notes editor. Saves as you type (debounced) and flushes on Done, swipe-down, back and backgrounding,
 *  so dismissing the keyboard or leaving never loses text. There is no Cancel: like Notes, what you typed is kept. */
export function NotesSheet({visible,initial,onSave,onClose}:{visible:boolean,initial:string,onSave:(notes:string)=>Promise<unknown>,onClose:()=>void}){
 const [text,setText]=useState(initial);
 const saved=useRef(initial),timer=useRef<ReturnType<typeof setTimeout>|null>(null),latest=useRef(text),save=useRef(onSave);
 latest.current=text;save.current=onSave;
 const flush=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}const v=latest.current;if(v===saved.current)return;saved.current=v;
  void save.current(v).catch(e=>{saved.current='\u0000';Alert.alert('Couldn’t save your notes',`${(e as Error).message}\nYour text is still here; try again.`);});};
 useEffect(()=>{if(visible){setText(initial);saved.current=initial;latest.current=initial;}},[visible]);
 useEffect(()=>{if(!visible)return;const sub=AppState.addEventListener('change',s=>{if(s!=='active')flush();});return ()=>{sub.remove();flush();};},[visible]);
 const change=(v:string)=>{setText(v);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(flush,600);};
 const close=()=>{flush();onClose();};
 const clear=()=>Alert.alert('Delete notes?','Your notes for this job will be removed.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{latest.current='';setText('');flush();onClose();}}]);
 return <FormSheet visible={visible} title="Your notes" doneLabel="Done" onDone={close} onClose={close} scroll={false}>
  <View style={{flexDirection:'row',alignItems:'center',gap:6,paddingBottom:6}}>
   <Icon name="lock-closed" size={13} color={C.muted}/><Txt size={13} color={C.muted} style={{flex:1}}>Private · stays on this phone</Txt>
   {!!text.trim()&&<Tap accessibilityRole="button" accessibilityLabel="Delete notes" hitSlop={10} onPress={clear} style={{minHeight:32,justifyContent:'center'}}><Txt size={14} color={C.danger}>Delete</Txt></Tap>}
  </View>
  <TextInput accessibilityLabel="Your notes" value={text} onChangeText={change} onBlur={flush} multiline autoFocus={!initial} scrollEnabled
   placeholder={'Interviewer names, questions to ask, salary talk, how it went…'} placeholderTextColor={C.soft}
   style={{height:Math.round(Dimensions.get('window').height*0.42),paddingTop:8,paddingBottom:24,fontSize:17,lineHeight:25,color:C.ink,textAlignVertical:'top'}}/>
 </FormSheet>;
}
