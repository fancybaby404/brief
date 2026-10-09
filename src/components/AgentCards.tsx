import React,{useEffect,useState} from 'react';
import {ActivityIndicator,TextInput,View} from 'react-native';
import * as Haptics from 'expo-haptics';
import {C} from '../theme/tokens';
import {CompanyLogo,Icon,StatusPill,Tap,Txt,statusStyle} from './Ui';
import {FormLabel,FormSheet} from './FormSheet';
import {useBrief} from '../lib/appContext';
import {getProfile,uid} from '../lib/db';
import {speechInstalled} from '../lib/voice/stt';
import {formatTime} from '../lib/time';
import {STATUS_ORDER} from '../lib/tracker';
import {kindInfo} from '../lib/events';
import {commit,undo} from '../lib/agent/execute';
import {callTool,jobFieldsOk} from '../lib/agent/tools';
import {eventTurn,practiceTurn,planPick,FOLLOW_UP_LABEL,type Turn} from '../lib/agent/plan';
import {findDuplicateApplication} from '../lib/agent/resolve';
import {MOCK_MODES,type AgentCard,type AgentStore,type JobFields} from '../lib/agent/types';
import type {Application,ApplicationStatus,Event} from '../types';

export type CardActions={
 store:AgentStore;
 update:(card:AgentCard)=>void;   // persist a card's new state on its message
 post:(turn:Turn)=>void;          // add Brief's reply (from saved data) to the chat
 send:(text:string)=>void;        // send as if the user typed it
 reviewEvent:(card:Extract<AgentCard,{type:'event'}>)=>void;
 openEvent:(e:Event)=>void;
 busy:boolean;
};
type P<T extends AgentCard['type']>={card:Extract<AgentCard,{type:T}>}&CardActions;

const shell={backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.line,overflow:'hidden'} as const;
const btn=(kind:'primary'|'secondary'|'danger')=>({minHeight:44,borderRadius:13,paddingHorizontal:16,alignItems:'center' as const,justifyContent:'center' as const,flexDirection:'row' as const,gap:6,backgroundColor:kind==='primary'?C.blue:kind==='danger'?C.redSoft:C.pale});
const btnText=(kind:'primary'|'secondary'|'danger')=>kind==='primary'?C.white:kind==='danger'?C.danger:C.blue;
function Button({label,kind='secondary',onPress,disabled,icon}:{label:string,kind?:'primary'|'secondary'|'danger',onPress:()=>void,disabled?:boolean,icon?:string}){
 return <Tap accessibilityRole="button" accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress} style={[btn(kind),{opacity:disabled?0.5:1,flexGrow:1}]}>{!!icon&&<Icon name={icon} size={16} color={btnText(kind)}/>}<Txt size={15} bold color={btnText(kind)}>{label}</Txt></Tap>;
}
function Done({text,ok=true}:{text:string,ok?:boolean}){return <View accessibilityLiveRegion="polite" style={{flexDirection:'row',alignItems:'center',gap:6,padding:12}}><Icon name={ok?'checkmark-circle':'alert-circle'} size={18} color={ok?C.green:C.danger}/><Txt size={14} style={{flex:1}}>{text}</Txt></View>;}
const divider=<View style={{height:1,backgroundColor:C.line,marginLeft:12}}/>;

function AppRow({a,onPress,hint}:{a:Application,onPress:()=>void,hint:string}){
 return <Tap accessibilityRole="button" accessibilityLabel={`${a.title} at ${a.company}, ${statusStyle(a.status).label}`} accessibilityHint={hint} onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:56,paddingHorizontal:12,paddingVertical:8}}>
  <CompanyLogo uri={a.logoUrl} size={34}/>
  <View style={{flex:1}}><Txt size={15} bold numberOfLines={1}>{a.company}</Txt><Txt size={13} color={C.muted} numberOfLines={1}>{a.title}</Txt></View>
  <StatusPill status={a.status}/>
 </Tap>;
}

