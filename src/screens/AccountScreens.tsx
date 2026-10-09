import React,{useState} from 'react';
import {Alert,ScrollView,Switch,View} from 'react-native';
import {useBrief} from '../lib/appContext';
import {C} from '../theme/tokens';
import {Card,Heading,Icon,Txt,Tap,useFloatingNavClearance} from '../components/Ui';
import {deleteLocalFile,importResume} from '../lib/imports';
import {extractResume,MODEL_MISSING} from '../lib/ai';
import * as Sharing from 'expo-sharing';
import {EmptyState} from '../components/States';
import {ProfileForm} from '../components/ProfileForm';
import Reanimated,{LayoutAnimationConfig} from 'react-native-reanimated';
import {ROW_IN,ROW_OUT} from '../theme/motion';
import {listItems} from '../lib/profile';
import {reminderAt,reminderLabel} from '../lib/events';
import {formatTime} from '../lib/time';

export function ResumeScreen({withinSettings=false,onOpenBriefAi}:{withinSettings?:boolean,onOpenBriefAi?:()=>void}){const {profile,updateProfile,go}=useBrief();const bottomClearance=useFloatingNavClearance();const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false);
 async function attach(){setBusy(true);let importedUri='';try{
  const r=await importResume();if(!r)return;importedUri=r.resumeUri;
  let note=r.note,details:Awaited<ReturnType<typeof extractResume>>|null=null,needsModel=false;
  if(r.resumeText){try{const parsed=await extractResume(r.resumeText);if(parsed.isResume)details=parsed;else note='The resume is saved, but Brief couldn’t identify profile details in its text. You can enter them manually.';}
   catch(error){needsModel=(error as Error).message===MODEL_MISSING;note=needsModel?'The resume is saved and readable. Install the local model in Settings to extract profile details.':'The resume is saved and readable, but Brief couldn’t extract its profile details. You can enter them manually.';}}
  const next={...profile,resumeUri:r.resumeUri,resumeText:r.resumeText,useResumeForAI:true};
  if(details){next.name=details.name||profile.name;next.skills=details.skills||profile.skills;next.experience=details.experience||profile.experience;next.education=details.education||profile.education;next.goals=details.goals||profile.goals;}
  try{await updateProfile(next);}catch(error){await deleteLocalFile(r.resumeUri).catch(()=>{});throw error;}
  if(profile.resumeUri&&profile.resumeUri!==r.resumeUri)void deleteLocalFile(profile.resumeUri).catch(()=>{});
  if(details)setEditing(true);
   else if(note)Alert.alert('Resume saved',note,[{text:'Later',style:'cancel'},{text:'Enter details',onPress:()=>setEditing(true)},...(needsModel?[{text:'Settings',onPress:()=>withinSettings?onOpenBriefAi?.():go('settings')}]:[])]);
 }catch(e){if(importedUri&&importedUri!==profile.resumeUri)await deleteLocalFile(importedUri).catch(()=>{});Alert.alert('Couldn’t add resume',(e as Error).message);}finally{setBusy(false);}}
 async function openResume(){if(!profile.resumeUri)return;try{await Sharing.shareAsync(profile.resumeUri);}catch(e){Alert.alert('Can’t open the file',(e as Error).message);}}
 const remove=()=>Alert.alert('Remove resume?','The file and its extracted text are deleted from this phone. Your typed summary stays.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void deleteLocalFile(profile.resumeUri).then(()=>updateProfile({...profile,resumeUri:'',resumeText:''}))}]);
 const rows=[{icon:'briefcase-outline',text:profile.experience,empty:'Add your experience'},{icon:'school-outline',text:profile.education,empty:'Add your education'},{icon:'list-outline',text:profile.skills,empty:'Add your skills'},{icon:'flag-outline',text:profile.goals,empty:'Add the role you’re aiming for'}];
 return <LayoutAnimationConfig skipEntering><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:withinSettings?28:bottomClearance,gap:15}}>{!withinSettings&&<Heading>Resume</Heading>}
 {profile.resumeUri?<Reanimated.View key={profile.resumeUri} entering={ROW_IN} exiting={ROW_OUT} style={{gap:15}}>
  <Tap accessibilityRole="button" accessibilityLabel="Open your resume file" onPress={()=>void openResume()} style={{height:300,borderRadius:20,backgroundColor:C.pale2,borderColor:C.line,borderWidth:1,padding:17,alignItems:'center',justifyContent:'center'}}>
   <View style={{width:'88%',height:'96%',backgroundColor:C.white,borderRadius:6,padding:18,shadowColor:'#142742',shadowOpacity:0.09,shadowRadius:12,elevation:3,gap:9}}>
    <Txt size={19} bold numberOfLines={1}>{profile.name||'Your name'}</Txt><Txt size={12} color={C.blue} numberOfLines={1}>{listItems(profile.goals,1)[0]||'Career profile'}</Txt><View style={{height:1,backgroundColor:C.line}}/>
    {([['EXPERIENCE',profile.experience||profile.resumeText.slice(0,160)],['EDUCATION',profile.education],['SKILLS',profile.skills]] as const).map(([h,t])=><View key={h} style={{gap:3}}><Txt bold size={10}>{h}</Txt><Txt size={11} color={C.muted} numberOfLines={3}>{t||'—'}</Txt></View>)}
   </View>
  </Tap>
  <View style={{flexDirection:'row',gap:8}}>
   {([['eye-outline','View',()=>void openResume(),C.blue],['cloud-upload-outline',busy?'Adding…':'Replace',()=>void attach(),C.blue],['trash-outline','Remove',remove,C.danger]] as const).map(([icon,label,onPress,color])=>
    <Tap key={label} accessibilityRole="button" disabled={busy} onPress={onPress} style={{flex:1,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:13,backgroundColor:color===C.danger?C.redSoft:C.pale}}><Icon name={icon} size={17} color={color}/><Txt bold size={13} color={color}>{label}</Txt></Tap>)}
  </View></Reanimated.View>
 :<Reanimated.View key="empty" entering={ROW_IN} exiting={ROW_OUT} style={{borderRadius:20,backgroundColor:C.pale2,borderColor:C.line,borderWidth:1}}>
  <EmptyState mood="question" title="No resume yet" body="Add a PDF, DOCX, or resume image. It stays on this phone and helps Brief tailor advice and mock interviews." action={{label:busy?'Adding…':'Upload resume',icon:'cloud-upload-outline',onPress:()=>void attach()}} secondary={{label:'Enter details instead',onPress:()=>setEditing(true)}}/>
 </Reanimated.View>}
 <Card><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><Txt bold size={17}>Resume summary</Txt><Tap accessibilityRole="button" hitSlop={10} onPress={()=>setEditing(true)}><Txt color={C.blue} bold>Edit</Txt></Tap></View>
  <View style={{gap:12}}>{rows.map(x=><Tap key={x.icon} accessibilityRole="button" onPress={()=>setEditing(true)} style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}><Icon name={x.icon} color={x.text?C.ink:C.soft}/><View style={{flex:1}}><Txt size={13} color={x.text?C.ink:C.muted}>{x.text||x.empty}</Txt></View></Tap>)}</View>
 </Card>
 <Card><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}><View style={{flex:1}}><Txt bold>Use imported resume in Brief AI</Txt><Txt color={C.muted} size={11}>Only on this device. You can switch this off anytime.</Txt></View><Switch accessibilityLabel="Use imported resume in Brief AI" value={profile.useResumeForAI} onValueChange={x=>void updateProfile({...profile,useResumeForAI:x}).catch(error=>Alert.alert('Couldn’t update resume setting',(error as Error).message))} trackColor={{true:C.blue,false:C.line}}/></View></Card>
 <Txt color={C.muted} size={11}>The preview is a summary, not a rendered PDF; View opens the file with your phone’s viewer. Digital PDF text and resume images can be read on this phone. For scanned PDFs and DOCX, enter your details manually.</Txt>
 <ProfileForm visible={editing} profile={profile} onClose={()=>setEditing(false)} onSave={async d=>{try{await updateProfile({...profile,...d});setEditing(false);}catch(error){Alert.alert('Couldn’t save profile',(error as Error).message);}}}/>
 </ScrollView></LayoutAnimationConfig>;
}

