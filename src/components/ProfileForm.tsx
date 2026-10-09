import React,{useEffect,useState} from 'react';
import {KeyboardAvoidingView,Modal,ScrollView,View} from 'react-native';
import {C} from '../theme/tokens';
import {Field,Tap,Txt} from './Ui';
import type {Profile} from '../types';

type Details=Pick<Profile,'name'|'goals'|'experience'|'education'|'skills'>;

/** Manual resume details in a native form sheet (pageSheet on iOS, full screen on Android).
 *  Cancel discards; Save writes the fields back through onSave. */
export function ProfileForm({visible,profile,onClose,onSave}:{visible:boolean,profile:Profile,onClose:()=>void,onSave:(d:Details)=>void}){
 const [d,setD]=useState<Details>(profile);
 useEffect(()=>{if(visible)setD({name:profile.name,goals:profile.goals,experience:profile.experience,education:profile.education,skills:profile.skills});},[visible]);
 const set=(k:keyof Details)=>(v:string)=>setD(old=>({...old,[k]:v}));
 return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
 <View style={{flex:1,backgroundColor:C.background}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,height:56,borderBottomWidth:1,borderBottomColor:C.line}}>
   <Tap accessibilityRole="button" onPress={onClose} style={{minWidth:64,minHeight:44,justifyContent:'center',paddingHorizontal:10}}><Txt size={16} color={C.blue}>Cancel</Txt></Tap>
   <Txt bold size={17} style={{letterSpacing:-0.2}}>Your details</Txt>
   <Tap accessibilityRole="button" onPress={()=>onSave({...d,name:d.name.trim()})} style={{minWidth:64,minHeight:44,justifyContent:'center',alignItems:'flex-end',paddingHorizontal:10}}><Txt size={16} bold color={C.blue}>Save</Txt></Tap>
  </View>
  <KeyboardAvoidingView behavior="padding" style={{flex:1}}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:40}}>
   <Txt color={C.muted} size={13} style={{marginBottom:14}}>Everything here stays on this phone. Fill in what you like; you can change it later in Resume.</Txt>
   <Field label="Your name" value={d.name} onChangeText={set('name')} placeholder="First name"/>
   <Field label="Target role or goal" value={d.goals} onChangeText={set('goals')} placeholder="e.g. Customer support, remote"/>
   <Field label="Experience" value={d.experience} onChangeText={set('experience')} placeholder={'One per line, e.g.\n2 years call-centre agent at …'} multiline/>
   <Field label="Education" value={d.education} onChangeText={set('education')} placeholder="e.g. BS Information Technology" multiline/>
   <Field label="Skills" value={d.skills} onChangeText={set('skills')} placeholder="Comma separated, e.g. Excel, English, Customer service" multiline/>
  </ScrollView>
  </KeyboardAvoidingView>
 </View>
 </Modal>;
}