function AppsCard({card,store,post,busy}:P<'apps'>){
 const {applications,openApp}=useBrief();
 const list=card.ids.map(id=>applications.find(a=>a.id===id)).filter((a):a is Application=>!!a);
 if(!list.length)return <View style={shell}><Done ok={false} text="These jobs are no longer in Brief."/></View>;
 const pick=card.pick??{action:'open' as const};
 const choose=async(a:Application)=>{if(busy)return;void Haptics.selectionAsync();
  if(pick.action==='open'||pick.action==='focus'){openApp(a);return;}
  post(await planPick(pick,a,store));};
 const hint=pick.action==='open'||pick.action==='focus'?'Opens the job':'Chooses this job';
 return <View style={shell}>{list.map((a,i)=><View key={a.id}>{i>0&&divider}<AppRow a={a} hint={hint} onPress={()=>void choose(a)}/></View>)}</View>;
}

function EventsCard({card,openEvent}:P<'events'>){
 const {events,applications,timeFormat}=useBrief();
 const list=card.ids.map(id=>events.find(e=>e.id===id)).filter((e):e is Event=>!!e);
 if(!list.length)return <View style={shell}><Done ok={false} text="These events are no longer in your calendar."/></View>;
 return <View style={shell}>{list.map((e,i)=>{const d=new Date(e.date),job=applications.find(a=>a.id===e.applicationId);
  return <View key={e.id}>{i>0&&divider}<Tap accessibilityRole="button" accessibilityHint="Opens the event to edit or delete it" onPress={()=>openEvent(e)} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:56,paddingHorizontal:12,paddingVertical:8}}>
   <View style={{width:36,alignItems:'center'}}><Txt size={10} bold color={C.blue}>{d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</Txt><Txt size={18} bold style={{lineHeight:21}}>{d.getDate()}</Txt></View>
   <View style={{flex:1}}><Txt size={15} numberOfLines={1}>{e.title}</Txt><Txt size={13} color={C.muted} numberOfLines={1}>{[kindInfo(e.kind??'other').label,d.toLocaleDateString('en-US',{weekday:'short'})+' '+formatTime(d,timeFormat),job?.company].filter(Boolean).join(' · ')}</Txt></View>
   <Icon name="chevron-forward" size={15} color={C.soft}/>
  </Tap></View>;})}</View>;
}

/** Writes wait here for an explicit Confirm; the result is checked against storage before it says Done. */
function ConfirmCard({card,store,update}:P<'confirm'>){
 const [running,setRunning]=useState(false);
 const run=async()=>{if(running||card.state!=='pending')return;setRunning(true);
  const out=await commit(card.pending,store);setRunning(false);
  if(out.ok){void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);update({...card,state:'done',result:out.message,undo:out.undo});}
  else update({...card,state:out.message==='Already done.'?'done':'failed',result:out.message});};
 const revert=async()=>{if(!card.undo||card.undo.used||running)return;setRunning(true);const out=await undo(card.undo,store);setRunning(false);update({...card,result:out.message,undo:{...card.undo,used:out.ok}});};
 if(card.state==='cancelled')return <View style={shell}><Done ok={false} text="Cancelled. Nothing changed."/></View>;
 if(card.state!=='pending')return <View style={shell}><Done ok={card.state==='done'} text={card.result||'Done.'}/>{card.undo&&!card.undo.used&&<View style={{paddingHorizontal:12,paddingBottom:12}}><Button label="Undo" icon="arrow-undo" onPress={()=>void revert()} disabled={running}/></View>}</View>;
 const destructive=card.pending.tool==='deleteApplication'||card.pending.tool==='deleteEvent';
 const label=card.pending.tool==='deleteApplication'?'Delete':card.pending.tool==='deleteEvent'?'Cancel event':card.pending.tool==='addApplicationNote'?'Add note':'Update';
 return <View style={[shell,{padding:12,gap:10}]}>
  {card.pending.tool==='addApplicationNote'&&<View style={{backgroundColor:C.pale2,borderRadius:12,padding:12}}><Txt size={12} color={C.muted}>Note preview · private</Txt><Txt size={15}>{card.pending.note}</Txt></View>}
  <View style={{flexDirection:'row',gap:8}}>
   <Button label="Not now" onPress={()=>update({...card,state:'cancelled'})} disabled={running}/>
   <Button label={running?'Working…':label} kind={destructive?'danger':'primary'} onPress={()=>void run()} disabled={running}/>
  </View>
 </View>;
}

