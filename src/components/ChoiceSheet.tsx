import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import * as Haptics from 'expo-haptics';
import {C} from '../theme/tokens';
import {FormSheet} from './FormSheet';
import {Icon,Tap,Txt} from './Ui';

export type ChoiceItem<V extends string>={value:V,label:string,detail?:string};

/** A single-select native form sheet shared by preferences and offline voice choices. */
export function ChoiceSheet<V extends string>({visible,title,items,selected,onClose,onChoose,doneLabel='Done'}:{visible:boolean,title:string,items:ChoiceItem<V>[],selected:V,onClose:()=>void,onChoose:(value:V)=>void,doneLabel?:string|((value:V)=>string)}){
 const [pending,setPending]=useState(selected);
 useEffect(()=>{if(visible)setPending(selected);},[visible,selected]);
 return <FormSheet visible={visible} title={title} onClose={onClose} doneLabel={typeof doneLabel==='function'?doneLabel(pending):doneLabel} onDone={()=>{onChoose(pending);onClose();}}>
  <View style={{gap:0}}>{items.map((item,index)=><React.Fragment key={item.value}>
   {!!index&&<View style={{height:1,backgroundColor:C.line,marginLeft:34}}/>}
   <Tap accessibilityRole="radio" accessibilityState={{selected:pending===item.value}} onPress={()=>{if(pending!==item.value)void Haptics.selectionAsync();setPending(item.value);}} style={{minHeight:54,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:6}}>
    <View style={{width:22,alignItems:'center'}}>{pending===item.value&&<Icon name="checkmark" size={18} color={C.blue}/>}</View>
    <View style={{flex:1,gap:2}}><Txt size={15} bold={pending===item.value}>{item.label}</Txt>{!!item.detail&&<Txt size={12} color={C.muted}>{item.detail}</Txt>}</View>
   </Tap>
  </React.Fragment>)}</View>
 </FormSheet>;
}
