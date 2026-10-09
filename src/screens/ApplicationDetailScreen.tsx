import React,{useMemo,useState} from 'react';
import {Alert,Linking,Share,View} from 'react-native';
import Reanimated,{Extrapolation,interpolate,useAnimatedScrollHandler,useAnimatedStyle,useSharedValue} from 'react-native-reanimated';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {ActionMenu,CompanyLogo,Heading,Icon,Mascot,Primary,SectionTitle,Tap,Txt,statusStyle,type MenuAction} from '../components/Ui';
import {JobDescription} from '../components/Description';
import {StatusSheet} from '../components/StatusSheet';
import {NotesSheet} from '../components/NotesSheet';
import {EventSheet,type EventDraft} from '../components/EventSheet';
import {EmptyState} from '../components/States';
import {STATUS_LABEL,buildActivity,isClosed,nextActions,statusSince,type ActivityItem,type NextAction} from '../lib/tracker';
import {defaultKind,kindInfo,kindOf,upcomingFor} from '../lib/events';
import {formatTime} from '../lib/time';
import type {ApplicationStatus,Event,EventKind} from '../types';

const BAR=52;
const day=(iso:string)=>{const d=new Date(iso),t=new Date();const diff=Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime()-new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime())/86400000);
 return diff===0?'Today':diff===1?'Yesterday':diff===-1?'Tomorrow':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:d.getFullYear()!==t.getFullYear()?'numeric':undefined});};
/** Same, mid-sentence: "since today", "scheduled for Oct 14". */
const dayInline=(iso:string)=>{const s=day(iso);return /^(Today|Yesterday|Tomorrow)$/.test(s)?s.toLowerCase():s;};
const tomorrowAt10=()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);return d;};
const STATUS_ICON:Record<ApplicationStatus,string>={interested:'bookmark-outline',applied:'paper-plane-outline',under_review:'eye-outline',interview:'people-outline',offer:'trophy-outline',rejected:'close-circle-outline',withdrawn:'arrow-undo-outline'};

/** Plain grouped rows: one white surface, hairline dividers, no nested cards. */
function Group({children}:{children:React.ReactNode}){const items=React.Children.toArray(children).filter(Boolean);
 return <View style={{backgroundColor:C.white,borderRadius:16,overflow:'hidden'}}>{items.map((c,i)=><View key={i}>{i>0&&<View style={{height:1,backgroundColor:C.line,marginLeft:62}}/>}{c}</View>)}</View>;}
