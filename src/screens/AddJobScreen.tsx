import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,ScrollView,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,Field,Heading,Icon,Primary,Txt,Tap} from '../components/Ui';import {uid} from '../lib/db';
import {pickJobImage,recognizeJobImage} from '../lib/imports';import {extractJob} from '../lib/ai';import type {ApplicationStatus} from '../types';
export function AddJobScreen(){const {putApp,go,takeAddJobIntent}=useBrief();
 const [company,setCompany]=useState(''),[title,setTitle]=useState(''),[location,setLocation]=useState(''),[salary,setSalary]=useState(''),[employmentType,setEmploymentType]=useState(''),[description,setDescription]=useState(''),[url,setUrl]=useState(''),[status,setStatus]=useState<ApplicationStatus>('interested'),[busy,setBusy]=useState(false),[ocrText,setOcrText]=useState('');
 async function imageImport(camera=false){setBusy(true);try{const uri=await pickJobImage(camera);if(!uri)return;const text=await recognizeJobImage(uri);setOcrText(text);setDescription(text);
 try{const x=await extractJob(text);setCompany(x.company);setTitle(x.title);setLocation(x.location);setSalary(x.salary);setEmploymentType(x.employmentType);setDescription(x.description);}catch(e){Alert.alert('Text extracted','Brief could read the image, but structured extraction needs a working local model. Review and enter any missing information manually.');}
 }catch(e){Alert.alert('Could not import image',String(e));}finally{setBusy(false);}}
 // Started from an onboarding shortcut: jump straight into the chosen import.
 useEffect(()=>{const i=takeAddJobIntent();if(i==='library')void imageImport();else if(i==='camera')void imageImport(true);},[]);
 async function save(){if(!company.trim()||!title.trim()){Alert.alert('Missing fields','Company and position are required.');return;}
 await putApp({id:uid('application'),company:company.trim(),title:title.trim(),location,salary,employmentType,description,sourceUrl:url,status,createdAt:new Date().toISOString(),appliedAt:status==='applied'?new Date().toISOString():null,notes:''});go('application-detail');}
 return <ScrollView contentContainerStyle={{padding:18,paddingBottom:140,gap:13}}><Heading>Add job</Heading><Txt color={C.muted}>Add manually, or import text from a screenshot. Nothing is submitted to an employer.</Txt>
 <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Primary secondary label="From photo library" onPress={()=>void imageImport()}/></View><View style={{flex:1}}><Primary secondary label="Take photo" onPress={()=>void imageImport(true)}/></View></View>
 {busy&&<ActivityIndicator size="large" color={C.blue}/>} {!!ocrText&&<Txt size={11} color={C.green}>Screenshot text extracted. Please review all fields before saving.</Txt>}
 <Card><Field label="Company *" value={company} onChangeText={setCompany} placeholder="e.g. Notion"/><Field label="Position *" value={title} onChangeText={setTitle} placeholder="e.g. Product Manager"/><Field label="Location" value={location} onChangeText={setLocation}/><Field label="Salary (optional)" value={salary} onChangeText={setSalary}/><Field label="Employment type" value={employmentType} onChangeText={setEmploymentType}/><Field label="Source URL (optional)" value={url} onChangeText={setUrl} placeholder="https://..."/><Field label="Job description / original screenshot text" value={description} onChangeText={setDescription} multiline/></Card>
 <Card><Txt bold>Have you applied already?</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:13}}>{(['interested','applied','under_review','interview'] as const).map(s=><Tap key={s} onPress={()=>setStatus(s)} style={{padding:10,backgroundColor:status===s?C.blue:C.pale,borderRadius:17}}><Txt color={status===s?C.white:C.blue} size={12}>{s.replace('_',' ')}</Txt></Tap>)}</View></Card>
 <Primary label="Save to applications" onPress={()=>void save()}/>
 </ScrollView>;
}
