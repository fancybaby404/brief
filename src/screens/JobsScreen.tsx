import React,{useEffect,useMemo,useState} from 'react';
import {AccessibilityInfo,ActivityIndicator,Alert,Linking,ScrollView,TextInput,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,CompanyLogo,Heading,Icon,Primary,Sheet,StatusPill,Tap,Txt} from '../components/Ui';
import {SwipeAction} from '../components/SwipeAction';
import {Description} from '../components/Description';
import {EmptyState,JobsSkeleton} from '../components/States';
import Reanimated from 'react-native-reanimated';
import {ROW_IN} from '../theme/motion';
import {fetchRemoteJobs,JobsError,DEFAULT_FILTERS,JOBICY_CREDIT_URL,type JobFilters} from '../lib/jobs';import {uid} from '../lib/db';import type {Application,ApplicationStatus,RemoteJob} from '../types';
const REGIONS:{value:JobFilters['geo'],label:string,phrase:string}[]=[{value:'philippines',label:'Philippines',phrase:'the Philippines'},{value:'apac',label:'Asia-Pacific',phrase:'Asia-Pacific'},{value:'',label:'All regions',phrase:'any region'}];
const TYPES:{value:JobFilters['type'],label:string}[]=[{value:'',label:'Any'},{value:'Full-Time',label:'Full-time'},{value:'Part-Time',label:'Part-time'},{value:'Contract',label:'Contract'}];
const Credit=({filters}:{filters?:JobFilters})=><Tap accessibilityRole="link" onPress={()=>void Linking.openURL(JOBICY_CREDIT_URL)}><Txt color={C.muted} size={12}>{filters?`Remote jobs open to ${REGIONS.find(r=>r.value===filters.geo)!.phrase}${filters.type?' · '+TYPES.find(t=>t.value===filters.type)!.label:''} · `:'Listing from '}<Txt color={C.blue} size={12}>Jobicy</Txt></Txt></Tap>;
function Choice<T extends string>({options,value,onChange,label}:{options:{value:T,label:string}[],value:T,onChange:(v:T)=>void,label:string}){
 return <View style={{gap:8}}><Txt size={13} color={C.muted}>{label}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(o=><Tap key={o.label} accessibilityRole="radio" accessibilityState={{selected:o.value===value}} onPress={()=>onChange(o.value)} style={{minHeight:40,justifyContent:'center',paddingHorizontal:15,borderRadius:20,backgroundColor:o.value===value?C.blue:C.pale2}}><Txt size={14} color={o.value===value?C.white:C.ink}>{o.label}</Txt></Tap>)}</View></View>;
}
/** Tracker entry for a listing; keeps id, dates and notes when it is already tracked. */
function toApplication(j:RemoteJob,status:ApplicationStatus,existing?:Application):Application{
 return {id:existing?.id||uid('job'),title:j.title,company:j.company,location:j.location,salary:j.salary,employmentType:j.employmentType,description:j.description,sourceUrl:j.url,logoUrl:j.logo,status,createdAt:existing?.createdAt||new Date().toISOString(),appliedAt:status==='applied'?existing?.appliedAt||new Date().toISOString():existing?.appliedAt||null,notes:existing?.notes||''};
}
const Chip=({text}:{text:string})=><View style={{backgroundColor:C.pale,borderRadius:10,paddingHorizontal:10,paddingVertical:4,maxWidth:170}}><Txt size={12} color={C.blue} numberOfLines={1}>{text}</Txt></View>;
function JobCard({j,app,onOpen,onInterested,onUnmark}:{j:RemoteJob,app?:Application,onOpen:()=>void,onInterested:()=>void,onUnmark:()=>void}){
 const interested=app?.status==='interested',advanced=!!app&&!interested;
 return <SwipeAction done={!!app} onCommit={onInterested} label="Interested" doneLabel="In Brief" icon="bookmark" doneIcon="checkmark-circle">
 <Tap accessibilityRole="button" accessibilityLabel={`${j.title} at ${j.company}${app?', in Brief as '+app.status.replace('_',' '):''}`} accessibilityHint="Opens the job. Swipe left to mark as interested."
  accessibilityActions={app?[]:[{name:'interested',label:'Mark as interested'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='interested')onInterested();}}
  onPress={onOpen} style={{backgroundColor:C.white,borderRadius:18,padding:14,borderColor:C.line,borderWidth:1}}>
 <View style={{flexDirection:'row',gap:12}}>
  <CompanyLogo uri={j.logo} size={48}/>
  <View style={{flex:1,gap:2}}>
   <Txt bold size={16} numberOfLines={2}>{j.title}</Txt>
   <Txt size={14} color={C.muted} numberOfLines={1}>{j.company}</Txt>
   <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Icon name="location-outline" size={13} color={C.muted}/><Txt size={13} color={C.muted} numberOfLines={1} style={{flexShrink:1}}>{j.location}{j.employmentType?` • ${j.employmentType}`:''}</Txt></View>
  </View>
  {advanced?<View style={{alignSelf:'flex-start'}}><StatusPill status={app!.status}/></View>
  :<Tap accessibilityRole="button" accessibilityLabel={interested?'Remove from interested':'Mark as interested'} hitSlop={10} onPress={interested?onUnmark:onInterested} style={{width:32,height:32,alignItems:'center',justifyContent:'flex-start'}}><Icon name={interested?'bookmark':'bookmark-outline'} size={22} color={interested?C.blue:C.ink}/></Tap>}
 </View>
 {(!!j.salary||j.tags.length>0)&&<View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8,marginTop:12}}>
  {!!j.salary&&<View style={{flexDirection:'row',alignItems:'center',gap:5,marginRight:2}}><Icon name="cash-outline" size={16} color={C.muted}/><Txt size={13}>{j.salary}</Txt></View>}
  {j.tags.slice(0,j.salary?1:2).map(t=><Chip key={t} text={t}/>)}
 </View>}
 </Tap></SwipeAction>;
}
export function JobsScreen(){const {openJob,applications,putApp,removeApp,go}=useBrief();const [query,setQuery]=useState(''),[filters,setFilters]=useState<JobFilters>(DEFAULT_FILTERS),[draft,setDraft]=useState<JobFilters>(DEFAULT_FILTERS),[showFilters,setShowFilters]=useState(false),[jobs,setJobs]=useState<RemoteJob[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState<JobsError|null>(null),[batch,setBatch]=useState(0);
 async function refresh(q=query,f=filters){setLoading(true);setError(null);try{setJobs(await fetchRemoteJobs(q,f));setBatch(b=>b+1);}catch(e){setError(e instanceof JobsError?e:new JobsError('server',(e as Error).message));setJobs([]);}finally{setLoading(false)}}
 useEffect(()=>{void refresh();},[]);
 const filtered=filters.geo!==DEFAULT_FILTERS.geo||filters.type!==DEFAULT_FILTERS.type;
 function apply(f:JobFilters){setShowFilters(false);setFilters(f);void refresh(query,f);}
 const byUrl=useMemo(()=>new Map(applications.filter(a=>a.sourceUrl).map(a=>[a.sourceUrl,a])),[applications]);
 const usedSwipe=applications.some(a=>a.sourceUrl.includes('jobicy.com'));
 async function markInterested(j:RemoteJob){if(byUrl.has(j.url))return;await putApp(toApplication(j,'interested'));AccessibilityInfo.announceForAccessibility(`${j.title} marked as interested`);}
 function unmark(a:Application){const remove=()=>void removeApp(a.id,false);if(a.notes)Alert.alert('Remove from Brief?','This job has private notes that will be deleted.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:remove}]);else remove();}
 return <><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:120,gap:13}}><View style={{gap:2}}><Heading>Explore jobs</Heading><Txt color={C.muted}>Find your next opportunity</Txt></View>
 <View style={{flexDirection:'row',gap:8}}>
 <View style={{backgroundColor:C.pale2,flex:1,borderRadius:14,flexDirection:'row',alignItems:'center',paddingLeft:12,minHeight:46}}><Icon name="search" size={18} color={C.muted}/><TextInput accessibilityLabel="Search jobs" returnKeyType="search" clearButtonMode="never" style={{flex:1,paddingHorizontal:8,paddingVertical:10,color:C.ink,fontSize:15}} value={query} onChangeText={setQuery} placeholder="Roles or keywords" placeholderTextColor={C.soft} onSubmitEditing={()=>void refresh()}/>
 {!!query&&<Tap accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={()=>{setQuery('');void refresh('');}} style={{padding:10}}><Icon name="close-circle" size={18} color={C.soft}/></Tap>}</View>
 <Tap accessibilityRole="button" accessibilityLabel={filtered?'Filters, changed':'Filters'} onPress={()=>{setDraft(filters);setShowFilters(true);}} style={{width:46,height:46,borderRadius:14,backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name="options-outline" size={20} color={C.ink}/>{filtered&&<View style={{position:'absolute',top:10,right:10,width:7,height:7,borderRadius:4,backgroundColor:C.blue}}/>}</Tap>
 </View>
 <Credit filters={filters}/>
 {!usedSwipe&&jobs.length>0&&!loading&&!error&&<View style={{flexDirection:'row',alignItems:'center',gap:6}}><Icon name="hand-left-outline" size={14} color={C.muted}/><Txt size={12} color={C.muted}>Swipe left on a job to mark it as interested</Txt></View>}
 {loading&&<JobsSkeleton/>}
 {!loading&&error?.kind==='offline'&&<EmptyState mood="sad" title="You’re offline" body={error.message} action={{label:'Try again',icon:'refresh',onPress:()=>void refresh()}} secondary={applications.length?{label:'Open my saved jobs',onPress:()=>go('applications')}:undefined}/>}
 {!loading&&error?.kind==='server'&&<EmptyState mood="error" title="Jobs couldn’t load" body={error.message} action={{label:'Try again',icon:'refresh',onPress:()=>void refresh()}}/>}
 {!loading&&!error&&jobs.length===0&&<EmptyState mood="question" title="No jobs found" body={`Nothing matches${query?` “${query.trim()}”`:''}${filtered?' with these filters':''} right now. Jobicy lists recent remote jobs, so try a broader keyword.`} action={filtered?{label:'Reset filters',onPress:()=>apply(DEFAULT_FILTERS)}:undefined} secondary={query?{label:'Clear search',onPress:()=>{setQuery('');void refresh('');}}:undefined}/>}
 {!loading&&jobs.length>0&&<Reanimated.View key={batch} entering={ROW_IN} style={{gap:13}}>{jobs.map(j=><JobCard key={j.id} j={j} app={byUrl.get(j.url)} onOpen={()=>openJob(j)} onInterested={()=>void markInterested(j)} onUnmark={()=>unmark(byUrl.get(j.url)!)}/>)}</Reanimated.View>}
 </ScrollView>
 <Sheet visible={showFilters} onClose={()=>setShowFilters(false)} title="Filters"><View style={{gap:18}}>
 <Choice label="Open to applicants in" options={REGIONS} value={draft.geo} onChange={geo=>setDraft({...draft,geo})}/>
 <Choice label="Job type" options={TYPES} value={draft.type} onChange={type=>setDraft({...draft,type})}/>
 <View style={{flexDirection:'row',gap:10,marginTop:4}}><View style={{flex:1}}><Primary secondary label="Reset" onPress={()=>setDraft(DEFAULT_FILTERS)}/></View><View style={{flex:2}}><Primary label="Show jobs" onPress={()=>apply(draft)}/></View></View>
 </View></Sheet></>;
}
const saveOptions:{status:ApplicationStatus,title:string,sub:string,icon:string}[]=[
 {status:'interested',title:'Mark as interested',sub:'Keep it in Brief while you decide',icon:'bookmark-outline'},
 {status:'applied',title:'Mark as applied',sub:'You already applied on the listing',icon:'document-text-outline'},
];
export function JobDetailScreen(){const {selectedJob,putApp,applications,openChat,go}=useBrief();const [choose,setChoose]=useState(false);
 if(!selectedJob)return <View style={{padding:20}}><Txt>No job selected.</Txt></View>;
 const j=selectedJob;const existing=applications.find(x=>!!j.url&&x.sourceUrl===j.url);
 const asApp=(status:ApplicationStatus)=>toApplication(j,status,existing);
 async function save(status:ApplicationStatus){setChoose(false);await putApp(asApp(status));Alert.alert('Added to Brief','This updates your private tracker. It does not apply to the job for you.');go('application-detail');}
 return <View style={{flex:1}}><ScrollView contentContainerStyle={{padding:19,paddingTop:4,paddingBottom:130,gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo uri={j.logo} size={48}/><Txt bold size={16} style={{flex:1}} numberOfLines={2}>{j.company}</Txt></View>
 <Heading>{j.title}</Heading>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="location-outline" size={15} color={C.muted}/><Txt color={C.muted} size={13}>{j.location}</Txt></View>
 {!!j.employmentType&&<View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="time-outline" size={15} color={C.muted}/><Txt color={C.muted} size={13}>{j.employmentType}</Txt></View>}
 <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="cash-outline" size={15} color={j.salary?C.blue:C.muted}/><Txt color={j.salary?C.blue:C.muted} size={13} bold={!!j.salary}>{j.salary||'Salary not listed'}</Txt></View>
 </View>
 {j.tags.length>0&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{j.tags.map(t=><Chip key={t} text={t}/>)}</View>}
 {existing&&<Txt size={12} color={C.green}>In your tracker as “{existing.status.replace('_',' ')}”</Txt>}
 <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Primary label="Open listing ↗" onPress={()=>j.url?void Linking.openURL(j.url):Alert.alert('Unavailable','No original link was provided.')}/></View><View style={{flex:1}}><Primary secondary label={existing?'Update in Brief':'Add to Brief'} onPress={()=>setChoose(true)}/></View></View>
 <Card style={{padding:16}}><Txt bold size={17} style={{marginBottom:12}}>About the role</Txt><Description key={j.id} text={j.description} empty="No description supplied by the provider."/></Card>
 <Primary label="Ask Brief about this job" secondary onPress={()=>openChat(existing||{...asApp('interested'),id:'preview-'+j.id})}/>
 <Credit/>
 </ScrollView>
 <Sheet visible={choose} onClose={()=>setChoose(false)} title="Add to your applications"><View style={{gap:6}}>
 {saveOptions.map(o=><Tap key={o.status} accessibilityRole="button" onPress={()=>void save(o.status)} style={{flexDirection:'row',alignItems:'center',gap:12,padding:13,minHeight:56,borderRadius:14,backgroundColor:C.pale2}}><Icon name={o.icon} color={C.blue}/><View style={{flex:1}}><Txt bold>{o.title}</Txt><Txt size={12} color={C.muted}>{o.sub}</Txt></View><Icon name="chevron-forward" color={C.soft} size={15}/></Tap>)}
 </View></Sheet></View>;
}
