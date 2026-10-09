import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,ScrollView,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,Field,Heading,Icon,Primary,Txt,Tap} from '../components/Ui';import {uid} from '../lib/db';
import {pickJobImage,recognizeJobImage} from '../lib/imports';import {extractJob,MODEL_MISSING} from '../lib/ai';
import {InlineError} from '../components/States';import type {ApplicationStatus} from '../types';
export function AddJobScreen(){const {putApp,go,takeAddJobIntent}=useBrief();
 const [company,setCompany]=useState(''),[title,setTitle]=useState(''),[location,setLocation]=useState(''),[salary,setSalary]=useState(''),[employmentType,setEmploymentType]=useState(''),[description,setDescription]=useState(''),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[ocrText,setOcrText]=useState('');
 const [step,setStep]=useState(''),[importError,setImportError]=useState(''),[aiNote,setAiNote]=useState<''|'missing'|'failed'>(''),lastCamera=useRef(false);
 /** Screenshot/photo → on-device OCR → on-device extraction. Each stage is shown; failures stay inline and keep what worked. */
 async function imageImport(camera=false){lastCamera.current=camera;setImportError('');setAiNote('');
  let uri:string|null=null;
  try{uri=await pickJobImage(camera);}catch(e){setImportError((e as Error).message);return;}
  if(!uri)return;
  setBusy(true);
  try{
   setStep('Reading text from your screenshot…');
   const text=await recognizeJobImage(uri);setOcrText(text);setDescription(text);
   setStep('Filling in the details with on-device AI…');
   try{const x=await extractJob(text);setCompany(x.company);setTitle(x.title);setLocation(x.location);setSalary(x.salary);setEmploymentType(x.employmentType);setDescription(x.description);}
   catch(e){setAiNote((e as Error).message===MODEL_MISSING?'missing':'failed');}
  }catch(e){setImportError((e as Error).message);}
  finally{setBusy(false);setStep('');}
 }
 // Started from an onboarding shortcut: jump straight into the chosen import.
 useEffect(()=>{const i=takeAddJobIntent();if(i==='library')void imageImport();else if(i==='camera')void imageImport(true);},[]);
 async function save(){if(!company.trim()||!title.trim()){Alert.alert('Missing fields','Company and position are required.');return;}
 await putApp({id:uid('application'),company:company.trim(),title:title.trim(),location,salary,employmentType,description,sourceUrl:url,status:'interested',createdAt:new Date().toISOString(),appliedAt:null,notes:''});go('application-detail');}
 return <ScrollView contentContainerStyle={{padding:18,paddingBottom:140,gap:13}}><Heading>Add job</Heading><Txt color={C.muted}>Add manually, or import text from a screenshot. Nothing is submitted to an employer.</Txt>
 <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Primary secondary label="From photo library" onPress={()=>void imageImport()}/></View><View style={{flex:1}}><Primary secondary label="Take photo" onPress={()=>void imageImport(true)}/></View></View>
 {busy&&<View accessibilityRole="progressbar" accessibilityLabel={step} style={{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.pale,borderRadius:16,padding:14}}><ActivityIndicator color={C.blue}/><Txt size={14} style={{flex:1}}>{step}</Txt></View>}
 {!!importError&&!busy&&<InlineError message={importError} onRetry={()=>void imageImport(lastCamera.current)}/>}
 {!busy&&!!ocrText&&!aiNote&&<View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Icon name="checkmark-circle" size={17} color={C.green}/><Txt size={13} color={C.green} style={{flex:1}}>Details filled in from your screenshot. Check every field before saving.</Txt></View>}
 {!busy&&aiNote==='missing'&&<View style={{gap:8,backgroundColor:C.pale,borderRadius:16,padding:14}}><Txt size={14}>Text read from your screenshot. On-device AI isn’t set up, so fill in the fields below — the full text is in the description.</Txt><Tap accessibilityRole="button" onPress={()=>go('settings')} style={{alignSelf:'flex-start',minHeight:32,justifyContent:'center'}}><Txt bold size={14} color={C.blue}>Set up on-device AI</Txt></Tap></View>}
 {!busy&&aiNote==='failed'&&<View style={{backgroundColor:C.pale,borderRadius:16,padding:14}}><Txt size={14}>Text read, but the AI couldn’t sort it into fields. Fill them in below — the full text is in the description.</Txt></View>}
 <Card><Field label="Company *" value={company} onChangeText={setCompany} placeholder="e.g. Notion"/><Field label="Position *" value={title} onChangeText={setTitle} placeholder="e.g. Product Manager"/><Field label="Location" value={location} onChangeText={setLocation}/><Field label="Salary (optional)" value={salary} onChangeText={setSalary}/><Field label="Employment type" value={employmentType} onChangeText={setEmploymentType}/><Field label="Source URL (optional)" value={url} onChangeText={setUrl} placeholder="https://..."/><Field label="Job description / original screenshot text" value={description} onChangeText={setDescription} multiline/></Card>
 <Primary label="Add to Brief" onPress={()=>void save()}/>
 <Txt size={12} color={C.muted} style={{textAlign:'center'}}>You can update its status after adding it.</Txt>
 </ScrollView>;
}
