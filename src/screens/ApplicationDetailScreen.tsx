import React,{useState} from 'react';
import {Alert,Linking,ScrollView,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,CompanyLogo,Field,Heading,Icon,Primary,StatusPill,Txt,Tap} from '../components/Ui';
import type {ApplicationStatus} from '../types';
import {Description} from '../components/Description';
export function ApplicationDetailScreen(){const {selectedApp,applications,putApp,removeApp,openChat,openMock}=useBrief();const live=applications.find(a=>a.id===selectedApp?.id)||selectedApp;
 const [editing,setEditing]=useState(false),[notes,setNotes]=useState(live?.notes||'');if(!live)return <Txt>Select an application.</Txt>;
 const status=async(s:ApplicationStatus)=>{await putApp({...live,status:s,appliedAt:s==='applied'?live.appliedAt||new Date().toISOString():live.appliedAt});}
 return <ScrollView contentContainerStyle={{paddingHorizontal:19,paddingBottom:130,gap:16}}>
 <View style={{gap:6}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo uri={live.logoUrl} size={44}/><Txt size={16} bold style={{flex:1}}>{live.company}</Txt></View><Heading>{live.title}</Heading><StatusPill status={live.status}/><Txt color={C.muted} size={12}>{live.location} · {live.salary||'Salary not listed'}</Txt></View>
 <Card><Txt bold>Application status</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:12}}>{(['saved','interested','applied','under_review','interview','offer','rejected'] as const).map(s=><Tap key={s} onPress={()=>void status(s)} style={{paddingHorizontal:10,paddingVertical:9,backgroundColor:live.status===s?C.blue:C.pale,borderRadius:15}}><Txt size={11} color={live.status===s?C.white:C.blue}>{s.replace('_',' ')}</Txt></Tap>)}</View></Card>
 <Card><Txt bold size={16}>AI assistance</Txt><View style={{marginTop:12,gap:9}}><Primary label="Ask Brief about this role" secondary onPress={()=>openChat(live)}/><Primary label="Practice mock interview" secondary onPress={()=>openMock(live)}/></View></Card>
 <Card style={{padding:16}}><Txt bold size={17} style={{marginBottom:12}}>Job description</Txt><Description key={live.id} text={live.description} empty="No description saved. Add one to improve your local AI answers."/></Card>
 {!!live.sourceUrl&&<Primary label="Open original listing ↗" secondary onPress={()=>void Linking.openURL(live.sourceUrl)}/>}
 <Card><View style={{flexDirection:'row',justifyContent:'space-between'}}><Txt bold>Private notes</Txt><Tap onPress={()=>setEditing(!editing)}><Txt color={C.blue}>Edit</Txt></Tap></View>{editing?<><Field label="Interview notes, follow-ups or observations" value={notes} onChangeText={setNotes} multiline/><Primary label="Save notes" onPress={()=>{void putApp({...live,notes});setEditing(false)}}/></>:<Txt color={C.muted} style={{marginTop:8}}>{live.notes||'No notes yet.'}</Txt>}</Card>
 <Tap onPress={()=>Alert.alert('Delete application?','This permanently deletes the saved entry.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void removeApp(live.id)}])} style={{paddingVertical:15,alignItems:'center'}}><Txt color={C.danger}>Delete application</Txt></Tap>
 </ScrollView>;
}
