import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Linking,ScrollView,Switch,TextInput,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,CompanyLogo,Heading,Icon,Primary,Sheet,StatusPill,Tap,Txt,useFloatingNavClearance,useReducedMotion} from '../components/Ui';
import {SwipeAction} from '../components/SwipeAction';
import {Description} from '../components/Description';
import {EmptyState,JobsSkeleton} from '../components/States';
import Reanimated from 'react-native-reanimated';
import {EASE_OUT_CSS,ROW_IN} from '../theme/motion';
import {fetchRemoteJobs,activeFilterCount,INDUSTRIES,JobsError,DEFAULT_FILTERS,JOBICY_CREDIT_URL,type JobFilters} from '../lib/jobs';import {uid} from '../lib/db';import type {Application,RemoteJob} from '../types';

const REGIONS:{value:JobFilters['geo'],label:string,phrase:string}[]=[{value:'philippines',label:'Philippines',phrase:'the Philippines'},{value:'apac',label:'Asia-Pacific',phrase:'Asia-Pacific'},{value:'',label:'Anywhere',phrase:'any region'}];
const TYPES:{value:JobFilters['type'],label:string}[]=[{value:'',label:'Any'},{value:'Full-Time',label:'Full-time'},{value:'Part-Time',label:'Part-time'},{value:'Contract',label:'Contract'},{value:'Internship',label:'Internship'}];
const LEVELS:{value:JobFilters['level'],label:string}[]=[{value:'',label:'Any'},{value:'Entry-level',label:'Entry-level'},{value:'Mid-level',label:'Mid-level'},{value:'Senior',label:'Senior'},{value:'Director',label:'Director'}];
const POSTED:{value:JobFilters['posted'],label:string}[]=[{value:0,label:'Any time'},{value:1,label:'Past 24 hours'},{value:3,label:'Past 3 days'},{value:7,label:'Past week'}];
const ALL_INDUSTRIES=[{value:'',label:'All industries'},...INDUSTRIES];
const QUICK_FILTERS=[
 {id:'all',label:'All'},
 {id:'remote',label:'Remote'},
 {id:'full-time',label:'Full-time'},
 {id:'internship',label:'Internship'},
] as const;

const Credit=({filters}:{filters?:JobFilters})=><Tap accessibilityRole="link" onPress={()=>void Linking.openURL(JOBICY_CREDIT_URL)}><Txt color={C.muted} size={12}>{filters?`Remote jobs open to ${REGIONS.find(r=>r.value===filters.geo)!.phrase} · `:'Listing from '}<Txt color={C.blue} size={12}>Jobicy</Txt></Txt></Tap>;

const chip=(on:boolean)=>({minHeight:38,justifyContent:'center' as const,paddingHorizontal:14,borderRadius:19,backgroundColor:on?C.blue:C.pale2});
function Section({label,children}:{label:string,children:React.ReactNode}){return <View style={{gap:9}}><Txt size={13} bold color={C.muted} style={{letterSpacing:0.2}}>{label}</Txt>{children}</View>;}
function Choice<T extends string|number>({options,value,onChange,label,scroll=false}:{options:{value:T,label:string}[],value:T,onChange:(v:T)=>void,label:string,scroll?:boolean}){
 const items=options.map(o=><Tap key={String(o.value)} accessibilityRole="radio" accessibilityState={{selected:o.value===value}} onPress={()=>onChange(o.value)} style={chip(o.value===value)}><Txt size={14} color={o.value===value?C.white:C.ink}>{o.label}</Txt></Tap>);
 return <Section label={label}>{scroll
  ?<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal:-18}} contentContainerStyle={{gap:8,paddingHorizontal:18}}>{items}</ScrollView>
  :<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{items}</View>}</Section>;
}

/** Tracker entry for a listing; keeps id, status, dates and notes when it is already tracked. */
function toApplication(j:RemoteJob,existing?:Application):Application{
 return {id:existing?.id||uid('job'),title:j.title,company:j.company,location:j.location,salary:j.salary,pay:j.pay,employmentType:j.employmentType,description:j.description,sourceUrl:j.url,logoUrl:j.logo,status:existing?.status||'interested',createdAt:existing?.createdAt||new Date().toISOString(),appliedAt:existing?.appliedAt||null,notes:existing?.notes||''};
}
const Chip=({text}:{text:string})=><View style={{backgroundColor:C.pale,borderRadius:10,paddingHorizontal:10,paddingVertical:5,maxWidth:190}}><Txt size={12} color={C.blue}>{text}</Txt></View>;

