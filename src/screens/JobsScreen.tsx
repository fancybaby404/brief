import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Linking,Pressable,ScrollView,TextInput,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,Heading,Icon,Primary,StatusPill,Txt} from '../components/Ui';
import {fetchRemoteJobs} from '../lib/jobs';import {uid} from '../lib/db';import type {Application,ApplicationStatus,RemoteJob} from '../types';
export function JobsScreen(){const {openJob}=useBrief();const [query,setQuery]=useState(''),[jobs,setJobs]=useState<RemoteJob[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function refresh(q:string){setLoading(true);setError('');try{setJobs(await fetchRemoteJobs(q));}catch(e){setError(String(e));}finally{setLoading(false)}}
 useEffect(()=>{void refresh('');},[]);
 return <ScrollView contentContainerStyle={{padding:18,paddingBottom:120,gap:13}}><Heading>Explore jobs</Heading><Txt color={C.muted}>Discover remote opportunities online. Saved applications stay offline.</Txt>
 <View style={{flexDirection:'row',gap:8}}><View style={{backgroundColor:C.pale2,flex:1,borderRadius:25,flexDirection:'row',alignItems:'center',paddingHorizontal:12}}><Icon name="search" color={C.muted}/><TextInput style={{flex:1,padding:10,color:C.ink}} value={query} onChangeText={setQuery} placeholder="Roles or keywords" placeholderTextColor={C.soft} onSubmitEditing={()=>void refresh(query)}/></View><Pressable onPress={()=>void refresh(query)} style={{backgroundColor:C.pale,borderRadius:23,padding:12}}><Icon name="arrow-forward" color={C.blue}/></Pressable></View>
 <Txt color={C.muted} size={12}>{jobs.length} remote jobs · Jobicy public API</Txt>
 {loading&&<ActivityIndicator size="large" color={C.blue}/>}{!!error&&<Card><Txt color={C.danger}>{error}</Txt><Primary label="Try again" onPress={()=>void refresh(query)} secondary/></Card>}
 {jobs.map(j=><Pressable key={j.id} onPress={()=>openJob(j)} style={{backgroundColor:C.white,borderRadius:18,padding:16,gap:7,borderColor:C.line,borderWidth:1}}><Txt bold size={16}>{j.title}</Txt><Txt color={C.muted} size={13}>{j.company} · {j.location}</Txt><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Txt color={C.blue} size={12}>{j.salary}</Txt><Icon name="chevron-forward" color={C.muted}/></View></Pressable>)}
 </ScrollView>;
}
export function JobDetailScreen(){const {selectedJob,putApp,applications,openChat,go,goTab}=useBrief();const [choose,setChoose]=useState(false);
 if(!selectedJob)return <View style={{padding:20}}><Txt>No job selected.</Txt></View>;
 const j=selectedJob;
 async function save(status:ApplicationStatus){
  const existing=applications.find(x=>x.sourceUrl===j.url && !!j.url);
  const a:Application={id:existing?.id||uid('job'),title:j.title,company:j.company,location:j.location,salary:j.salary,employmentType:j.employmentType,description:j.description,sourceUrl:j.url,status,createdAt:existing?.createdAt||new Date().toISOString(),appliedAt:status==='applied'?new Date().toISOString():existing?.appliedAt||null,notes:existing?.notes||''};
  await putApp(a);setChoose(false);Alert.alert('Saved to Brief','This updates your private tracker. It does not submit a job application.');go('application-detail');
 }
 return <ScrollView contentContainerStyle={{padding:19,paddingBottom:130,gap:15}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="business-outline" color={C.blue}/><Txt bold>{j.company}</Txt></View><Heading>{j.title}</Heading><Txt color={C.muted}>{j.location}  ·  {j.employmentType}</Txt><Txt color={C.blue} bold>{j.salary}</Txt>
 <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Primary label="Open job listing ↗" onPress={()=>j.url?void Linking.openURL(j.url):Alert.alert('Unavailable','No original link was provided.')}/></View><View style={{flex:1}}><Primary secondary label="Save to Brief" onPress={()=>setChoose(!choose)}/></View></View>
 <Card><Txt bold size={16}>About the role</Txt><Txt color={C.muted} style={{marginTop:9}}>{j.description||'No description supplied by the provider.'}</Txt></Card>
 <Primary label="Ask Brief about this job" secondary onPress={()=>{const a:Application={id:'preview-'+j.id,title:j.title,company:j.company,location:j.location,salary:j.salary,employmentType:j.employmentType,description:j.description,sourceUrl:j.url,status:'saved',createdAt:new Date().toISOString(),appliedAt:null,notes:''};openChat(a)}}/>
 {choose&&<View style={{position:'absolute',bottom:95,left:14,right:14,backgroundColor:C.white,borderRadius:22,padding:17,borderWidth:1,borderColor:C.line,elevation:12,shadowOpacity:0.2,shadowRadius:13}}><Txt bold size={18}>Save to your applications</Txt>{(['saved','interested','applied'] as const).map(s=><Pressable key={s} style={{padding:14,borderBottomColor:C.line,borderBottomWidth:1}} onPress={()=>void save(s)}><Txt bold>{s==='saved'?'Save for later':s==='interested'?'Mark as interested':'Mark as applied'}</Txt></Pressable>)}<Primary secondary label="Cancel" onPress={()=>setChoose(false)}/></View>}
 </ScrollView>;
}
