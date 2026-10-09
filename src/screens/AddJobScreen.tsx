import React,{useRef,useState} from 'react';
import {ActivityIndicator,Alert,Keyboard,View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useBrief,type AddJobIntent} from '../lib/appContext';
import {C} from '../theme/tokens';
import {Field,Icon,Input,Primary,Sheet,Tap,Txt} from '../components/Ui';
import {CameraPanel} from '../components/CameraPanel';
import {extractJob,MODEL_MISSING} from '../lib/ai';
import {readJobListing,recognizeJobImage} from '../lib/imports';
import {uid} from '../lib/db';
import type {Application} from '../types';

type JobFields={company:string,title:string,location:string,salary:string,employmentType:string,description:string,sourceUrl:string};
const EMPTY:JobFields={company:'',title:'',location:'',salary:'',employmentType:'',description:'',sourceUrl:''};
type SheetMode='manual'|'link'|'link-loading'|'review'|'processing'|null;

/** Root-owned Add Job flow. Quick actions open this without changing the current tab. */
export function AddJobScreen({intent,onClose}:{intent:AddJobIntent,onClose:()=>void}){
 const {putApp,go}=useBrief();
 const taskId=useRef(0);
 const afterSheetClose=useRef<(()=>void)|null>(null);
 const [mode,setMode]=useState<SheetMode>(intent==='manual'?'manual':intent==='link'?'link':null);
 const modeRef=useRef(mode);modeRef.current=mode;
 const [cameraOpen,setCameraOpen]=useState(intent==='camera'||intent==='library');
 const [fields,setFields]=useState<JobFields>(EMPTY),[more,setMore]=useState(false),[saving,setSaving]=useState(false);
 const [link,setLink]=useState(''),[linkError,setLinkError]=useState(''),[reviewNote,setReviewNote]=useState(''),[validation,setValidation]=useState('');

 function set<K extends keyof JobFields>(key:K,value:JobFields[K]){setFields(current=>({...current,[key]:value}));if(validation)setValidation('');}
 function dismissSheet(after=onClose){
  if(modeRef.current===null){after();return;}
  afterSheetClose.current=after;setMode(null);
 }
 function closeFlow(){
  const changed=Object.values(fields).some(Boolean)||!!link.trim();
  const discard=()=>{taskId.current++;dismissSheet();};
  if(changed){const previousMode=mode;setMode(null);Alert.alert('Discard this job?','Your unsaved details will be lost.',[{text:'Keep editing',style:'cancel',onPress:()=>setMode(previousMode)},{text:'Discard',style:'destructive',onPress:discard}]);return;}
  discard();
 }
 async function processImage(uri:string){
  const current=++taskId.current;setCameraOpen(false);setMode('processing');setReviewNote('');setValidation('');setFields(EMPTY);
  let text='';
  try{
   text=await recognizeJobImage(uri);
   if(current!==taskId.current)return;
   setFields(current=>({...current,description:text}));
   try{
    const result=await extractJob(text);
    if(current!==taskId.current)return;
    setFields({...EMPTY,...result});setReviewNote('Check the extracted details before saving.');
   }catch(error){
    if(current!==taskId.current)return;
    setReviewNote((error as Error).message===MODEL_MISSING?'Text was read from the image. On-device AI is not set up, so check the required fields.':'Text was read, but local AI could not sort the fields. Check them before saving.');
   }
  }catch(error){if(current===taskId.current)setReviewNote((error as Error).message||'The image could not be read. Enter the job details below.');}
  finally{if(current===taskId.current)setMode('review');}
 }
 async function processLink(){
  const current=++taskId.current;Keyboard.dismiss();setLinkError('');setReviewNote('');setMode('link-loading');
  try{
   const listing=await readJobListing(link.trim());
   if(current!==taskId.current)return;
   setFields({...EMPTY,sourceUrl:listing.url,description:listing.text});
   try{
    const result=await extractJob(listing.text);
    if(current!==taskId.current)return;
    setFields({...EMPTY,...result,sourceUrl:listing.url});setReviewNote('Check the extracted details before saving.');
   }catch(error){
    if(current!==taskId.current)return;
    setReviewNote((error as Error).message===MODEL_MISSING?'Listing text was read. On-device AI is not set up, so check the required fields.':'Listing text was read, but local AI could not sort the fields. Check them before saving.');
   }
   setMode('review');
  }catch(error){if(current===taskId.current){setLinkError((error as Error).message||'This listing could not be read. Enter the details manually.');setMode('link');}}
 }
 function manualFallback(){setFields(current=>({...EMPTY,sourceUrl:link.trim()}));setMode('manual');setMore(false);setLinkError('');}
 async function save(){
  if(saving)return;
  if(!fields.company.trim()||!fields.title.trim()){setValidation('Company and position are required.');return;}
  const application:Application={id:uid('application'),company:fields.company.trim(),title:fields.title.trim(),location:fields.location.trim(),salary:fields.salary.trim(),employmentType:fields.employmentType.trim(),description:fields.description.trim(),sourceUrl:fields.sourceUrl.trim(),status:'interested',createdAt:new Date().toISOString(),appliedAt:null,notes:''};
  setSaving(true);
  try{await putApp(application);dismissSheet(()=>{onClose();go('application-detail');});}
  catch(error){setValidation((error as Error).message||'This job could not be saved. Please try again.');}
  finally{setSaving(false);}
 }
 const saveButton=<Primary large label={saving?'Saving…':'Save Job'} disabled={!fields.company.trim()||!fields.title.trim()||saving} onPress={()=>void save()}/>;
 const sheetTitle=mode==='manual'?'Add job':mode==='link'?'Paste job link':mode==='review'?'Review job':mode==='processing'?'Reading photo':'Reading job link';
 const sheetFooter=mode==='manual'||mode==='review'?saveButton:mode==='link'?<View style={{gap:10}}>{linkError?<View accessibilityRole="alert"><Txt size={13} color={C.danger}>{linkError}</Txt></View>:null}<Primary large label="Continue" disabled={!link.trim()} onPress={()=>void processLink()}/>{!!linkError&&<Tap accessibilityRole="button" onPress={manualFallback} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Txt size={14} bold color={C.blue}>Enter manually</Txt></Tap>}</View>:undefined;
 const manualFields=<View>
  <Field label="Company *" value={fields.company} onChangeText={value=>set('company',value)} placeholder="Company name"/>
  <Field label="Position *" value={fields.title} onChangeText={value=>set('title',value)} placeholder="Job title"/>
  <Field label="Job description / notes" value={fields.description} onChangeText={value=>set('description',value)} placeholder="Add details if you have them" multiline/>
  <Tap accessibilityRole="button" accessibilityState={{expanded:more}} onPress={()=>setMore(value=>!value)} style={{minHeight:46,flexDirection:'row',alignItems:'center',gap:8}}><Txt bold size={14} color={C.blue}>More details</Txt><Icon name={more?'chevron-up':'chevron-down'} size={17} color={C.blue}/></Tap>
  {more&&<View><Field label="Location" value={fields.location} onChangeText={value=>set('location',value)} placeholder="City, region, or remote"/><Field label="Salary" value={fields.salary} onChangeText={value=>set('salary',value)} placeholder="As listed"/><Field label="Employment type" value={fields.employmentType} onChangeText={value=>set('employmentType',value)} placeholder="Full-time, contract…"/><Field label="Source URL" value={fields.sourceUrl} onChangeText={value=>set('sourceUrl',value)} placeholder="https://…"/></View>}
  {!!validation&&<View accessibilityRole="alert"><Txt size={13} color={C.danger}>{validation}</Txt></View>}
 </View>;
 const reviewFields=<View>
  {!!reviewNote&&<Txt size={13} color={C.muted} style={{marginBottom:12}}>{reviewNote}</Txt>}
  <Field label="Company *" value={fields.company} onChangeText={value=>set('company',value)} placeholder="Company name"/>
  <Field label="Position *" value={fields.title} onChangeText={value=>set('title',value)} placeholder="Job title"/>
  <Field label="Location" value={fields.location} onChangeText={value=>set('location',value)} placeholder="City, region, or remote"/>
  <Field label="Salary" value={fields.salary} onChangeText={value=>set('salary',value)} placeholder="As listed"/>
  <Field label="Employment type" value={fields.employmentType} onChangeText={value=>set('employmentType',value)} placeholder="Full-time, contract…"/>
  <Field label="Job description / notes" value={fields.description} onChangeText={value=>set('description',value)} placeholder="Details from the listing" multiline/>
  <Field label="Source URL" value={fields.sourceUrl} onChangeText={value=>set('sourceUrl',value)} placeholder="https://…"/>
  {!!validation&&<View accessibilityRole="alert"><Txt size={13} color={C.danger}>{validation}</Txt></View>}
 </View>;

 return <>
  {cameraOpen&&<CameraPanel onClose={closeFlow} onUsePhoto={uri=>void processImage(uri)} startWithGallery={intent==='library'}/>}
  <Sheet scroll visible={mode!==null} onClose={closeFlow} onAfterClose={()=>{const after=afterSheetClose.current;afterSheetClose.current=null;after?.();}} title={sheetTitle} footer={sheetFooter}>
   {mode==='manual'?<KeyboardAvoidingView behavior="padding">{manualFields}</KeyboardAvoidingView>
    :mode==='review'?<KeyboardAvoidingView behavior="padding">{reviewFields}</KeyboardAvoidingView>
    :mode==='link'?<KeyboardAvoidingView behavior="padding"><Input value={link} onChangeText={value=>{setLink(value);setLinkError('');}} placeholder="https://…"/></KeyboardAvoidingView>
    :<View accessibilityRole="progressbar" style={{minHeight:75,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator color={C.blue}/><Txt size={14} color={C.muted}>{mode==='processing'?'Reading text and filling in details…':'Loading listing and checking its details…'}</Txt></View>}
  </Sheet>
 </>;
}