function JobCard({j,app,salary,onOpen,onAdd,onRemove}:{j:RemoteJob,app?:Application,salary:string,onOpen:()=>void,onAdd:()=>void,onRemove:()=>void}){
 const advanced=!!app&&app.status!=='interested';
 return <SwipeAction done={!!app} onCommit={onAdd} label="Add to Brief" doneLabel="In Brief" icon="bookmark" doneIcon="checkmark-circle">
 <Tap accessibilityRole="button" accessibilityLabel={`${j.title} at ${j.company}${app?', in Brief':''}`} accessibilityHint="Opens the job. Swipe left to add it to Brief."
  accessibilityActions={app?[]:[{name:'add',label:'Add to Brief'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='add')onAdd();}}
  onPress={onOpen} style={{backgroundColor:C.white,borderRadius:18,padding:14,borderColor:C.line,borderWidth:1}}>
 <View style={{flexDirection:'row',gap:12}}>
  <CompanyLogo uri={j.logo} size={48}/>
  <View style={{flex:1,gap:2}}>
   <Txt bold size={16} numberOfLines={2}>{j.title}</Txt>
   <Txt size={14} color={C.muted} numberOfLines={1}>{j.company}</Txt>
   <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Icon name="location-outline" size={13} color={C.muted}/><Txt size={13} color={C.muted} numberOfLines={1} style={{flexShrink:1}}>{j.location}{j.employmentType?` • ${j.employmentType}`:''}</Txt></View>
  </View>
  {advanced?<View style={{alignSelf:'flex-start'}}><StatusPill status={app!.status}/></View>
  :<Tap accessibilityRole="button" accessibilityLabel={app?'Remove from Brief':'Add to Brief'} hitSlop={10} onPress={app?onRemove:onAdd} style={{width:32,height:32,alignItems:'center',justifyContent:'flex-start'}}><Icon name={app?'bookmark':'bookmark-outline'} size={22} color={app?C.blue:C.ink}/></Tap>}
 </View>
 <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8,marginTop:12}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:5,maxWidth:'100%'}}><Icon name="cash-outline" size={16} color={salary?C.muted:C.soft}/><Txt size={13} color={salary?C.ink:C.muted} style={{flexShrink:1}}>{salary||'Salary not listed'}</Txt></View>
  {j.tags.slice(0,2).map(t=><Chip key={t} text={t}/>)}
 </View>
 </Tap></SwipeAction>;
}

