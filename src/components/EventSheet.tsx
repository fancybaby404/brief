import React,{useEffect,useState} from 'react';
import {Alert,Linking,Platform,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import {C} from '../theme/tokens';
import {Icon,Tap,Txt} from './Ui';
import {FormLabel,FormSheet} from './FormSheet';
import {useBrief,type Toast} from '../lib/appContext';
import {uid} from '../lib/db';
import {formatTime} from '../lib/time';
import {allowReminders,type ReminderResult} from '../lib/reminders';
import {EVENT_KINDS,REMINDERS,findDuplicate,kindOf,reminderAt,suggestTitle,toLocalIso} from '../lib/events';
import type {Application,Event,EventKind} from '../types';

export type EventDraft={applicationId:string|null,kind:EventKind,date:Date,title?:string,location?:string,notes?:string};
const input={backgroundColor:C.pale2,color:C.ink,borderRadius:12,paddingHorizontal:12,paddingVertical:11,fontSize:16,minHeight:46} as const;
const chip=(on:boolean)=>({flexDirection:'row' as const,alignItems:'center' as const,gap:6,minHeight:38,paddingHorizontal:13,borderRadius:19,backgroundColor:on?C.blue:C.pale2});
const RESULT_NOTE:Partial<Record<ReminderResult,string>>={blocked:'reminder is off — notifications are disabled',passed:'reminder time has already passed',failed:'the reminder couldn’t be set'};

/** One editor for every calendar event: new (from a job or a calendar day), view/edit, and delete.
 *  `event` = edit that event; otherwise `draft` seeds a new one. `toastAction` lets the caller offer a follow-up. */
export function EventSheet({visible,onClose,event,draft,toastAction,onSaved}:{visible:boolean,onClose:()=>void,event?:Event|null,draft?:EventDraft|null,toastAction?:(e:Event,isNew:boolean)=>Toast['action']|undefined,onSaved?:(e:Event,result:ReminderResult)=>void}){
 const {applications,events,putEvent,removeEvent,showToast,timeFormat}=useBrief();
 const isNew=!event;const applicationId=event?event.applicationId:draft?.applicationId??null;
 const job:Application|null=applications.find(a=>a.id===applicationId)||null;
 const [kind,setKind]=useState<EventKind>('other'),[title,setTitle]=useState(''),[titleEdited,setTitleEdited]=useState(false),[date,setDate]=useState(new Date());
 const [location,setLocation]=useState(''),[notes,setNotes]=useState(''),[reminder,setReminder]=useState<number|null>(null),[reminderBlocked,setReminderBlocked]=useState(false),[saving,setSaving]=useState(false);
 useEffect(()=>{if(!visible)return;
  const k=event?kindOf(event):draft?.kind??'other';setKind(k);
  setTitle(event?.title??draft?.title??suggestTitle(k,job));setTitleEdited(!!event||!!draft?.title);
  setDate(event?new Date(event.date):draft?.date??new Date());
  setLocation(event?.location??draft?.location??'');setNotes(event?.notes??draft?.notes??'');setReminder(event?.reminderMinutes??null);setReminderBlocked(false);setSaving(false);
 },[visible,event?.id]);
 function pickKind(k:EventKind){if(k===kind)return;void Haptics.selectionAsync();setKind(k);if(!titleEdited)setTitle(suggestTitle(k,job));}
 async function pickReminder(m:number|null){void Haptics.selectionAsync();setReminderBlocked(false);
  if(m!=null&&!(await allowReminders())){setReminder(null);setReminderBlocked(true);return;}
  setReminder(m);}
 // Android shows date and time as two native dialogs; iOS uses inline compact pickers.
 const merge=(d:Date,part:'date'|'time')=>{const n=new Date(date);if(part==='date')n.setFullYear(d.getFullYear(),d.getMonth(),d.getDate());else n.setHours(d.getHours(),d.getMinutes(),0,0);setDate(n);};
 const openAndroid=(mode:'date'|'time')=>DateTimePickerAndroid.open({value:date,mode,is24Hour:timeFormat==='24h',onValueChange:(_e,d)=>merge(d,mode)});
 async function save(){if(saving||!title.trim())return;
  const e:Event={id:event?.id||uid('event'),applicationId,title:title.trim(),date:toLocalIso(date),notes:notes.trim(),kind,location:location.trim()||undefined,reminderMinutes:reminder,createdAt:event?.createdAt||new Date().toISOString(),notificationId:event?.notificationId};
  const dup=findDuplicate(events,e);
  if(dup)return Alert.alert('Already on your calendar',`“${dup.title}” is already scheduled for this time.`);
  setSaving(true);
  try{const result=await putEvent(e);void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);onClose();onSaved?.(e,result);
   const note=RESULT_NOTE[result];showToast((isNew?'Added to Calendar':'Event updated')+(note?` · ${note}`:''),toastAction?.(e,isNew));}
  catch(err){setSaving(false);Alert.alert('Couldn’t save this event',(err as Error).message);}}
 function remove(){if(!event)return;Alert.alert('Delete event?',`“${event.title}” will be removed from your calendar.`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void removeEvent(event.id).then(()=>{onClose();showToast('Event deleted');}).catch(err=>Alert.alert('Couldn’t delete this event',(err as Error).message))}]);}
 const dateText=date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:date.getFullYear()!==new Date().getFullYear()?'numeric':undefined});
 const reminderPassed=reminder!=null&&!reminderAt({date:toLocalIso(date),reminderMinutes:reminder});
 const row={flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:50,paddingHorizontal:14} as const;
 return <FormSheet visible={visible} onClose={onClose} title={isNew?'New event':'Edit event'} doneLabel={isNew?'Add':'Save'} onDone={()=>void save()} doneDisabled={saving||!title.trim()}
  footer={!isNew&&<Tap accessibilityRole="button" onPress={remove} style={{marginTop:28,minHeight:50,borderRadius:14,backgroundColor:C.redSoft,alignItems:'center',justifyContent:'center'}}><Txt size={16} bold color={C.danger}>Delete event</Txt></Tap>}>
  {!!job&&<View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}><Icon name="briefcase-outline" size={16} color={C.muted}/><Txt size={13} color={C.muted} numberOfLines={1} style={{flex:1}}>{job.title} · {job.company}</Txt></View>}
  <FormLabel>TYPE</FormLabel>
  <View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{EVENT_KINDS.map(k=><Tap key={k.value} accessibilityRole="radio" accessibilityState={{selected:k.value===kind}} onPress={()=>pickKind(k.value)} style={chip(k.value===kind)}><Icon name={k.icon} size={16} color={k.value===kind?C.white:C.ink}/><Txt size={14} color={k.value===kind?C.white:C.ink} bold={k.value===kind}>{k.label}</Txt></Tap>)}</View>
  <FormLabel>TITLE</FormLabel>
  <TextInput accessibilityLabel="Event title" value={title} onChangeText={t=>{setTitle(t);setTitleEdited(true);}} placeholder="e.g. Interview with Acme" placeholderTextColor={C.soft} returnKeyType="done" style={input}/>
  <FormLabel>WHEN</FormLabel>
  <View style={{backgroundColor:C.pale2,borderRadius:12}}>
   {Platform.OS==='ios'
    ?<><View style={row}><Txt size={16}>Date</Txt><DateTimePicker accessibilityLabel="Event date" value={date} mode="date" display="compact" accentColor={C.blue} themeVariant="light" onValueChange={(_e,d)=>merge(d,'date')}/></View>
     <View style={{height:1,backgroundColor:C.line,marginLeft:14}}/>
     <View style={row}><Txt size={16}>Time</Txt><DateTimePicker accessibilityLabel="Event time" value={date} mode="time" display="compact" accentColor={C.blue} themeVariant="light" onValueChange={(_e,d)=>merge(d,'time')}/></View></>
    :<><Tap accessibilityRole="button" accessibilityLabel={`Date, ${dateText}`} onPress={()=>openAndroid('date')} style={row}><Txt size={16}>Date</Txt><Txt size={16} color={C.blue}>{dateText}</Txt></Tap>
     <View style={{height:1,backgroundColor:C.line,marginLeft:14}}/>
     <Tap accessibilityRole="button" accessibilityLabel={`Time, ${formatTime(date,timeFormat)}`} onPress={()=>openAndroid('time')} style={row}><Txt size={16}>Time</Txt><Txt size={16} color={C.blue}>{formatTime(date,timeFormat)}</Txt></Tap></>}
  </View>
  <FormLabel>LOCATION OR MEETING LINK</FormLabel>
  <TextInput accessibilityLabel="Location or meeting link" value={location} onChangeText={setLocation} placeholder="Optional · office address or video link" placeholderTextColor={C.soft} autoCapitalize="none" autoCorrect={false} style={input}/>
  <FormLabel>REMINDER</FormLabel>
  <View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{REMINDERS.map(r=>{const on=r.value===reminder;return <Tap key={String(r.value)} accessibilityRole="radio" accessibilityState={{selected:on}} onPress={()=>void pickReminder(r.value)} style={chip(on)}><Txt size={14} color={on?C.white:C.ink} bold={on}>{r.label}</Txt></Tap>;})}</View>
  {reminderBlocked&&<Tap accessibilityRole="button" onPress={()=>void Linking.openSettings()} style={{marginTop:10}}><Txt size={13} color={C.muted}>Notifications are off for Brief. <Txt size={13} bold color={C.blue}>Open Settings</Txt></Txt></Tap>}
  {reminderPassed&&<Txt size={13} color={C.muted} style={{marginTop:10}}>That reminder time has already passed, so none will be set.</Txt>}
  {reminder!=null&&!reminderPassed&&<Txt size={13} color={C.muted} style={{marginTop:10}}>A notification on this phone. Your notes aren’t shown on the lock screen.</Txt>}
  <FormLabel>NOTES</FormLabel>
  <TextInput accessibilityLabel="Event notes" value={notes} onChangeText={setNotes} placeholder="Optional · who you’re meeting, what to bring" placeholderTextColor={C.soft} multiline style={[input,{minHeight:96,textAlignVertical:'top',paddingTop:11}]}/>
 </FormSheet>;
}