/** Picking a status here is the confirmation: the user chose the exact value. */
function StatusCard({card,store,update}:P<'status'>){
 const {applications}=useBrief();const a=applications.find(x=>x.id===card.applicationId);const [running,setRunning]=useState(false);
 if(!a)return <View style={shell}><Done ok={false} text="This job is no longer in Brief."/></View>;
 if(card.state!=='pending')return <View style={shell}><Done text={`${a.company} is ${statusStyle(a.status).label}.`}/></View>;
 const pick=async(s:ApplicationStatus)=>{if(running)return;setRunning(true);
  const r=await callTool('updateApplicationStatus',{id:a.id,status:s},store);
  const out=r.ok&&r.pending?await commit(r.pending,store):{ok:r.ok,message:r.ok?r.facts:r.error};
  setRunning(false);if(out.ok)update({...card,state:'done'});};
 return <View style={[shell,{padding:12,flexDirection:'row',flexWrap:'wrap',gap:8}]} accessibilityRole="radiogroup">
  {STATUS_ORDER.map(s=>{const st=statusStyle(s),on=s===a.status;return <Tap key={s} accessibilityRole="radio" accessibilityState={{selected:on}} disabled={running} onPress={()=>void pick(s)} style={{minHeight:38,paddingHorizontal:12,borderRadius:19,justifyContent:'center',backgroundColor:on?st.color:st.background}}><Txt size={14} bold color={on?C.white:st.color}>{st.label}</Txt></Tap>;})}
 </View>;
}

