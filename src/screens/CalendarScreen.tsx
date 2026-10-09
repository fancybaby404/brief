import React,{useMemo,useState} from 'react';import {Alert,ScrollView,View} from 'react-native';
import Reanimated,{FadeIn,FadeInLeft,FadeInRight,LayoutAnimationConfig} from 'react-native-reanimated';
import {Directions,Gesture,GestureDetector} from 'react-native-gesture-handler';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';import {Card,Heading,Icon,SectionTitle,Txt,Tap,useReducedMotion,useFloatingNavClearance} from '../components/Ui';import {EmptyState} from '../components/States';
import {EventSheet,type EventDraft} from '../components/EventSheet';
import {kindInfo,kindOf} from '../lib/events';
import type {Event} from '../types';
import {EASE_OUT,EASE_OUT_CSS,LIST_REFLOW,ROW_IN,ROW_OUT} from '../theme/motion';
import {formatTime} from '../lib/time';

// The new month arrives from the side you moved toward; a fade only with Reduce Motion.
const MONTH_NEXT=FadeInRight.duration(220).easing(EASE_OUT),MONTH_PREV=FadeInLeft.duration(220).easing(EASE_OUT),MONTH_FADE=FadeIn.duration(150).easing(EASE_OUT);
const pad=(n:number)=>String(n).padStart(2,'0');

