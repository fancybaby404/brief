import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Linking,ScrollView,TextInput,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,CompanyLogo,Heading,Icon,Primary,Sheet,Tap,Txt} from '../components/Ui';
import {Description} from '../components/Description';
import {fetchRemoteJobs,DEFAULT_FILTERS,JOBICY_CREDIT_URL,type JobFilters} from '../lib/jobs';import {uid} from '../lib/db';import type {Application,ApplicationStatus,RemoteJob} from '../types';
const REGIONS:{value:JobFilters['geo'],label:string,phrase:string}[]=[{value:'philippines',label:'Philippines',phrase:'the Philippines'},{value:'apac',label:'Asia-Pacific',phrase:'Asia-Pacific'},{value:'',label:'All regions',phrase:'any region'}];
const TYPES:{value:JobFilters['type'],label:string}[]=[{value:'',label:'Any'},{value:'Full-Time',label:'Full-time'},{value:'Part-Time',label:'Part-time'},{value:'Contract',label:'Contract'}];
const Credit=({filters}:{filters?:JobFilters})=><Tap accessibilityRole="link" onPress={()=>void Linking.openURL(JOBICY_CREDIT_URL)}><Txt color={C.muted} size={12}>{filters?`Remote jobs open to ${REGIONS.find(r=>r.value===filters.geo)!.phrase}${filters.type?' · '+TYPES.find(t=>t.value===filters.type)!.label:''} · `:'Listing from '}<Txt color={C.blue} size={12}>Jobicy</Txt></Txt></Tap>;
function Choice<T extends string>({options,value,onChange,label}:{options:{value:T,label:string}[],value:T,onChange:(v:T)=>void,label:string}){
 return <View style={{gap:8}}><Txt size={13} color={C.muted}>{label}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(o=><Tap key={o.label} accessibilityRole="radio" accessibilityState={{selected:o.value===value}} onPress={()=>onChange(o.value)} style={{minHeight:40,justifyContent:'center',paddingHorizontal:15,borderRadius:20,backgroundColor:o.value===value?C.blue:C.pale2}}><Txt size={14} color={o.value===value?C.white:C.ink}>{o.label}</Txt></Tap>)}</View></View>;
}
export function JobsScreen(){const {openJob}=useBrief();const [query,setQuery]=useState(''),[filters,setFilters]=useState<JobFilters>(DEFAULT_FILTERS),[draft,setDraft]=useState<JobFilters>(DEFAULT_FILTERS),[showFilters,setShowFilters]=useState(false),[jobs,setJobs]=useState<RemoteJob[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function refresh(q=query,f=filters){setLoading(true);setError('');try{setJobs(await fetchRemoteJobs(q,f));}catch(e){setError((e as Error).message);}finally{setLoading(false)}}
 useEffect(()=>{void refresh();},[]);
 const filtered=filters.geo!==DEFAULT_FILTERS.geo||filters.type!==DEFAULT_FILTERS.type;
 function apply(f:JobFilters){setShowFilters(false);setFilters(f);void refresh(query,f);}
 return <><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:120,gap:13}}><View style={{gap:2}}><Heading>Explore jobs</Heading><Txt color={C.muted}>Find your next opportunity</Txt></View>
 <View style={{flexDirection:'row',gap:8}}>
 <View style={{backgroundColor:C.pale2,flex:1,borderRadius:14,flexDirection:'row',alignItems:'center',paddingLeft:12,minHeight:46}}><Icon name="search" size={18} color={C.muted}/><TextInput accessibilityLabel="Search jobs" returnKeyType="search" clearButtonMode="never" style={{flex:1,paddingHorizontal:8,paddingVertical:10,color:C.ink,fontSize:15}} value={query} onChangeText={setQuery} placeholder="Roles or keywords" placeholderTextColor={C.soft} onSubmitEditing={()=>void refresh()}/>
 {!!query&&<Tap accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={()=>{setQuery('');void refresh('');}} style={{padding:10}}><Icon name="close-circle" size={18} color={C.soft}/></Tap>}</View>
 <Tap accessibilityRole="button" accessibilityLabel={filtered?'Filters, changed':'Filters'} onPress={()=>{setDraft(filters);setShowFilters(true);}} style={{width:46,height:46,borderRadius:14,backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name="options-outline" size={20} color={C.ink}/>{filtered&&<View style={{position:'absolute',top:10,right:10,width:7,height:7,borderRadius:4,backgroundColor:C.blue}}/>}</Tap>
 </View>
 <Credit filters={filters}/>
 {loading&&<ActivityIndicator size="large" color={C.blue} style={{marginTop:8}}/>}
 {!!error&&<Card style={{gap:10}}><Txt color={C.danger}>{error}</Txt><Primary label="Try again" onPress={()=>void refresh()} secondary/></Card>}
 {!loading&&!error&&jobs.length===0&&<Card style={{gap:10}}><Txt color={C.muted}>No jobs match{query?` “${query}”`:''} with these filters.</Txt>{filtered&&<Primary secondary label="Reset filters" onPress={()=>apply(DEFAULT_FILTERS)}/>}</Card>}
 {!loading&&jobs.map(j=><Tap key={j.id} accessibilityRole="button" onPress={()=>openJob(j)} style={{backgroundColor:C.white,borderRadius:18,padding:14,flexDirection:'row',gap:12,borderColor:C.line,borderWidth:1}}>
 <CompanyLogo uri={j.logo} size={44}/>
 <View style={{flex:1,gap:3}}><Txt bold size={16} numberOfLines={2}>{j.title}</Txt><Txt color={C.muted} size={13} numberOfLines={1}>{j.company}</Txt><Txt color={C.muted} size={12} numberOfLines={1}>{j.location}{j.employmentType?` · ${j.employmentType}`:''}</Txt>{!!j.salary&&<Txt color={C.blue} size={12}>{j.salary}</Txt>}</View>
 <Icon name="chevron-forward" color={C.soft} size={16}/></Tap>)}
 </ScrollView>
 <Sheet visible={showFilters} onClose={()=>setShowFilters(false)} title="Filters"><View style={{gap:18}}>
 <Choice label="Open to applicants in" options={REGIONS} value={draft.geo} onChange={geo=>setDraft({...draft,geo})}/>
 <Choice label="Job type" options={TYPES} value={draft.type} onChange={type=>setDraft({...draft,type})}/>
 <View style={{flexDirection:'row',gap:10,marginTop:4}}><View style={{flex:1}}><Primary secondary label="Reset" onPress={()=>setDraft(DEFAULT_FILTERS)}/></View><View style={{flex:2}}><Primary label="Show jobs" onPress={()=>apply(draft)}/></View></View>
 </View></Sheet></>;
}
const saveOptions:{status:ApplicationStatus,title:string,sub:string,icon:string}[]=[
 {status:'saved',title:'Save for later',sub:'Bookmark it in Brief',icon:'bookmark-outline'},
 {status:'interested',title:'Mark as interested',sub:'You might apply',icon:'heart-outline'},
 {status:'applied',title:'Mark as applied',sub:'You already applied on the listing',icon:'document-text-outline'},
];
export function JobDetailScreen(){const {selectedJob,putApp,applications,openChat,go}=useBrief();const [choose,setChoose]=useState(false);
 if(!selectedJob)return <View style={{padding:20}}><Txt>No job selected.</Txt></View>;
 const j=selectedJob;const existing=applications.find(x=>!!j.url&&x.sourceUrl===j.url);
 const asApp=(status:ApplicationStatus):Application=>({id:existing?.id||uid('job'),title:j.title,company:j.company,location:j.location,salary:j.salary,employmentType:j.employmentType,description:j.description,sourceUrl:j.url,logoUrl:j.logo,status,createdAt:existing?.createdAt||new Date().toISOString(),appliedAt:status==='applied'?existing?.appliedAt||new Date().toISOString():existing?.appliedAt||null,notes:existing?.notes||''});
 async function save(status:ApplicationStatus){setChoose(false);await putApp(asApp(status));Alert.alert('Saved to Brief','This updates your private tracker. It does not apply to the job for you.');go('application-detail');}
 return <View style={{flex:1}}><ScrollView contentContainerStyle={{padding:19,paddingTop:4,paddingBottom:130,gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo uri={j.logo} size={48}/><Txt bold size={16} style={{flex:1}} numberOfLines={2}>{j.company}</Txt></View>
 <Heading>{j.title}</Heading>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="location-outline" size={15} color={C.muted}/><Txt color={C.muted} size={13}>{j.location}</Txt></View>
 {!!j.employmentType&&<View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="time-outline" size={15} color={C.muted}/><Txt color={C.muted} size={13}>{j.employmentType}</Txt></View>}
 <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Icon name="cash-outline" size={15} color={j.salary?C.blue:C.muted}/><Txt color={j.salary?C.blue:C.muted} size={13} bold={!!j.salary}>{j.salary||'Salary not listed'}</Txt></View>
 </View>
 {existing&&<Txt size={12} color={C.green}>In your tracker as “{existing.status.replace('_',' ')}”</Txt>}
 <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Primary label="Open listing ↗" onPress={()=>j.url?void Linking.openURL(j.url):Alert.alert('Unavailable','No original link was provided.')}/></View><View style={{flex:1}}><Primary secondary label={existing?'Update in Brief':'Save to Brief'} onPress={()=>setChoose(true)}/></View></View>
 <Card style={{padding:16}}><Txt bold size={17} style={{marginBottom:12}}>About the role</Txt><Description key={j.id} text={j.description} empty="No description supplied by the provider."/></Card>
 <Primary label="Ask Brief about this job" secondary onPress={()=>openChat(existing||{...asApp('saved'),id:'preview-'+j.id})}/>
 <Credit/>
 </ScrollView>
 <Sheet visible={choose} onClose={()=>setChoose(false)} title="Save to your applications"><View style={{gap:6}}>
 {saveOptions.map(o=><Tap key={o.status} accessibilityRole="button" onPress={()=>void save(o.status)} style={{flexDirection:'row',alignItems:'center',gap:12,padding:13,minHeight:56,borderRadius:14,backgroundColor:C.pale2}}><Icon name={o.icon} color={C.blue}/><View style={{flex:1}}><Txt bold>{o.title}</Txt><Txt size={12} color={C.muted}>{o.sub}</Txt></View><Icon name="chevron-forward" color={C.soft} size={15}/></Tap>)}
 </View></Sheet></View>;
}