const FIELD_LABEL:[keyof JobFields,string,boolean][]=[['company','Company *',false],['title','Position *',false],['location','Location',false],['salary','Salary (as listed)',false],['employmentType','Employment type',false],['sourceUrl','Source link',false],['description','Description',true]];
/** Editable preview of a job read from an image. Nothing is saved until Save; duplicates are caught first. */
function JobCard({card,store,update,post}:P<'job'>){
 const {applications,openApp}=useBrief();
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(card.fields),[running,setRunning]=useState(false),[error,setError]=useState('');
 const f=card.fields,dup=card.duplicateId?applications.find(a=>a.id===card.duplicateId):undefined;
 if(card.state==='done'){const saved=applications.find(a=>a.id===card.savedId);
  return <View style={shell}><Done text={saved?`Saved ${saved.title} at ${saved.company}.`:'Saved.'}/>{saved&&<View style={{paddingHorizontal:12,paddingBottom:12}}><Button label="Open job" icon="open-outline" onPress={()=>openApp(saved)}/></View>}</View>;}
 if(card.state==='cancelled')return <View style={shell}><Done ok={false} text="Not saved."/></View>;
 async function save(force=false){if(running)return;setError('');
  if(!jobFieldsOk(f)){setError('Add the company and position first (Edit).');return;}
  const existing=findDuplicateApplication(applications,f.company,f.title);
  if(existing&&!force){update({...card,duplicateId:existing.id});return;}
  setRunning(true);
  const now=new Date().toISOString();
  const a:Application={id:uid('application'),company:f.company.trim(),title:f.title.trim(),location:f.location.trim(),salary:f.salary.trim(),employmentType:f.employmentType.trim(),description:f.description.trim(),sourceUrl:f.sourceUrl.trim(),status:card.status,createdAt:now,appliedAt:card.status==='applied'?now:null,notes:''};
  try{await store.putApp(a);
   if(!(await store.reload()).applications.some(x=>x.id===a.id))throw new Error('It wasn’t saved.');
   update({...card,state:'done',savedId:a.id});
   post({type:'reply',text:`Saved to your applications as ${statusStyle(a.status).label}.`,card:card.followUps?.length?{type:'next',applicationId:a.id,followUps:card.followUps}:undefined,focusId:a.id});
  }catch(e){setError(`Couldn’t save: ${(e as Error).message}`);}finally{setRunning(false);}}
 return <View style={[shell,{padding:12,gap:10}]}>
  <View style={{gap:2}}><Txt size={16} bold>{f.title||'Position not found'}</Txt><Txt size={14} color={C.muted}>{f.company||'Company not found'}</Txt>
   {!![f.location,f.employmentType,f.salary].filter(Boolean).length&&<Txt size={13} color={C.muted}>{[f.location,f.employmentType,f.salary].filter(Boolean).join(' · ')}</Txt>}</View>
  {!!f.description&&<Txt size={13} numberOfLines={4} color={C.ink}>{f.description.replace(/^## /gm,'').replace(/\*\*/g,'')}</Txt>}
  {!!card.note&&<Txt size={12} color={C.muted}>{card.note}</Txt>}
  {dup&&<View style={{backgroundColor:C.pale2,borderRadius:12,padding:10,gap:8}}><Txt size={13}>Already in Brief: {dup.title} at {dup.company} ({statusStyle(dup.status).label}).</Txt><View style={{flexDirection:'row',gap:8}}><Button label="Open it" onPress={()=>openApp(dup)}/><Button label="Save another" onPress={()=>void save(true)} disabled={running}/></View>{card.followUps?.includes('practice')&&<Button label="Practice for it" icon="mic-outline" kind="primary" onPress={()=>{update({...card,state:'cancelled'});post(practiceTurn(dup,'job'));}}/>}</View>}
  <View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:8}}>
   {(['interested','applied'] as const).map(s=><Tap key={s} accessibilityRole="radio" accessibilityState={{selected:card.status===s}} onPress={()=>update({...card,status:s})} style={{minHeight:38,paddingHorizontal:14,borderRadius:19,justifyContent:'center',backgroundColor:card.status===s?C.blue:C.pale2}}><Txt size={14} bold color={card.status===s?C.white:C.ink}>{s==='interested'?'Interested (saved)':'Applied'}</Txt></Tap>)}
  </View>
  {!!error&&<View accessibilityRole="alert"><Txt size={13} color={C.danger}>{error}</Txt></View>}
  {!dup&&<View style={{flexDirection:'row',gap:8}}><Button label="Edit" icon="create-outline" onPress={()=>{setDraft(card.fields);setEditing(true);}}/><Button label={running?'Saving…':'Save job'} kind="primary" onPress={()=>void save()} disabled={running}/></View>}
  <Tap accessibilityRole="button" onPress={()=>update({...card,state:'cancelled'})} style={{alignSelf:'center',minHeight:32,justifyContent:'center'}}><Txt size={13} color={C.muted}>Don’t save</Txt></Tap>
  <FormSheet visible={editing} title="Review job" onClose={()=>setEditing(false)} doneLabel="Done" onDone={()=>{update({...card,fields:draft,duplicateId:undefined});setEditing(false);}}>
   <Txt size={13} color={C.muted}>Read on this phone from your image. Fix anything that’s wrong; empty fields weren’t in the image.</Txt>
   {FIELD_LABEL.map(([k,label,multi])=><View key={k}><FormLabel>{label.toUpperCase()}</FormLabel><TextInput accessibilityLabel={label} value={draft[k]} onChangeText={v=>setDraft(d=>({...d,[k]:v}))} multiline={multi} autoCapitalize={k==='sourceUrl'?'none':'sentences'} placeholderTextColor={C.soft} placeholder="Not in the image" style={{backgroundColor:C.pale2,color:C.ink,borderRadius:12,paddingHorizontal:12,paddingVertical:11,fontSize:16,minHeight:multi?140:46,textAlignVertical:multi?'top':'center'}}/></View>)}
  </FormSheet>
 </View>;
}

/** Event preview: tap to review in the same editor Calendar uses (native pickers, reminders, duplicate check). */
function EventCard({card,store,update,reviewEvent}:P<'event'>){
 const {applications,timeFormat}=useBrief();const [running,setRunning]=useState(false);
 const p=card.proposal,d=new Date(p.date),job=applications.find(a=>a.id===p.applicationId);
 if(card.state==='cancelled')return <View style={shell}><Done ok={false} text="Not scheduled."/></View>;
 if(card.state==='done'){
  const offer=card.offerInterviewStatus&&job&&['interested','applied','under_review'].includes(job.status);
  const move=async()=>{if(!job||running)return;setRunning(true);const r=await callTool('updateApplicationStatus',{id:job.id,status:'interview'},store);if(r.ok&&r.pending){const out=await commit(r.pending,store);if(out.ok)update({...card,offerInterviewStatus:false});}setRunning(false);};
  return <View style={shell}><Done text={p.eventId?'Event updated.':'Added to your calendar.'}/>{offer&&<View style={{paddingHorizontal:12,paddingBottom:12,gap:6}}><Txt size={13} color={C.muted}>{job!.company} is still {statusStyle(job!.status).label}. Move it to Interview?</Txt><Button label="Move to Interview" onPress={()=>void move()} disabled={running}/></View>}</View>;}
 return <View style={[shell,{padding:12,gap:10}]}>
  <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
   <View style={{width:40,height:40,borderRadius:20,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name={kindInfo(p.kind).icon} size={19} color={C.blue}/></View>
   <View style={{flex:1}}><Txt size={15} bold numberOfLines={2}>{p.title}</Txt><Txt size={13} color={C.muted}>{d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})} · {formatTime(d,timeFormat)}{p.location?` · ${p.location}`:''}</Txt>{!!job&&<Txt size={12} color={C.muted} numberOfLines={1}>{job.title} · {job.company}</Txt>}</View>
  </View>
  {!!p.assumed&&<View style={{flexDirection:'row',gap:6,alignItems:'center'}}><Icon name="information-circle-outline" size={16} color={C.muted}/><Txt size={13} color={C.muted} style={{flex:1}}>{p.assumed}</Txt></View>}
  <View style={{flexDirection:'row',gap:8}}><Button label="Not now" onPress={()=>update({...card,state:'cancelled'})}/><Button label="Review & save" kind="primary" onPress={()=>reviewEvent(card)}/></View>
 </View>;
}

/** Interview setup: confirm the job and style, then the existing Mock screen opens with job + resume context. */
function InterviewCard({card,update}:P<'interview'>){
 const {applications,openMock}=useBrief();
 // Voice only when the offline speech models are installed; otherwise the same interview is typed.
 const [voiceOk,setVoiceOk]=useState(false);
 useEffect(()=>{let on=true;void speechInstalled().then(v=>{if(on)setVoiceOk(v);});return()=>{on=false};},[]);
 const a=applications.find(x=>x.id===card.applicationId);
 if(!a)return <View style={shell}><Done ok={false} text="This job is no longer in Brief."/></View>;
 const voice=voiceOk&&card.voice!==false;
 const start=()=>{update({...card,state:'done'});openMock(a,{mode:card.mode,question:card.question,topic:card.topic,voice});};
 return <View style={[shell,{padding:12,gap:10}]}>
  <View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo uri={a.logoUrl} size={34}/><View style={{flex:1}}><Txt size={15} bold numberOfLines={1}>{a.title}</Txt><Txt size={13} color={C.muted} numberOfLines={1}>{a.company}</Txt></View></View>
  {card.question?<View style={{backgroundColor:C.pale2,borderRadius:12,padding:10}}><Txt size={12} color={C.muted}>Question to practice</Txt><Txt size={15}>{card.question}</Txt></View>
   :<View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{MOCK_MODES.map(m=><Tap key={m.value} accessibilityRole="radio" accessibilityState={{selected:card.mode===m.value}} onPress={()=>update({...card,mode:m.value})} style={{minHeight:36,paddingHorizontal:12,borderRadius:18,justifyContent:'center',backgroundColor:card.mode===m.value?C.blue:C.pale2}}><Txt size={13} bold color={card.mode===m.value?C.white:C.ink}>{m.label}</Txt></Tap>)}</View>}
  {!card.resume&&<View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:8,alignItems:'center'}}>
   {([[true,'mic-outline','Speak'],[false,'chatbubble-outline','Type']] as const).map(([v,icon,label])=>{const on=voice===v;return <Tap key={label} accessibilityRole="radio" accessibilityState={{selected:on,disabled:v&&!voiceOk}} disabled={v&&!voiceOk} onPress={()=>update({...card,voice:v})} style={{flexDirection:'row',alignItems:'center',gap:5,minHeight:36,paddingHorizontal:12,borderRadius:18,backgroundColor:on?C.ink:C.pale2,opacity:v&&!voiceOk?0.45:1}}><Icon name={icon} size={14} color={on?C.white:C.ink}/><Txt size={13} bold color={on?C.white:C.ink}>{label}</Txt></Tap>;})}
   {!voiceOk&&<Txt size={12} color={C.muted} style={{flex:1}}>Voice needs the speech models (Settings).</Txt>}
  </View>}
  {!!card.topic&&<Txt size={13} color={C.muted}>Focus: {card.topic}</Txt>}
  <Button label={card.resume?'Continue interview':card.state==='done'?'Open practice again':card.question?'Start practice':'Start interview'} kind="primary" icon={voice?'mic-outline':'chatbubble-outline'} onPress={start}/>
 </View>;
}

