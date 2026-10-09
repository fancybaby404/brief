import React from 'react';
import {Pressable,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C} from '../theme/tokens';
import Reanimated from 'react-native-reanimated';
import {Brand,Icon,Mascot,Popover,SCRIM_IN,SCRIM_OUT,Tap,Txt,useKeyboardVisible,useReducedMotion} from './Ui';
import {EASE_OUT_CSS} from '../theme/motion';
import {useBrief} from '../lib/appContext';
export function Header({plain=false,title}:{plain?:boolean,title?:string}) {
 const {back,toggleProfileMenu,go}=useBrief();
 return <View style={{height:59,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12}}>
 {plain?<Tap accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{width:44,height:44,justifyContent:'center'}}><Icon name="chevron-back" size={26}/></Tap>:<View style={{paddingLeft:6}}><Brand onPress={()=>go('home')}/></View>}
 {title&&<Txt size={18} bold>{title}</Txt>}
 {!plain?<Tap onPress={toggleProfileMenu} accessibilityRole="button" accessibilityLabel="Account menu" style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="person-outline" color={C.ink} size={24}/></Tap>:<View style={{width:44}}/>}
 </View>
}
const destinations: {key:'home'|'jobs'|'calendar'|'mock';label:string;icon:string;selected:string}[]=[
 {key:'home',label:'Home',icon:'home-outline',selected:'home'},
 {key:'jobs',label:'Jobs',icon:'briefcase-outline',selected:'briefcase'},
 {key:'calendar',label:'Calendar',icon:'calendar-outline',selected:'calendar'},
 {key:'mock',label:'Mock',icon:'mic-outline',selected:'mic'}
];
export function FloatingNav() {
 const {tab,goTab,toggleQuick,quick}=useBrief(); const insets=useSafeAreaInsets(); const reduce=useReducedMotion(); if(useKeyboardVisible())return null;
 return <View style={{position:'absolute',left:13,right:13,bottom:Math.max(insets.bottom,10),flexDirection:'row',gap:8,alignItems:'flex-end'}}>
 <View accessibilityRole="tablist" style={{flex:1,backgroundColor:C.white,borderRadius:26,minHeight:62,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:5,borderWidth:1,borderColor:C.line,shadowColor:'#6686A9',shadowOpacity:0.10,shadowRadius:17,elevation:6}}>
 {destinations.map(d=><Tap key={d.key} accessibilityRole="tab" accessibilityLabel={d.label} accessibilityState={{selected:tab===d.key}} onPress={()=>goTab(d.key)} style={{alignItems:'center',justifyContent:'center',paddingHorizontal:5,minWidth:52,minHeight:55,gap:1}}><Icon name={tab===d.key?d.selected:d.icon} size={21} color={tab===d.key?C.blue:C.muted}/><Txt size={10} color={tab===d.key?C.blue:C.muted} bold={tab===d.key}>{d.label}</Txt></Tap>)}
 </View>
 <Tap accessibilityRole="button" accessibilityLabel={quick?'Close quick actions':'Quick actions'} accessibilityState={{expanded:quick}} onPress={toggleQuick} style={{width:60,height:62,backgroundColor:C.blue,borderRadius:19,alignItems:'center',justifyContent:'center',shadowColor:C.blue,shadowOpacity:0.25,shadowRadius:10,elevation:5}}><Reanimated.View style={{transform:[{rotate:quick?'45deg':'0deg'}],transitionProperty:'transform',transitionDuration:reduce?0:200,transitionTimingFunction:EASE_OUT_CSS}}><Icon name="add" size={31} color={C.white}/></Reanimated.View></Tap>
 </View>
}
export function Overlays(){const {quick,profileMenu,toggleQuick,toggleProfileMenu,go,openChat,profile}=useBrief();const insets=useSafeAreaInsets();
 const row={flexDirection:'row',alignItems:'center',gap:12,minHeight:52,paddingHorizontal:14} as const;
 return <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:20}} pointerEvents="box-none">
 {(quick||profileMenu)&&<Reanimated.View entering={SCRIM_IN} exiting={SCRIM_OUT} style={{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:quick?'rgba(9,25,45,0.28)':'transparent'}}><Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={{flex:1}} onPress={quick?toggleQuick:toggleProfileMenu}/></Reanimated.View>}
 {quick&&<Popover origin="bottom right" style={{width:'52%',right:13,bottom:Math.max(insets.bottom,10)+75,paddingVertical:4}}>
 <Tap accessibilityRole="button" onPress={()=>go('add-job')} style={row}><Icon name="briefcase-outline" size={22}/><Txt bold size={16} style={{flex:1}}>Add Job</Txt><Icon name="chevron-forward" color={C.soft} size={15}/></Tap>
 <View style={{height:1,backgroundColor:C.line,marginHorizontal:12}}/>
 <Tap accessibilityRole="button" onPress={()=>openChat()} style={row}><Mascot size={24}/><Txt bold size={16} style={{flex:1}}>Ask Brief</Txt><Icon name="chevron-forward" color={C.soft} size={15}/></Tap>
 </Popover>}
 {profileMenu&&<Popover origin="top right" style={{right:12,top:52,width:210,padding:6}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,paddingHorizontal:8}}><View style={{width:35,height:35,borderRadius:18,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name="person" color={C.blue}/></View><Txt bold style={{flex:1}} numberOfLines={1}>{profile.name||'Your account'}</Txt></View>
 {([{name:'Resume',icon:'document-text-outline',page:'resume'},{name:'Notifications',icon:'notifications-outline',page:'notifications'},{name:'Settings',icon:'settings-outline',page:'settings'}] as const).map(r=><Tap accessibilityRole="button" onPress={()=>go(r.page)} key={r.page} style={{...row,minHeight:48,paddingHorizontal:8,borderTopWidth:1,borderTopColor:C.line}}><Icon name={r.icon} color={C.ink}/><Txt bold size={14} style={{flex:1}}>{r.name}</Txt><Icon name="chevron-forward" color={C.muted} size={15}/></Tap>)}
 </Popover>}
 </View>;
}
