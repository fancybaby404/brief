import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Linking,Modal,Pressable,ScrollView,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,Heading,Icon,Primary,Txt} from '../components/Ui';
import {fetchRemoteJobs,JOBICY_CREDIT_URL} from '../lib/jobs';import {uid} from '../lib/db';import type {Application,ApplicationStatus,RemoteJob} from '../types';
const Credit=()=><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(JOBICY_CREDIT_URL)}><Txt color={C.muted} size={12}>Remote listings from <Txt color={C.blue} size={12}>Jobicy</Txt> · needs internet</Txt></Pressable>;
export function JobsScreen(){const {openJob}=useBrief();const [query,setQuery]=useState(''),[jobs,setJobs]=useState<RemoteJob[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function refresh(q:string){setLoading(true);setError('');try{setJobs(await fetchRemoteJobs(q));}catch(e){setError((e as Error).message);}finally{setLoading(false)}}
 useEffect(()=>{void refresh('');},[]);
 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:120,gap:13}}><Heading>Explore jobs</Heading><Txt color={C.muted}>Find your next opportunity. Saved jobs stay on your phone.</Txt>
 <View style={{flexDirection:'row',gap:8}}><View style={{backgroundColor:C.pale2,flex:1,borderRadius:25,flexDirection:'row',alignItems:'center',paddingHorizontal:12}}><Icon name="search" color={C.muted}/><TextInput accessibilityLabel="Search jobs" returnKeyType="search" style={{flex:1,padding:10,color:C.ink}} value={query} onChangeText={setQuery} placeholder="Roles or keywords" placeholderTextColor={C.soft} onSubmitEditing={()=>void refresh(query)}/></View><Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={()=>void refresh(query)} style={{backgroundColor:C.pale,borderRadius:23,width:46,alignItems:'center',justifyContent:'center'}}><Icon name="arrow-forward" color={C.blue}/></Pressable></View>
 <Credit/>
 {loading&&<ActivityIndicator size="large" color={C.blue}/>}
 {!!error&&<Card style={{gap:10}}><Txt color={C.danger}>{error}</Txt><Primary label="Try again" onPress={()=>void refresh(query)} secondary/></Card>}
 {!loading&&!error&&jobs.length===0&&<Card><Txt color={C.muted}>No remote jobs found{query?` for “${query}”`:''}. Try a broader keyword.</Txt></Card>}
 {jobs.map(j=><Pressable key={j.id} accessibilityRole="button" onPress={()=>openJob(j)} style={{backgroundColor:C.white,borderRadius:18,padding:16,gap:6,borderColor:C.line,borderWidth:1}}><Txt bold size={16}>{j.title}</Txt><Txt color={C.muted} size={13}>{j.company} · {j.location}{j.employmentType?` · ${j.employmentType}`:''}</Txt><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Txt color={j.salary?C.blue:C.muted} size={12}>{j.salary||'Salary not listed'}</Txt><Icon name="chevron-forward" color={C.muted}/></View></Pressable>)}
 </ScrollView>;
}
const saveOptions:{status:ApplicationStatus,title:string,sub:string,icon:string}[]=[
 {status:'saved',title:'Save for later',sub:'Bookmark it in Brief',icon:'bookmark-outline'},
 {status:'interested',title:'Mark as interested',sub:'You might apply',icon:'heart-outline'},
 {status:'applied',title:'Mark as applied',sub:'You already applied on the listing',icon:'document-text-outline'},
];
export function JobDetailScreen(){const {selectedJob,putApp,applications,openChat,go}=useBrief();const [choose,setChoose]=useState(false);const insets=useSafeAreaInsets();
 if(!selectedJob)return <View style={{padding:20}}><Txt>No job selected.</Txt></View>;
 const j=selectedJob;const existing=applications.find(x=>!!j.url&&x.sourceUrl===j.url);
 const asApp=(status:ApplicationStatus):Application=>({id:existing?.id||uid('job'),title:j.title,company:j.company,location:j.location,salary:j.salary,employmentType:j.employmentType,description:j.description,sourceUrl:j.url,status,createdAt:existing?.createdAt||new Date().toISOString(),appliedAt:status==='applied'?existing?.appliedAt||new Date().toISOString():existing?.appliedAt||null,notes:existing?.notes||''});
 async function save(status:ApplicationStatus){setChoose(false);await putApp(asApp(status));Alert.alert('Saved to Brief','This updates your private tracker. It does not apply to the job for you.');go('application-detail');}
 return <View style={{flex:1}}><ScrollView contentContainerStyle={{padding:19,paddingBottom:130,gap:14}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="business-outline" color={C.blue}/><Txt bold>{j.company}</Txt></View><Heading>{j.title}</Heading>
 <Txt color={C.muted}>{j.location}{j.employmentType?`  ·  ${j.employmentType}`:''}</Txt><Txt color={j.salary?C.blue:C.muted} bold={!!j.salary}>{j.salary||'Salary not listed'}</Txt>
 {existing&&<Txt size={12} color={C.green}>In your tracker as “{existing.status.replace('_',' ')}”</Txt>}
 <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Primary label="Open job listing ↗" onPress={()=>j.url?void Linking.openURL(j.url):Alert.alert('Unavailable','No original link was provided.')}/></View><View style={{flex:1}}><Primary secondary label={existing?'Update in Brief':'Save to Brief'} onPress={()=>setChoose(true)}/></View></View>
 <Card><Txt bold size={16}>About the role</Txt><Txt color={C.muted} style={{marginTop:9}}>{j.description||'No description supplied by the provider.'}</Txt></Card>
 <Primary label="Ask Brief about this job" secondary onPress={()=>openChat(existing||{...asApp('saved'),id:'preview-'+j.id})}/>
 <Credit/>
 </ScrollView>
 <Modal visible={choose} transparent animationType="slide" onRequestClose={()=>setChoose(false)}>
 <Pressable accessibilityLabel="Close" style={{flex:1,backgroundColor:'rgba(9,25,45,0.28)'}} onPress={()=>setChoose(false)}/>
 <View style={{backgroundColor:C.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,paddingBottom:Math.max(insets.bottom,16)+4,gap:4}}>
 <View style={{alignSelf:'center',width:38,height:5,borderRadius:3,backgroundColor:C.line,marginBottom:8}}/>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><Txt bold size={18}>Save to your applications</Txt><Pressable accessibilityLabel="Close" hitSlop={12} onPress={()=>setChoose(false)}><Icon name="close" color={C.muted}/></Pressable></View>
 {saveOptions.map(o=><Pressable key={o.status} accessibilityRole="button" onPress={()=>void save(o.status)} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,padding:13,borderRadius:14,backgroundColor:pressed?C.pale:C.pale2})}><Icon name={o.icon} color={C.blue}/><View style={{flex:1}}><Txt bold>{o.title}</Txt><Txt size={12} color={C.muted}>{o.sub}</Txt></View><Icon name="chevron-forward" color={C.soft} size={15}/></Pressable>)}
 </View>
 </Modal></View>;
}