/** Resume details read from an image. The user reviews and edits them; Save writes them to the profile. */
function ResumeCard({card,update,post,busy}:P<'resume'>){
 const {profile,updateProfile,applications}=useBrief();
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(card.fields),[running,setRunning]=useState(false),[error,setError]=useState('');
 const f=card.fields;
 if(card.state==='cancelled')return <View style={shell}><Done ok={false} text="Not saved to your profile."/></View>;
 if(card.state==='done')return <View style={shell}><Done text="Saved to your resume details."/></View>;
 async function save(){if(running)return;setRunning(true);setError('');
  try{const next={...profile,...(f.name&&!profile.name?{name:f.name}:{}),skills:f.skills||profile.skills,experience:f.experience||profile.experience,education:f.education||profile.education,goals:f.goals||profile.goals};
   await updateProfile(next);
   const saved=await getProfile();
   if(saved.skills!==next.skills||saved.experience!==next.experience)throw new Error('It wasn’t saved.');
   update({...card,state:'done'});
   if(card.interview)post(applications.length?{type:'reply',text:'Which job should the resume interview be for?',card:{type:'apps',title:'Your saved jobs',ids:applications.slice(0,8).map(a=>a.id),pick:{action:'practice',mode:'resume'}}}:{type:'reply',text:'Saved. Add a job to practice a resume-based interview for it.'});
  }catch(e){setError(`Couldn’t save: ${(e as Error).message}`);}finally{setRunning(false);}}
 const rows:[keyof typeof f,string][]=[['skills','Skills'],['experience','Experience'],['education','Education'],['goals','Goals']];
 return <View style={[shell,{padding:12,gap:10}]}>
  <Txt size={13} color={C.muted}>Read from your image on this phone. Only what’s written is included — check it before saving.</Txt>
  {rows.filter(([k])=>f[k]).map(([k,label])=><View key={k}><Txt size={12} bold color={C.muted}>{label.toUpperCase()}</Txt><Txt size={14} numberOfLines={5}>{f[k]}</Txt></View>)}
  {!!error&&<View accessibilityRole="alert"><Txt size={13} color={C.danger}>{error}</Txt></View>}
  <View style={{flexDirection:'row',gap:8}}><Button label="Edit" icon="create-outline" onPress={()=>{setDraft(card.fields);setEditing(true);}}/><Button label={running?'Saving…':'Save to profile'} kind="primary" onPress={()=>void save()} disabled={running||busy}/></View>
  <Tap accessibilityRole="button" onPress={()=>update({...card,state:'cancelled'})} style={{alignSelf:'center',minHeight:32,justifyContent:'center'}}><Txt size={13} color={C.muted}>Don’t save</Txt></Tap>
  <FormSheet visible={editing} title="Resume details" onClose={()=>setEditing(false)} doneLabel="Done" onDone={()=>{update({...card,fields:draft});setEditing(false);}}>
   {rows.map(([k,label])=><View key={k}><FormLabel>{label.toUpperCase()}</FormLabel><TextInput accessibilityLabel={label} value={draft[k]} onChangeText={v=>setDraft(d=>({...d,[k]:v}))} multiline placeholder="Not in the image" placeholderTextColor={C.soft} style={{backgroundColor:C.pale2,color:C.ink,borderRadius:12,paddingHorizontal:12,paddingVertical:11,fontSize:16,minHeight:k==='experience'?140:60,textAlignVertical:'top'}}/></View>)}
  </FormSheet>
 </View>;
}

