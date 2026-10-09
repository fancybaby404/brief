import React,{useState} from 'react';
import {View} from 'react-native';
import Reanimated from 'react-native-reanimated';
import {C} from '../theme/tokens';
import {EASE_IN_OUT_CSS,EASE_OUT_CSS} from '../theme/motion';
import {Icon,StatusPill,Tap,Txt,useReducedMotion} from './Ui';
import type {ApplicationStatus} from '../types';

const STEPS:{status:ApplicationStatus,label:string,icon:string}[]=[
 {status:'interested',label:'Interested',icon:'bookmark'},
 {status:'applied',label:'Applied',icon:'paper-plane'},
 {status:'under_review',label:'In review',icon:'eye'},
 {status:'interview',label:'Interview',icon:'people'},
 {status:'offer',label:'Offer',icon:'trophy'},
];
const DOT=30;
const day=(iso:string)=>new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'});

/** One-tap status: the pipeline as a progress track. Steps before the current one are done; tap any step to move there.
 *  "Not selected" sits apart because it ends the pipeline rather than advancing it, and it's reversible. */
export function StatusTracker({status,appliedAt,onChange}:{status:ApplicationStatus,appliedAt:string|null,onChange:(s:ApplicationStatus)=>void}){
 const reduce=useReducedMotion();const [w,setW]=useState(0);
 const rejected=status==='rejected';
 const idx=rejected?-1:STEPS.findIndex(s=>s.status===status);
 const col=w/STEPS.length;
 const hint=rejected?'':idx===0?'Applied on the listing? Tap Applied.':appliedAt?`Applied ${day(appliedAt)}`:'Tap a step to update it.';
 return <View style={{gap:14}}>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Txt bold size={17}>Status</Txt><StatusPill status={status}/></View>
 <View onLayout={e=>setW(e.nativeEvent.layout.width)} style={{opacity:rejected?0.45:1}}>
  {/* Track behind the dots, from the first dot's centre to the last; the fill grows to the current step.
      Animating width is fine here: absolutely positioned, no children, so nothing else re-lays-out. */}
  <View style={{position:'absolute',top:DOT/2-1.5,left:col/2,right:col/2,height:3,borderRadius:2,backgroundColor:C.line}}/>
  <Reanimated.View style={{position:'absolute',top:DOT/2-1.5,left:col/2,height:3,borderRadius:2,backgroundColor:C.blue,width:Math.max(0,idx)*col,transitionProperty:'width',transitionDuration:reduce?0:280,transitionTimingFunction:EASE_IN_OUT_CSS}}/>
  <View style={{flexDirection:'row'}}>
  {STEPS.map((s,i)=>{const done=i<idx,current=i===idx;
   return <Tap key={s.status} accessibilityRole="radio" accessibilityState={{selected:current}} accessibilityLabel={s.label} accessibilityHint="Sets the status" onPress={()=>{if(!current)onChange(s.status);}} style={{flex:1,alignItems:'center',gap:7,minHeight:56}}>
    <Reanimated.View style={{width:DOT,height:DOT,borderRadius:DOT/2,alignItems:'center',justifyContent:'center',backgroundColor:done||current?C.blue:C.white,borderWidth:done||current?0:2,borderColor:C.line,
     transform:[{scale:current?1.12:1}],transitionProperty:'transform',transitionDuration:reduce?0:200,transitionTimingFunction:EASE_OUT_CSS,
     shadowColor:C.blue,shadowOpacity:current?0.3:0,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:current?4:0}}>
     <Icon name={done?'checkmark':current?s.icon:s.icon+'-outline'} size={done?16:14} color={done||current?C.white:C.soft}/>
    </Reanimated.View>
    <Txt size={11} bold={current} color={current?C.blue:done?C.ink:C.muted} numberOfLines={1}>{s.label}</Txt>
   </Tap>;})}
  </View>
 </View>
 {rejected
  ?<View style={{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.redSoft,borderRadius:14,padding:12}}>
    <Icon name="close-circle" size={20} color={C.danger}/>
    <View style={{flex:1}}><Txt bold size={14}>Not selected</Txt><Txt size={12} color={C.muted}>It’s part of the process. Keep it here for your records.</Txt></View>
    <Tap accessibilityRole="button" hitSlop={10} onPress={()=>onChange(appliedAt?'applied':'interested')}><Txt bold size={14} color={C.blue}>Reopen</Txt></Tap>
   </View>
  :<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Txt size={12} color={C.muted} style={{flex:1}}>{hint}</Txt>
    <Tap accessibilityRole="button" hitSlop={10} onPress={()=>onChange('rejected')} style={{paddingVertical:6,paddingLeft:12}}><Txt size={13} bold color={C.danger}>Not selected</Txt></Tap>
   </View>}
 </View>;
}
