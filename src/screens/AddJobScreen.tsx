import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,Keyboard,Linking,Modal,StatusBar,StyleSheet,View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView,useCameraPermissions,type FlashMode} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {useBrief,type AddJobIntent} from '../lib/appContext';
import {C} from '../theme/tokens';
import {Field,Icon,Input,Primary,Sheet,Tap,Txt,useReducedMotion} from '../components/Ui';
import {extractJob,MODEL_MISSING} from '../lib/ai';
import {pickJobImage,readJobListing,recognizeJobImage} from '../lib/imports';
import {uid} from '../lib/db';
import type {Application} from '../types';

type JobFields={company:string,title:string,location:string,salary:string,employmentType:string,description:string,sourceUrl:string};
const EMPTY:JobFields={company:'',title:'',location:'',salary:'',employmentType:'',description:'',sourceUrl:''};
type SheetMode='manual'|'link'|'link-loading'|'review'|'processing'|null;

/** Root-owned Add Job flow. Quick actions open this without changing the current tab. */
export function AddJobScreen({intent,onClose}:{intent:AddJobIntent,onClose:()=>void}){
 const {putApp,go}=useBrief();
 const taskId=useRef(0);
 const [mode,setMode]=useState<SheetMode>(intent==='manual'?'manual':intent==='link'?'link':null);
 const [cameraOpen,setCameraOpen]=useState(intent==='camera'||intent==='library');
 const [fields,setFields]=useState<JobFields>(EMPTY),[more,setMore]=useState(false),[saving,setSaving]=useState(false);
 const [link,setLink]=useState(''),[linkError,setLinkError]=useState(''),[reviewNote,setReviewNote]=useState(''),[validation,setValidation]=useState('');

 function set<K extends keyof JobFields>(key:K,value:JobFields[K]){setFields(current=>({...current,[key]:value}));if(validation)setValidation('');}
 function closeFlow(){
  const changed=Object.values(fields).some(Boolean)||!!link.trim();
  const discard=()=>{taskId.current++;onClose();};
  if(changed){Alert.alert('Discard this job?','Your unsaved details will be lost.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:discard}]);return;}
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
  try{await putApp(application);onClose();go('application-detail');}
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
  {cameraOpen&&<CameraCapture onClose={closeFlow} onUsePhoto={uri=>void processImage(uri)} startWithGallery={intent==='library'}/>}
  <Sheet scroll visible={mode!==null} onClose={closeFlow} title={sheetTitle} footer={sheetFooter}>
   {mode==='manual'?<KeyboardAvoidingView behavior="padding">{manualFields}</KeyboardAvoidingView>
    :mode==='review'?<KeyboardAvoidingView behavior="padding">{reviewFields}</KeyboardAvoidingView>
    :mode==='link'?<KeyboardAvoidingView behavior="padding"><Input value={link} onChangeText={value=>{setLink(value);setLinkError('');}} placeholder="https://…"/></KeyboardAvoidingView>
    :<View accessibilityRole="progressbar" style={{minHeight:75,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator color={C.blue}/><Txt size={14} color={C.muted}>{mode==='processing'?'Reading text and filling in details…':'Loading listing and checking its details…'}</Txt></View>}
  </Sheet>
 </>;
}

function CameraCapture({onClose,onUsePhoto,startWithGallery=false}:{onClose:()=>void,onUsePhoto:(uri:string)=>void,startWithGallery?:boolean}){
 const reduce=useReducedMotion();
 const [permission,requestPermission]=useCameraPermissions();
 const [photo,setPhoto]=useState(''),[flash,setFlash]=useState<FlashMode>('off'),[cameraReady,setCameraReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const camera=useRef<CameraView>(null),requested=useRef(false),galleryOpened=useRef(false);
 async function chooseGallery(){try{const uri=await pickJobImage();if(uri){setError('');setPhoto(uri);}else if(startWithGallery)onClose();}catch(e){setError((e as Error).message||'The photo library could not be opened.');}}
 useEffect(()=>{if(startWithGallery&&!galleryOpened.current){galleryOpened.current=true;void chooseGallery();}else if(!startWithGallery&&permission&&!permission.granted&&permission.canAskAgain&&!requested.current){requested.current=true;void requestPermission();}},[permission?.granted,startWithGallery]);
 async function capture(){if(!camera.current||!cameraReady||busy)return;setBusy(true);setError('');try{const result=await camera.current.takePictureAsync({quality:0.92});if(!result?.uri)throw new Error('No image was returned. Try again.');setPhoto(result.uri);void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);}catch(e){setError((e as Error).message||'The photo could not be captured.');}finally{setBusy(false);}}
 function retake(){setPhoto('');setError('');setCameraReady(false);}
 const button={width:46,height:46,borderRadius:23,backgroundColor:'rgba(8,17,32,0.48)',alignItems:'center',justifyContent:'center'} as const;
 return <Modal visible animationType={reduce?'fade':'slide'} presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
  <View style={{flex:1,backgroundColor:'#07111F'}}>
   {photo?<Image source={{uri:photo}} resizeMode="contain" style={StyleSheet.absoluteFill} onError={()=>{setError('This photo could not be opened. Choose another image.');setPhoto('');}}/>:permission?.granted?<CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" flash={flash} autofocus="on" onCameraReady={()=>setCameraReady(true)} onMountError={event=>setError(event.message||'Camera could not start.')}/>:null}
   <StatusBar barStyle="light-content" backgroundColor="transparent" translucent/>
   {photo?<>
    <SafeAreaView edges={['top']} style={{position:'absolute',top:0,left:0,right:0,padding:18}}><Tap accessibilityRole="button" accessibilityLabel="Close photo preview" onPress={onClose} style={button}><Icon name="close" color={C.white}/></Tap></SafeAreaView>
    <SafeAreaView edges={['bottom']} style={{position:'absolute',bottom:0,left:0,right:0,padding:22,flexDirection:'row',gap:12}}><View style={{flex:1}}><Primary large secondary label="Retake" onPress={retake}/></View><View style={{flex:1}}><Primary large label="Use Photo" onPress={()=>onUsePhoto(photo)}/></View></SafeAreaView>
   </>:permission?.granted?<>
    <SafeAreaView edges={['top']} style={{position:'absolute',top:0,left:0,right:0,paddingHorizontal:18,paddingTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
     <Tap accessibilityRole="button" accessibilityLabel="Close camera" onPress={onClose} style={button}><Icon name="close" color={C.white}/></Tap>
     <Tap accessibilityRole="button" accessibilityLabel={flash==='off'?'Turn flash on':'Turn flash off'} accessibilityState={{selected:flash==='on'}} onPress={()=>setFlash(value=>value==='off'?'on':'off')} style={[button,{backgroundColor:flash==='on'?'rgba(22,119,242,0.88)':button.backgroundColor}]}><Icon name={flash==='on'?'flash':'flash-outline'} color={C.white}/></Tap>
    </SafeAreaView>
    <SafeAreaView edges={['bottom']} style={{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:24,paddingTop:32,paddingBottom:12,backgroundColor:'rgba(4,11,21,0.24)'}}>
     {!!error&&<View accessibilityRole="alert"><Txt color={C.white} size={13} style={{textAlign:'center',marginBottom:12}}>{error}</Txt></View>}
     <View style={{height:82,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <Tap accessibilityRole="button" accessibilityLabel="Choose an existing photo" onPress={()=>void chooseGallery()} style={{width:54,height:54,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,0.6)',alignItems:'center',justifyContent:'center'}}><Icon name="images-outline" size={24} color={C.white}/></Tap>
      <Tap accessibilityRole="button" accessibilityLabel="Take photo" disabled={!cameraReady||busy} onPress={()=>void capture()} style={{width:76,height:76,borderRadius:38,borderWidth:4,borderColor:C.white,alignItems:'center',justifyContent:'center',opacity:cameraReady?1:0.55}}><View style={{width:60,height:60,borderRadius:30,backgroundColor:C.white,alignItems:'center',justifyContent:'center'}}>{busy&&<ActivityIndicator color={C.blue}/>}</View></Tap>
      <View style={{width:54,height:54}}/>
     </View>
    </SafeAreaView>
   </>:permission===null?<SafeAreaView edges={['top','bottom']} style={{flex:1,alignItems:'center',justifyContent:'center',gap:12,padding:22}}><ActivityIndicator color={C.white}/><Txt color={C.white}>Checking camera access…</Txt></SafeAreaView>:<SafeAreaView edges={['top','bottom']} style={{flex:1,justifyContent:'space-between',padding:22}}>
    <Tap accessibilityRole="button" accessibilityLabel="Close camera" onPress={onClose} style={[button,{alignSelf:'flex-start'}]}><Icon name="close" color={C.white}/></Tap>
    <View style={{alignItems:'center',gap:12,paddingHorizontal:10}}>
     <Icon name="camera-outline" size={38} color={C.white}/><Txt size={21} bold color={C.white}>Camera access needed</Txt>
     <Txt size={14} color="#D8E2F0" style={{textAlign:'center'}}>Allow Brief to photograph a job listing. You can also choose an existing photo.</Txt>
     {!!error&&<View accessibilityRole="alert"><Txt size={13} color="#FFD6DC" style={{textAlign:'center'}}>{error}</Txt></View>}
     <View style={{width:'100%',gap:9}}><Primary label={permission?.canAskAgain?'Allow camera':'Open Settings'} onPress={()=>{if(permission?.canAskAgain){requested.current=true;void requestPermission().then(result=>{if(!result.granted)setError('Camera access is off. Allow it in Settings or choose a photo.');});}else void Linking.openSettings();}}/><Primary secondary label="Choose a photo" onPress={()=>void chooseGallery()}/></View>
    </View>
    <View style={{height:44}}/>
   </SafeAreaView>}
  </View>
 </Modal>;
}