export function JobsScreen(){const {openJob,openApp,applications,putApp,removeApp,go,money,showToast}=useBrief();const reduce=useReducedMotion();const [query,setQuery]=useState(''),[filters,setFilters]=useState<JobFilters>(DEFAULT_FILTERS),[draft,setDraft]=useState<JobFilters>(DEFAULT_FILTERS),[showFilters,setShowFilters]=useState(false),[jobs,setJobs]=useState<RemoteJob[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState<JobsError|null>(null),[batch,setBatch]=useState(0);
 const bottomClearance=useFloatingNavClearance();
 async function refresh(q=query,f=filters){setLoading(true);setError(null);try{setJobs(await fetchRemoteJobs(q,f));setBatch(b=>b+1);}catch(e){setError(e instanceof JobsError?e:new JobsError('server',(e as Error).message));setJobs([]);}finally{setLoading(false)}}
 useEffect(()=>{void refresh();},[]);
 const count=activeFilterCount(filters);
 function apply(f:JobFilters){setShowFilters(false);setFilters(f);void refresh(query,f);}
 function applyQuick(id:typeof QUICK_FILTERS[number]['id']){
  const next={...filters,type:id==='full-time'?'Full-Time':id==='internship'?'Internship':'',geo:id==='remote'?'':id==='all'?(filters.geo||DEFAULT_FILTERS.geo):filters.geo} as JobFilters;
  apply(next);
 }
 function selectedQuick(id:typeof QUICK_FILTERS[number]['id']){
  if(id==='remote')return !filters.geo&&!filters.type;
  if(id==='all')return !!filters.geo&&!filters.type;
  if(id==='full-time')return filters.type==='Full-Time';
  return filters.type==='Internship';
 }
 const byUrl=useMemo(()=>new Map(applications.filter(a=>a.sourceUrl).map(a=>[a.sourceUrl,a])),[applications]);
 const usedSwipe=applications.some(a=>a.sourceUrl.includes('jobicy.com'));
 async function add(j:RemoteJob){if(byUrl.has(j.url))return;const a=toApplication(j);await putApp(a);showToast('Added to Brief',{label:'View',onPress:()=>openApp(a)});}
 function remove(a:Application){const del=()=>void removeApp(a.id,false);if(a.notes)Alert.alert('Remove from Brief?','This job has private notes that will be deleted.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:del}]);else del();}
 const set=<K extends keyof JobFilters>(k:K)=>(v:JobFilters[K])=>setDraft(d=>({...d,[k]:v}));
 return <><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:bottomClearance,gap:13}}><View style={{gap:2}}><Heading>Explore jobs</Heading><Txt color={C.muted}>Find your next opportunity</Txt></View>
 <View style={{flexDirection:'row',gap:8}}>
 <View style={{backgroundColor:C.pale2,flex:1,borderRadius:14,flexDirection:'row',alignItems:'center',paddingLeft:12,minHeight:46}}><Icon name="search" size={18} color={C.muted}/><TextInput accessibilityLabel="Search jobs" returnKeyType="search" clearButtonMode="never" style={{flex:1,paddingHorizontal:8,paddingVertical:10,color:C.ink,fontSize:15}} value={query} onChangeText={setQuery} placeholder="Roles or keywords" placeholderTextColor={C.soft} onSubmitEditing={()=>void refresh()}/>
 {!!query&&<Tap accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={()=>{setQuery('');void refresh('');}} style={{padding:10}}><Icon name="close-circle" size={18} color={C.soft}/></Tap>}</View>
 <Tap accessibilityRole="button" accessibilityLabel={count?`Filters, ${count} on`:'Filters'} onPress={()=>{setDraft(filters);setShowFilters(true);}} style={{width:46,height:46,borderRadius:14,backgroundColor:count?C.pale:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name="options-outline" size={20} color={count?C.blue:C.ink}/>{count>0&&<View style={{position:'absolute',top:6,right:6,minWidth:16,height:16,borderRadius:8,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',paddingHorizontal:4}}><Txt size={10} bold color={C.white} style={{lineHeight:13}}>{count}</Txt></View>}</Tap>
 </View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal:-18}} contentContainerStyle={{gap:8,paddingHorizontal:18}}>{QUICK_FILTERS.map(x=>{const active=selectedQuick(x.id);return <Reanimated.View key={x.id} style={{borderRadius:22,backgroundColor:active?C.blue:C.pale2,transitionProperty:'backgroundColor',transitionDuration:reduce?0:160,transitionTimingFunction:EASE_OUT_CSS}}><Tap accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>applyQuick(x.id)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:15,borderRadius:22,backgroundColor:'transparent'}}><Txt size={14} bold={active} color={active?C.white:C.ink}>{x.label}</Txt></Tap></Reanimated.View>;})}</ScrollView>
 <Credit filters={filters}/>
 {!usedSwipe&&jobs.length>0&&!loading&&!error&&<View style={{flexDirection:'row',alignItems:'center',gap:6}}><Icon name="hand-left-outline" size={14} color={C.muted}/><Txt size={12} color={C.muted}>Swipe left on a job to add it to Brief</Txt></View>}
 {loading&&<JobsSkeleton/>}
 {!loading&&error?.kind==='offline'&&<EmptyState mood="sad" title="You’re offline" body={error.message} action={{label:'Try again',icon:'refresh',onPress:()=>void refresh()}} secondary={applications.length?{label:'Open my saved jobs',onPress:()=>go('applications')}:undefined}/>}
 {!loading&&error?.kind==='server'&&<EmptyState mood="error" title="Jobs couldn’t load" body={error.message} action={{label:'Try again',icon:'refresh',onPress:()=>void refresh()}}/>}
 {!loading&&!error&&jobs.length===0&&<EmptyState mood="question" title="No jobs found" body={`Nothing matches${query?` “${query.trim()}”`:''}${count?' with these filters':''} right now. Jobicy lists recent remote jobs, so try a broader search.`} action={count?{label:'Reset filters',onPress:()=>apply(DEFAULT_FILTERS)}:undefined} secondary={query?{label:'Clear search',onPress:()=>{setQuery('');void refresh('');}}:undefined}/>}
 {!loading&&jobs.length>0&&<Reanimated.View key={batch} entering={ROW_IN} style={{gap:13}}>{jobs.map(j=>{const a=byUrl.get(j.url);return <JobCard key={j.id} j={j} app={a} salary={money(j)} onOpen={()=>openJob(j)} onAdd={()=>void add(j)} onRemove={()=>a&&remove(a)}/>;})}</Reanimated.View>}
 </ScrollView>
 <Sheet scroll visible={showFilters} onClose={()=>setShowFilters(false)} title="Filters"
  footer={<View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Primary secondary label="Reset" onPress={()=>setDraft(DEFAULT_FILTERS)}/></View><View style={{flex:2}}><Primary label="Show jobs" onPress={()=>apply(draft)}/></View></View>}>
 <View style={{gap:22,paddingBottom:4}}>
  <Choice label="OPEN TO APPLICANTS IN" options={REGIONS} value={draft.geo} onChange={set('geo')}/>
  <Choice label="INDUSTRY" scroll options={ALL_INDUSTRIES} value={draft.industry} onChange={set('industry')}/>
  <Choice label="JOB TYPE" options={TYPES} value={draft.type} onChange={set('type')}/>
  <Choice label="EXPERIENCE" options={LEVELS} value={draft.level} onChange={set('level')}/>
  <Choice label="POSTED" options={POSTED} value={draft.posted} onChange={set('posted')}/>
  <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:4}}>
   <View style={{flex:1}}><Txt bold size={15}>Salary listed</Txt><Txt size={13} color={C.muted}>Only show jobs that state a salary</Txt></View>
   <Switch accessibilityLabel="Only show jobs that state a salary" value={draft.salaryOnly} onValueChange={set('salaryOnly')} trackColor={{true:C.blue,false:C.line}} thumbColor={C.white} ios_backgroundColor={C.line}/>
  </View>
 </View></Sheet></>;
}

