import React from 'react';
import {View} from 'react-native';
import {C} from '../theme/tokens';
import {Icon,Sheet,Tap,Txt,statusStyle} from './Ui';
import {STATUS_ORDER} from '../lib/tracker';
import type {ApplicationStatus} from '../types';

const HINT:Record<ApplicationStatus,string>={
 interested:'Saved, not applied yet',applied:'You sent your application',under_review:'The employer is reviewing it',
 interview:'You’re interviewing',offer:'You received an offer',rejected:'The employer passed this time',withdrawn:'You stepped away from this one',
};

/** Pick a status. The pipeline first, then the two ways an application closes; neither is styled as a warning. */
export function StatusSheet({visible,status,onClose,onPick}:{visible:boolean,status:ApplicationStatus,onClose:()=>void,onPick:(s:ApplicationStatus)=>void}){
 const row=(s:ApplicationStatus,i:number)=>{const st=statusStyle(s),on=s===status;
  return <Tap key={s} accessibilityRole="radio" accessibilityState={{selected:on}} accessibilityLabel={`${st.label}. ${HINT[s]}`} onPress={()=>{onClose();if(!on)onPick(s);}}
   style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:56,paddingVertical:6,borderTopWidth:i===0||i===5?0:1,borderTopColor:C.line}}>
   <View style={{width:12,height:12,borderRadius:6,backgroundColor:st.color}}/>
   <View style={{flex:1}}><Txt size={16} bold={on}>{st.label}</Txt><Txt size={13} color={C.muted}>{HINT[s]}</Txt></View>
   {on&&<Icon name="checkmark" size={20} color={C.blue}/>}
  </Tap>;};
 return <Sheet visible={visible} onClose={onClose} title="Status">
  <View accessibilityRole="radiogroup">
   {STATUS_ORDER.slice(0,5).map(row)}
   <Txt size={13} bold color={C.muted} style={{marginTop:14,marginBottom:2,letterSpacing:0.2}}>CLOSED</Txt>
   {STATUS_ORDER.slice(5).map((s,i)=>row(s,i+5))}
  </View>
 </Sheet>;
}