export function CalendarScreen(){const {events,applications,removeEvent,timeFormat}=useBrief();const reduce=useReducedMotion();const bottomClearance=useFloatingNavClearance();
 const today=new Date();
 const [month,setMonth]=useState(today.getMonth()),[year,setYear]=useState(today.getFullYear()),[day,setDay]=useState(today.getDate()),[dir,setDir]=useState(0);
 // One shared editor (EventSheet) for new and existing events; kept after closing so it doesn't change mode mid-dismiss.
 const [sheet,setSheet]=useState<{open:boolean,event?:Event,draft?:EventDraft}>({open:false});
 const addEvent=()=>setSheet({open:true,draft:{applicationId:null,kind:'other',date:new Date(year,month,day,10,0)}});
 const first=new Date(year,month,1).getDay(),length=new Date(year,month+1,0).getDate();const cells=[...Array(first).fill(0),...Array.from({length},(_,i)=>i+1)];
 const monthLabel=new Date(year,month,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const isThisMonth=year===today.getFullYear()&&month===today.getMonth();
 const todayKey=today.toISOString().slice(0,10);
 const upcoming=useMemo(()=>events.filter(e=>e.date.slice(0,10)>=todayKey).sort((a,b)=>a.date.localeCompare(b.date)),[events,todayKey]);
 const marked=useMemo(()=>new Set(events.map(e=>e.date.slice(0,10))),[events]);
 function move(delta:number){const d=new Date(year,month+delta,1);setDir(delta);setYear(d.getFullYear());setMonth(d.getMonth());setDay(1);}
 function goToday(){setDir(year*12+month>today.getFullYear()*12+today.getMonth()?-1:1);setYear(today.getFullYear());setMonth(today.getMonth());setDay(today.getDate());}
 // Swipe the grid to change month. Callbacks run on the RN runtime: they only set state once per fling.
 const swipe=useMemo(()=>Gesture.Race(
  Gesture.Fling().direction(Directions.LEFT).runOnJS(true).onEnd(()=>move(1)),
  Gesture.Fling().direction(Directions.RIGHT).runOnJS(true).onEnd(()=>move(-1)),
 ),[year,month]);
 const entering=reduce?MONTH_FADE:dir>0?MONTH_NEXT:dir<0?MONTH_PREV:MONTH_FADE;
 return <LayoutAnimationConfig skipEntering><ScrollView contentContainerStyle={{padding:18,paddingBottom:bottomClearance,gap:15}}><Heading>Calendar</Heading><Txt color={C.muted}>Stay on top of interviews, follow-ups, and deadlines.</Txt>
 <Card style={{overflow:'hidden'}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
   <Tap accessibilityRole="button" accessibilityLabel="Previous month" onPress={()=>move(-1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="chevron-back" color={C.blue}/></Tap>
   <View style={{alignItems:'center',gap:4}}><View accessible accessibilityRole="header"><Txt bold>{monthLabel}</Txt></View>{!isThisMonth&&<Tap accessibilityRole="button" onPress={goToday} hitSlop={10} style={{paddingHorizontal:10,paddingVertical:3,borderRadius:10,backgroundColor:C.pale}}><Txt size={11} bold color={C.blue}>Today</Txt></Tap>}</View>
   <Tap accessibilityRole="button" accessibilityLabel="Next month" onPress={()=>move(1)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="chevron-forward" color={C.blue}/></Tap>
  </View>
  <View style={{flexDirection:'row'}}>{['S','M','T','W','T','F','S'].map((d,i)=><View key={i} style={{width:'14.285%',alignItems:'center',paddingVertical:6}}><Txt size={11} color={C.muted}>{d}</Txt></View>)}</View>
  <GestureDetector gesture={swipe}>
  <Reanimated.View key={`${year}-${month}`} entering={entering} style={{flexDirection:'row',flexWrap:'wrap'}}>
  {cells.map((n,i)=>{const key=`${year}-${pad(month+1)}-${pad(n)}`,on=n===day,isToday=key===todayKey;
   return <Tap disabled={!n} accessibilityRole="button" accessibilityLabel={n?`${monthLabel.split(' ')[0]} ${n}${marked.has(key)?', has events':''}`:undefined} accessibilityState={{selected:on}} onPress={()=>n&&setDay(n)} key={i} style={{width:'14.285%',height:42,alignItems:'center',justifyContent:'center'}}>
    <Reanimated.View style={{height:34,width:34,backgroundColor:on?C.blue:'transparent',borderRadius:17,justifyContent:'center',alignItems:'center',transitionProperty:'backgroundColor',transitionDuration:reduce?0:150,transitionTimingFunction:EASE_OUT_CSS}}>
     <Txt color={on?C.white:isToday?C.blue:n?C.ink:C.soft} bold={on||isToday} size={13}>{n||''}</Txt>
     {n>0&&marked.has(key)&&<View style={{position:'absolute',bottom:4,backgroundColor:on?C.white:C.blue,width:4,height:4,borderRadius:2}}/>}
    </Reanimated.View></Tap>;})}
  </Reanimated.View>
  </GestureDetector>
 </Card>
 <SectionTitle right="Add event" onRight={addEvent}>Upcoming events</SectionTitle>
 {upcoming.length===0&&<EmptyState card compact title="Nothing scheduled" body="Add interviews, follow-ups and deadlines so nothing sneaks up on you." action={{label:'Add event',onPress:addEvent}}/>}
 {upcoming.map(e=><Reanimated.View key={e.id} layout={LIST_REFLOW} entering={ROW_IN} exiting={ROW_OUT}><Tap accessibilityRole="button" accessibilityHint="Opens the event. Long press to delete" onPress={()=>setSheet({open:true,event:e})} onLongPress={()=>Alert.alert('Delete event?',e.title,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void removeEvent(e.id)}])} style={{flexDirection:'row',gap:12,alignItems:'center',borderRadius:17,backgroundColor:C.white,padding:13,borderWidth:1,borderColor:C.line}}><View style={{width:45,alignItems:'center'}}><Txt size={10} color={C.blue}>{new Date(e.date).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</Txt><Txt size={23} bold>{new Date(e.date).getDate()}</Txt></View><View style={{flex:1}}><Txt bold>{e.title}</Txt><Txt color={C.muted} size={12}>{[kindInfo(kindOf(e)).label,applications.find(a=>a.id===e.applicationId)?.company,new Date(e.date).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+' · '+formatTime(e.date,timeFormat)].filter(Boolean).join(' · ')}</Txt>{!!e.notes&&<Txt color={C.muted} size={11}>{e.notes}</Txt>}</View><Icon name="chevron-forward" size={16} color={C.soft}/></Tap></Reanimated.View>)}
 </ScrollView>
 <EventSheet visible={sheet.open} event={sheet.event} draft={sheet.draft} onClose={()=>setSheet(s=>({...s,open:false}))}/>
 </LayoutAnimationConfig>;
}