function ChoicesCard({card,send,busy}:P<'choices'>){
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{card.options.map(o=><Tap key={o.label} accessibilityRole="button" disabled={busy} onPress={()=>send(o.send)} style={{minHeight:40,paddingHorizontal:14,borderRadius:20,justifyContent:'center',backgroundColor:C.pale}}><Txt size={14} bold color={C.blue}>{o.label}</Txt></Tap>)}</View>;
}

/** After a job is saved from a compound request: the remaining steps as one-tap actions. */
function NextCard({card,send,post,busy}:P<'next'>){
 const {applications}=useBrief();const a=applications.find(x=>x.id===card.applicationId);
 if(!a)return null;
 const run=(f:typeof card.followUps[number])=>{if(busy)return;
  if(f==='qualify')send(`Am I qualified for the ${a.title} role at ${a.company}?`);
  else if(f==='schedule_interview'){const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);post(eventTurn(a,{kind:'interview',date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T10:00:00`,assumed:'No date given — set the real one before saving'}));}
  else post(practiceTurn(a,'job'));};
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{card.followUps.map(f=><Tap key={f} accessibilityRole="button" disabled={busy} onPress={()=>run(f)} style={{minHeight:40,paddingHorizontal:14,borderRadius:20,justifyContent:'center',backgroundColor:C.pale}}><Txt size={14} bold color={C.blue}>{FOLLOW_UP_LABEL[f]}</Txt></Tap>)}</View>;
}

/** Renders a card from a chat message. Cards are aligned with Brief's bubbles (after the avatar). */
export function AgentCardView(props:{card:AgentCard}&CardActions){
 const {card}=props;
 const body=card.type==='apps'?<AppsCard {...props} card={card}/>:card.type==='events'?<EventsCard {...props} card={card}/>:card.type==='confirm'?<ConfirmCard {...props} card={card}/>
  :card.type==='status'?<StatusCard {...props} card={card}/>:card.type==='job'?<JobCard {...props} card={card}/>:card.type==='event'?<EventCard {...props} card={card}/>
  :card.type==='interview'?<InterviewCard {...props} card={card}/>:card.type==='choices'?<ChoicesCard {...props} card={card}/>:card.type==='resume'?<ResumeCard {...props} card={card}/>:<NextCard {...props} card={card}/>;
 return <View style={{marginLeft:38,maxWidth:'90%',alignSelf:'stretch'}}>{body}</View>;
}

/** Spinner row for slow steps (reading an image), with what's happening. */
export function WorkingRow({label}:{label:string}){return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{flexDirection:'row',alignItems:'center',gap:8,marginLeft:38}}><ActivityIndicator size="small" color={C.blue}/><Txt size={13} color={C.muted}>{label}</Txt></View>;}
