import React from 'react';
import {View,type StyleProp,type ViewStyle} from 'react-native';
import {C} from '../theme/tokens';
import {Icon,Tap,Txt} from './Ui';

export function SettingsSection({title,children}:{title:string,children:React.ReactNode}){
 return <View style={{gap:6}}><Txt size={12} bold color={C.muted} style={{letterSpacing:0.45,paddingLeft:3}}>{title.toUpperCase()}</Txt>{children}</View>;
}
export function SettingsGroup({children,style}:{children:React.ReactNode,style?:StyleProp<ViewStyle>}){
 return <View style={[{backgroundColor:C.white,borderRadius:15,overflow:'hidden'},style]}>{children}</View>;
}
export function SettingsDivider({inset=44}:{inset?:number}){
 return <View style={{height:1,backgroundColor:C.line,marginLeft:inset}}/>;
}
export function SettingsRow({icon,label,value,detail,onPress,disclosure=false,disabled=false,accessibilityHint,trailing}:{icon?:string,label:string,value?:string,detail?:string,onPress?:()=>void,disclosure?:boolean,disabled?:boolean,accessibilityHint?:string,trailing?:React.ReactNode}){
 const content=<>
  {icon&&<Icon name={icon} size={18} color={C.blue}/>}
  <View style={{flex:1,gap:detail?1:0}}><Txt size={15} bold={false}>{label}</Txt>{!!detail&&<Txt size={12} color={C.muted}>{detail}</Txt>}</View>
  {trailing??(value&&<Txt size={14} color={C.muted} numberOfLines={1} style={{maxWidth:'42%',textAlign:'right'}}>{value}</Txt>)}
  {disclosure&&<Icon name="chevron-forward" size={16} color={C.soft}/>}
 </>;
 const style={minHeight:54,flexDirection:'row' as const,alignItems:'center' as const,gap:11,paddingHorizontal:14,opacity:disabled?0.5:1};
 return onPress
  ?<Tap accessibilityRole="button" accessibilityHint={accessibilityHint} disabled={disabled} onPress={onPress} style={style}>{content}</Tap>
  :<View style={style}>{content}</View>;
}