/** Reusable content for the profile-menu page and the Settings stack. */
export function NotificationsContent(){const {goTab,events,timeFormat}=useBrief();
 const now=Date.now(),list=events.filter(e=>e.notificationId&&reminderAt(e,now)).sort((a,b)=>a.date.localeCompare(b.date));
 return <View style={{gap:15}}>
  {list.length?<><Txt color={C.muted}>Reminders scheduled on this phone. Change one from its event in Calendar.</Txt>
   {list.map(e=><View key={e.id} style={{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.white,borderRadius:16,padding:14}}><Icon name="notifications-outline" color={C.blue}/><View style={{flex:1}}><Txt bold numberOfLines={2}>{e.title}</Txt><Txt size={12} color={C.muted}>{reminderLabel(e.reminderMinutes)} · {new Date(e.date).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})} {formatTime(e.date,timeFormat)}</Txt></View></View>)}</>
   :<EmptyState title="No reminders yet" body="Add a reminder when you schedule an interview, deadline or follow-up, and it will appear here." action={{label:'Open Calendar',onPress:()=>goTab('calendar')}}/>}
 </View>;
}

/** Scheduled reminders actually set on this phone. */
export function NotificationsScreen(){const bottomClearance=useFloatingNavClearance();return <ScrollView contentContainerStyle={{padding:18,paddingBottom:bottomClearance,gap:15}}><Heading>Notifications</Heading><NotificationsContent/></ScrollView>}
