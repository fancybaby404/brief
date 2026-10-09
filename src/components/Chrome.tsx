import React from 'react';
import {Pressable,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C} from '../theme/tokens';
import {Brand,Icon,Txt} from './Ui';
import {useBrief} from '../lib/appContext';
export function Header({plain=false,title}:{plain?:boolean,title?:string}) {
 const {back,toggleProfileMenu,go}=useBrief();
 return <View style={{height:59,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18}}>
 {plain?<Pressable hitSlop={12} onPress={back}><Icon name="chevron-back" size={25}/></Pressable>:<Brand onPress={()=>go('home')}/>}
 {title&&<Txt size={18} bold>{title}</Txt>}
 {!plain?<Pressable onPress={toggleProfileMenu} hitSlop={12} accessibilityLabel="Account menu"><Icon name="person-outline" color={C.ink} size={24}/></Pressable>:<View style={{width:24}}/>}
 </View>
}
const destinations: {key:'home'|'jobs'|'calendar'|'mock';label:string;icon:string;selected:string}[]=[
 {key:'home',label:'Home',icon:'home-outline',selected:'home'},
 {key:'jobs',label:'Jobs',icon:'briefcase-outline',selected:'briefcase'},
 {key:'calendar',label:'Calendar',icon:'calendar-outline',selected:'calendar'},
 {key:'mock',label:'Mock',icon:'mic-outline',selected:'mic'}
];
export function FloatingNav() {
 const {tab,goTab,toggleQuick,quick}=useBrief(); const insets=useSafeAreaInsets();
 return <View style={{position:'absolute',left:13,right:13,bottom:Math.max(insets.bottom,10),flexDirection:'row',gap:8,alignItems:'flex-end'}}>
 <View style={{flex:1,backgroundColor:C.white,borderRadius:26,minHeight:62,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:5,borderWidth:1,borderColor:C.line,shadowColor:'#6686A9',shadowOpacity:0.10,shadowRadius:17,elevation:6}}>
 {destinations.map(d=><Pressable key={d.key} accessibilityRole="tab" accessibilityState={{selected:tab===d.key}} onPress={()=>goTab(d.key)} style={{alignItems:'center',justifyContent:'center',paddingHorizontal:5,minWidth:49,minHeight:55,gap:1}}><Icon name={tab===d.key?d.selected:d.icon} size={21} color={tab===d.key?C.blue:C.muted}/><Txt size={10} color={tab===d.key?C.blue:C.muted} bold={tab===d.key}>{d.label}</Txt></Pressable>)}
 </View>
 <Pressable accessibilityRole="button" accessibilityLabel="Quick actions" onPress={toggleQuick} style={{width:60,height:62,backgroundColor:C.blue,borderRadius:19,alignItems:'center',justifyContent:'center',shadowColor:C.blue,shadowOpacity:0.25,shadowRadius:10,elevation:5}}><Icon name={quick?'close':'add'} size={31} color={C.white}/></Pressable>
 </View>
}
export function Overlays(){const {quick,profileMenu,toggleQuick,toggleProfileMenu,go,openChat,profile}=useBrief();const insets=useSafeAreaInsets();
 if(!quick&&!profileMenu)return null;
 return <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:20}} pointerEvents="box-none">
 <Pressable style={{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:quick?'rgba(9,25,45,0.28)':'transparent'}} onPress={quick?toggleQuick:toggleProfileMenu}/>
 {quick ? <View style={{position:'absolute',width:'52%',right:13,bottom:Math.max(insets.bottom,10)+75,backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,paddingVertical:4,shadowColor:'#33446A',shadowOpacity:0.19,shadowRadius:18,elevation:13}}>
 <Pressable onPress={()=>go('add-job')} style={{flexDirection:'row',alignItems:'center',gap:9,padding:13}}><Icon name="briefcase-outline" size={21}/><Txt bold>Add Job</Txt></Pressable>
 <View style={{height:1,backgroundColor:C.line,marginHorizontal:11}}/>
 <Pressable onPress={()=>openChat()} style={{flexDirection:'row',alignItems:'center',gap:9,padding:13}}><Icon name="chatbubble-ellipses-outline" size={21}/><Txt bold>Ask Brief</Txt></Pressable>
 </View> : <View style={{position:'absolute',right:12,top:Math.max(insets.top+46,86),width:205,padding:9,backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,elevation:9,shadowOpacity:.12,shadowRadius:12,shadowColor:'#33446A'}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,paddingHorizontal:7}}><View style={{width:35,height:35,borderRadius:18,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name="person" color={C.blue}/></View><Txt bold>{profile.name||'Your account'}</Txt></View>
 {([{name:'Resume',icon:'document-text-outline',page:'resume'},{name:'Notifications',icon:'notifications-outline',page:'notifications'},{name:'Settings',icon:'settings-outline',page:'settings'}] as const).map(r=><Pressable onPress={()=>go(r.page)} key={r.page} style={{paddingVertical:12,paddingHorizontal:9,flexDirection:'row',gap:12,alignItems:'center',borderTopWidth:1,borderTopColor:C.line}}><Icon name={r.icon} color={C.ink}/><View style={{flex:1}}><Txt bold size={13}>{r.name}</Txt></View><Icon name="chevron-forward" color={C.muted} size={15}/></Pressable>)}
 </View>}
 </View>;
}