export function JobDetailScreen(){const {selectedJob,putApp,applications,openChat,openApp,money,showToast,currency}=useBrief();
 const bottomClearance=useFloatingNavClearance();
 if(!selectedJob)return <View style={{padding:20}}><Txt>No job selected.</Txt></View>;
 const j=selectedJob;const existing=applications.find(x=>!!j.url&&x.sourceUrl===j.url);
 const salary=money(j),converted=!!j.pay&&salary!==j.salary;
 async function add(){const a=toApplication(j);await putApp(a);showToast('Added to Brief',{label:'View',onPress:()=>openApp(a)});}
 return <ScrollView contentContainerStyle={{padding:19,paddingTop:4,paddingBottom:bottomClearance,gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo uri={j.logo} size={48}/><Txt bold size={16} style={{flex:1}} numberOfLines={2}>{j.company}</Txt></View>
 <Heading>{j.title}</Heading>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="location-outline" size={15} color={C.muted}/><Txt color={C.muted} size={13}>{j.location}</Txt></View>
 {!!j.employmentType&&<View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="time-outline" size={15} color={C.muted}/><Txt color={C.muted} size={13}>{j.employmentType}</Txt></View>}
 <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="cash-outline" size={15} color={salary?C.blue:C.muted}/><Txt color={salary?C.blue:C.muted} size={13} bold={!!salary}>{salary||'Salary not listed'}</Txt></View>
 </View>
 {converted&&<Txt size={12} color={C.muted}>Listed as {j.salary}. Converted to {currency} with ECB reference rates.</Txt>}
 {j.tags.length>0&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{j.tags.map(t=><Chip key={t} text={t}/>)}</View>}
 <View style={{flexDirection:'row',gap:9}}>
  <View style={{flex:1}}><Primary label="Open listing ↗" onPress={()=>j.url?void Linking.openURL(j.url):Alert.alert('Unavailable','No original link was provided.')}/></View>
  <View style={{flex:1}}>{existing
   ?<Primary secondary icon="chevron-forward" label="In Brief ✓" onPress={()=>openApp(existing)}/>
   :<Primary secondary label="Add to Brief" onPress={()=>void add()}/>}</View>
 </View>
 <Card style={{padding:16}}><Txt bold size={17} style={{marginBottom:12}}>About the role</Txt><Description key={j.id} text={j.description} empty="No description supplied by the provider."/></Card>
 <Primary label="Ask Brief about this job" secondary onPress={()=>openChat(existing||{...toApplication(j),id:'preview-'+j.id})}/>
 <Credit/>
 </ScrollView>;
}