function Row({icon,label,detail,onPress,external=false}:{icon:string,label:string,detail?:string,onPress:()=>void,external?:boolean}){
 return <Tap accessibilityRole={external?'link':'button'} accessibilityLabel={detail?`${label}. ${detail}`:label} onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:56,paddingVertical:8,paddingHorizontal:14}}>
  <View style={{width:36,height:36,borderRadius:18,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name={icon} size={18} color={C.blue}/></View>
  <View style={{flex:1}}><Txt size={16}>{label}</Txt>{!!detail&&<Txt size={13} color={C.muted} numberOfLines={2}>{detail}</Txt>}</View>
  <Icon name={external?'open-outline':'chevron-forward'} size={16} color={C.soft}/>
 </Tap>;}

export function ApplicationDetailScreen(){
 const {selectedApp,applications,events,putApp,removeApp,openChat,openMock,money,back,showToast,timeFormat}=useBrief();
 const live=applications.find(a=>a.id===selectedApp?.id)||null;
 const [statusOpen,setStatusOpen]=useState(false),[notesOpen,setNotesOpen]=useState(false),[allActivity,setAllActivity]=useState(false);
 // Kept after closing so the sheet doesn't switch modes while it slides away.
 const [sheet,setSheet]=useState<{open:boolean,event?:Event,draft?:EventDraft}>({open:false});
 const closeSheet=()=>setSheet(s=>({...s,open:false}));
 // The compact title fades into the bar once the large title scrolls under it (iOS large-title behaviour).
 const scrollY=useSharedValue(0),titleBottom=useSharedValue(120);
 const onScroll=useAnimatedScrollHandler(e=>{scrollY.set(e.contentOffset.y);});
 const barTitle=useAnimatedStyle(()=>({opacity:interpolate(scrollY.get(),[titleBottom.get()-28,titleBottom.get()],[0,1],Extrapolation.CLAMP)}));
 const hairline=useAnimatedStyle(()=>({opacity:interpolate(scrollY.get(),[0,12],[0,1],Extrapolation.CLAMP)}));
 const upcoming=useMemo(()=>live?upcomingFor(events,live.id):[],[events,live?.id]);
 const activity=useMemo(()=>live?buildActivity(live,events):[],[live,events]);

 const bar=(menu?:React.ReactNode,title?:string)=><View style={{height:BAR,flexDirection:'row',alignItems:'center',paddingHorizontal:8}}>
  <Tap accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{width:44,height:44,justifyContent:'center',paddingLeft:4}}><Icon name="chevron-back" size={26}/></Tap>
  <Reanimated.View style={[{flex:1,alignItems:'center'},barTitle]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden><Txt bold size={16} numberOfLines={1}>{title}</Txt></Reanimated.View>
  <View style={{width:44}}>{menu}</View>
  <Reanimated.View style={[{position:'absolute',left:0,right:0,bottom:0,height:1,backgroundColor:C.line},hairline]}/>
 </View>;
 if(!live)return <View style={{flex:1}}>{bar()}<View style={{flex:1,justifyContent:'center',padding:20}}><EmptyState mood="question" title="This job isn’t here anymore" body="It may have been deleted. Your other saved jobs are safe." action={{label:'Go back',onPress:back}}/></View></View>;

 const a=live,closed=isClosed(a.status),st=statusStyle(a.status),salary=money(a);
 const hasInterview=upcoming.some(e=>kindOf(e)==='interview');
 const actions=nextActions(a.status,{hasPosting:!!a.sourceUrl,hasInterview});
 const fail=(e:unknown)=>Alert.alert('Couldn’t save the change',(e as Error).message);
 const openPosting=()=>void Linking.openURL(a.sourceUrl).catch(()=>Alert.alert('Couldn’t open the posting','Check the link or your connection and try again.'));
 const schedule=(kind:EventKind,title?:string)=>setSheet({open:true,draft:{applicationId:a.id,kind,date:tomorrowAt10(),title}});
 async function setStatus(s:ApplicationStatus){
  try{await putApp({...a,status:s});
   if(s==='interview'&&!hasInterview)showToast('Moved to Interview',{label:'Schedule it',onPress:()=>schedule('interview')});}
  catch(e){fail(e);}}
 // A new interview can move the job forward, but only if the user says so.
 const interviewToast=(e:Event,isNew:boolean)=>isNew&&kindOf(e)==='interview'&&['interested','applied','under_review'].includes(a.status)
  ?{label:'Move to Interview',onPress:()=>void putApp({...a,status:'interview'}).catch(fail)}:undefined;
 const confirmDelete=()=>{const n=events.filter(e=>e.applicationId===a.id).length;
  Alert.alert('Delete this job?',`Its notes and activity${n?` and ${n} calendar event${n>1?'s':''}`:''} will be removed from this phone.`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void removeApp(a.id).catch(fail)}]);};
 const menu:MenuAction[]=[
  ...(a.sourceUrl?[{label:'Open original posting',icon:'open-outline',onPress:openPosting}]:[]),
  {label:'Share job',icon:'share-outline',onPress:()=>void Share.share({message:[`${a.title} at ${a.company}`,a.sourceUrl].filter(Boolean).join('\n')}).catch(()=>{})},
  {label:'Delete job',icon:'trash-outline',destructive:true,onPress:confirmDelete},
 ];
 const ROW:Record<Exclude<NextAction,'mark_applied'|'schedule_interview'>,{icon:string,label:string,detail?:string,onPress:()=>void,external?:boolean}>={
  deadline:{icon:'flag-outline',label:'Add the application deadline',onPress:()=>schedule('deadline')},
  open_posting:{icon:'document-text-outline',label:'Review the original posting',external:true,onPress:openPosting},
  follow_up:{icon:'mail-outline',label:'Schedule a follow-up',detail:'A nudge if you haven’t heard back',onPress:()=>schedule('follow_up')},
  practice:{icon:'mic-outline',label:a.status==='interview'?'Practice with Local AI':'Prepare for an interview',detail:'Mock interview from this job’s description',onPress:()=>openMock(a)},
  add_event:{icon:'clipboard-outline',label:'Add an assessment or event',onPress:()=>schedule('assessment')},
  review_offer:{icon:'chatbubble-ellipses-outline',label:'Review the offer with Brief',onPress:()=>openChat(a)},
  decision_deadline:{icon:'flag-outline',label:'Set a decision deadline',onPress:()=>schedule('deadline',`Offer decision · ${a.company}`)},
  offer_notes:{icon:'create-outline',label:'Note the offer details',detail:'Salary, start date, benefits',onPress:()=>setNotesOpen(true)},
 };
 const eventRow=(e:Event)=>{const d=new Date(e.date),k=kindInfo(kindOf(e));
  return <Tap key={e.id} accessibilityRole="button" accessibilityLabel={`${e.title}, ${d.toDateString()} ${formatTime(d,timeFormat)}`} accessibilityHint="Opens the event" onPress={()=>setSheet({open:true,event:e})} style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:60,paddingVertical:10,paddingHorizontal:14}}>
   <View style={{width:36,alignItems:'center'}}><Txt size={10} bold color={C.blue}>{d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</Txt><Txt size={19} bold style={{lineHeight:22}}>{d.getDate()}</Txt></View>
   <View style={{flex:1}}><Txt size={16} numberOfLines={2}>{e.title}</Txt><Txt size={13} color={C.muted} numberOfLines={1}>{[k.label,d.toLocaleDateString('en-US',{weekday:'short'})+' '+formatTime(d,timeFormat),e.location].filter(Boolean).join(' · ')}</Txt></View>
   <Icon name="chevron-forward" size={16} color={C.soft}/>
  </Tap>;};
 const activityRow=(item:ActivityItem)=>{
  const e=item.event,icon=e?kindInfo(kindOf(e)).icon:item.kind==='saved'?'add-circle-outline':STATUS_ICON[item.status!];
  const label=e?`${kindInfo(kindOf(e)).label} ${Date.parse(e.date)<Date.now()?'on':'scheduled for'} ${dayInline(e.date)}, ${formatTime(e.date,timeFormat)}`:item.kind==='saved'?'Saved to Brief':item.status==='applied'?'Marked as applied':`Moved to ${STATUS_LABEL[item.status!]}`;
  const content=<View style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:44}}>
   <View style={{width:28,height:28,borderRadius:14,backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name={icon} size={15} color={C.muted}/></View>
   <Txt size={14} style={{flex:1}} numberOfLines={2}>{label}</Txt><Txt size={13} color={C.muted}>{day(item.at)}</Txt>
  </View>;
  return e?<Tap key={item.key} accessibilityRole="button" accessibilityHint="Opens the event" onPress={()=>setSheet({open:true,event:e})}>{content}</Tap>:<View key={item.key} accessible>{content}</View>;};
 const shown=allActivity?activity:activity.slice(0,4);
 const actionRows=actions.filter((x):x is keyof typeof ROW=>x in ROW).map(x=>{const r=ROW[x];return <Row key={x} {...r}/>;});
 const showUpNext=!closed||upcoming.length>0;

 return <View style={{flex:1}}>
 {bar(<ActionMenu label="More actions" actions={menu}/>,a.title)}
 <Reanimated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{paddingHorizontal:20,paddingTop:4,paddingBottom:40}}>
  {/* What job is this */}
  <View onLayout={e=>titleBottom.set(e.nativeEvent.layout.y+e.nativeEvent.layout.height)} style={{gap:8}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo uri={a.logoUrl} size={40}/><Txt size={15} bold color={C.muted} numberOfLines={2} style={{flex:1}}>{a.company}</Txt></View>
   <View accessibilityRole="header"><Heading>{a.title}</Heading></View>
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',columnGap:14,rowGap:6,marginTop:8}}>
   {!!a.location&&<View style={{flexDirection:'row',alignItems:'center',gap:5,maxWidth:'100%'}}><Icon name="location-outline" size={15} color={C.muted}/><Txt size={14} color={C.muted} numberOfLines={1} style={{flexShrink:1}}>{a.location}</Txt></View>}
   {!!a.employmentType&&<View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="time-outline" size={15} color={C.muted}/><Txt size={14} color={C.muted}>{a.employmentType}</Txt></View>}
   <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="cash-outline" size={15} color={salary?C.blue:C.muted}/><Txt size={14} color={salary?C.blue:C.muted} bold={!!salary}>{salary||'Salary not listed'}</Txt></View>
  </View>

  {/* Where am I */}
  <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:20}}>
   <Tap accessibilityRole="button" accessibilityLabel={`Status: ${st.label}`} accessibilityHint="Opens status options" onPress={()=>setStatusOpen(true)} style={{flexDirection:'row',alignItems:'center',gap:7,minHeight:38,paddingHorizontal:13,borderRadius:19,backgroundColor:st.background}}>
    <View style={{width:8,height:8,borderRadius:4,backgroundColor:st.color}}/><Txt size={15} bold color={st.color}>{st.label}</Txt><Icon name="chevron-down" size={15} color={st.color}/>
   </Tap>
   <Txt size={13} color={C.muted} style={{flexShrink:1}}>since {dayInline(statusSince(a))}</Txt>
  </View>
  {closed&&<Txt size={13} color={C.muted} style={{marginTop:8}}>This application is closed. Its history stays below — change the status anytime to reopen it.</Txt>}
  <View style={{flexDirection:'row',gap:10,marginTop:16}}>
   <Tap accessibilityRole="button" accessibilityLabel="Ask Brief about this job" onPress={()=>openChat(a)} style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,minHeight:46,borderRadius:14,backgroundColor:C.pale}}><Mascot size={20}/><Txt size={15} bold color={C.blue}>Ask Brief</Txt></Tap>
   <Tap accessibilityRole="button" accessibilityLabel="Practice a mock interview for this job" onPress={()=>openMock(a)} style={{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,minHeight:46,borderRadius:14,backgroundColor:C.pale}}><Icon name="mic-outline" size={19} color={C.blue}/><Txt size={15} bold color={C.blue}>Practice</Txt></Tap>
  </View>

  {/* What should I do next */}
  {showUpNext&&<View style={{marginTop:32}}>
   <SectionTitle right={closed?undefined:'Schedule'} onRight={()=>schedule(defaultKind(a.status))}>{closed?'Upcoming':'Up next'}</SectionTitle>
   <View style={{gap:12}}>
    {actions.includes('mark_applied')&&<View style={{gap:6}}><Primary large label="I’ve applied" onPress={()=>void setStatus('applied')}/><Txt size={12} color={C.muted} style={{textAlign:'center'}}>Mark it once you’ve sent your application. Brief never applies for you.</Txt></View>}
    {actions.includes('schedule_interview')&&<Primary large label="Schedule your interview" onPress={()=>schedule('interview')}/>}
    {(upcoming.length>0||actionRows.length>0)&&<Group>{upcoming.map(eventRow)}{actionRows}</Group>}
   </View>
  </View>}

  {/* The job itself */}
  <View style={{marginTop:32}}>
   <SectionTitle>About the role</SectionTitle>
   <JobDescription key={a.id} text={a.description}/>
   {!!a.sourceUrl&&<Tap accessibilityRole="link" onPress={openPosting} style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:14,minHeight:40,alignSelf:'flex-start'}}><Icon name="open-outline" size={16} color={C.blue}/><Txt size={15} bold color={C.blue}>View original posting</Txt></Tap>}
  </View>

  {/* Private notes */}
  <View style={{marginTop:32}}>
   <SectionTitle>Your notes</SectionTitle>
   <Tap accessibilityRole="button" accessibilityLabel={a.notes.trim()?'Your notes: '+a.notes:'Add a private note'} accessibilityHint="Opens the notes editor" onPress={()=>setNotesOpen(true)} style={{backgroundColor:C.white,borderRadius:16,padding:16,gap:10}}>
    {a.notes.trim()
     ?<Txt size={15} numberOfLines={4} style={{lineHeight:22}}>{a.notes.trim()}</Txt>
     :<View style={{flexDirection:'row',alignItems:'center',gap:10}}><Icon name="create-outline" size={20} color={C.blue}/><View style={{flex:1}}><Txt size={16} color={C.blue}>Add a note</Txt><Txt size={13} color={C.muted}>Interviewer names, questions to ask, salary talk</Txt></View></View>}
    <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="lock-closed" size={12} color={C.soft}/><Txt size={12} color={C.muted}>Private · only on this phone</Txt></View>
   </Tap>
  </View>

  {/* What happened so far */}
  <View style={{marginTop:32}}>
   <SectionTitle right={activity.length>4?(allActivity?'Show less':`Show all ${activity.length}`):undefined} onRight={()=>setAllActivity(!allActivity)}>Activity</SectionTitle>
   <View style={{gap:2}}>{shown.map(activityRow)}</View>
  </View>
 </Reanimated.ScrollView>

 <StatusSheet visible={statusOpen} status={a.status} onClose={()=>setStatusOpen(false)} onPick={s=>void setStatus(s)}/>
 <NotesSheet visible={notesOpen} initial={a.notes} onSave={notes=>putApp({...a,notes})} onClose={()=>setNotesOpen(false)}/>
 <EventSheet visible={sheet.open} event={sheet.event} draft={sheet.draft} onClose={closeSheet} toastAction={interviewToast}/>
 </View>;
}
