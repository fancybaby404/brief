import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {Alert,AppState,BackHandler,ScrollView,Switch,View} from 'react-native';
import {NavigationContainer,useIsFocused,useNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator,type NativeStackScreenProps} from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import {useBrief} from '../lib/appContext';
import {C} from '../theme/tokens';
import {CURRENCIES} from '../lib/currency';
import {MODEL_CATALOG} from '../lib/modelCatalog';
import {deleteLocalFile,downloadCatalogBundle,pickModel,pickVisionProjector,probeImageUri} from '../lib/imports';
import {benchmarkModel,configureModel,configureVisionProjector,inspectModel,modelLoaded,modelPath,probeVision,supportsVision,visionProjectorPath} from '../lib/ai';
import {speechInstalled,speechModelPaths,installedModel} from '../lib/voice/stt';
import {voiceChoice} from '../lib/voice/tts';
import {ChoiceSheet} from '../components/ChoiceSheet';
import {ModelSetupOverlay,type ModelSetupStage} from '../components/States';
import {PerfPanel} from '../components/PerfPanel';
import {NotificationsContent,ResumeScreen} from './AccountScreens';
import {FormSheet} from '../components/FormSheet';
import {Field,Icon,Tap,Txt,Wordmark,useReducedMotion} from '../components/Ui';
import {SettingsDivider,SettingsGroup,SettingsRow,SettingsSection} from '../components/SettingsPrimitives';
import {VoiceSettings} from '../components/VoiceSettings';
import type {Profile} from '../types';
import appConfig from '../../app.json';

type SettingsStackParamList={home:undefined;ai:undefined;voice:undefined;notifications:undefined;privacy:undefined;advanced:undefined;about:undefined;resume:undefined};
type SettingsRoute=keyof SettingsStackParamList;
const TITLES:Record<SettingsRoute,string>={home:'Settings',ai:'Brief AI',voice:'Voice interviews',notifications:'Notifications',privacy:'Privacy',advanced:'Advanced & diagnostics',about:'About Brief',resume:'Resume'};
const MODEL=MODEL_CATALOG[0];
const SettingsStack=createNativeStackNavigator<SettingsStackParamList>();

type SettingsManager={
 profile:Profile;updateProfile:(profile:Profile)=>Promise<void>;currency:string;timeFormat:'12h'|'24h';aiSummary:string;voiceSummary:string;onBack:()=>void;
 onRefresh:()=>Promise<void>;onEditName:()=>void;onCurrency:()=>void;onTime:()=>void;
 modelFile:string;modelExists:boolean;projectorFile:string;projectorExists:boolean;status:string;name:string;textReady:boolean;visionReady:boolean;result:string;resultError:boolean;
 onCheck:()=>void;onDownload:()=>void;onImportModel:()=>void;onImportEncoder:()=>void;onRemove:()=>void;
 onVoiceStatus:(status:string)=>void;onVoiceBusy:(busy:boolean)=>void;busyChild:boolean;
 fx:ReturnType<typeof useBrief>['fx'];fxError:string;refreshFx:()=>Promise<{ok:boolean,error?:string}>;replayOnboarding:()=>Promise<void>;
};
const SettingsManagerContext=createContext<SettingsManager|null>(null);
function useSettingsManager(){const value=useContext(SettingsManagerContext);if(!value)throw new Error('Settings manager is unavailable');return value;}

function currencyValue(value:string){
 if(value==='original')return 'As listed';
 const option=CURRENCIES.find(x=>x.value===value),symbol=option?.label.match(/\(([^)]+)\)/)?.[1];
 return symbol?`${value} (${symbol})`:value;
}
function humanBytes(bytes:number){
 if(bytes<=0)return '0 MB';
 const gb=bytes/1_000_000_000;
 return gb>=1?`${gb.toFixed(1)} GB`:`${Math.round(bytes/1_000_000)} MB`;
}

/** All Settings pages live in one small stack, so the directory and each page retain their scroll state. */
export function SettingsScreen(){
 const {back,profile,updateProfile,currency,setCurrency,timeFormat,setTimeFormat,fx,fxError,refreshFx,replayOnboarding}=useBrief();
 const reduce=useReducedMotion(),navigationRef=useNavigationContainerRef<SettingsStackParamList>();
 const busyChildRef=useRef(false);
 const [busyChild,setBusyChild]=useState(false);
 const [choice,setChoice]=useState<''|'currency'|'time'>('');
 const [nameSheet,setNameSheet]=useState(false),[draftName,setDraftName]=useState(profile.name),[nameSaving,setNameSaving]=useState(false);

 const [modelFile,setModelFile]=useState(''),[projectorFile,setProjectorFile]=useState('');
 const [modelExists,setModelExists]=useState(false),[projectorExists,setProjectorExists]=useState(false);
 const [textReady,setTextReady]=useState(false),[visionReady,setVisionReady]=useState(false);
 const [modelResult,setModelResult]=useState(''),[modelError,setModelError]=useState(false);
 const [setupStage,setSetupStage]=useState<ModelSetupStage|null>(null),[modelProgress,setModelProgress]=useState<number|null>(null);
 const downloadTask=useRef<FileSystem.DownloadResumable|null>(null),cancelRequested=useRef(false),modelOperation=useRef(false);
 const [aiSummary,setAiSummary]=useState('Checking…'),[voiceSummary,setVoiceSummary]=useState('Checking…');
 const refreshModelFiles=useCallback(async()=>{
  const [modelPathValue,projectorPathValue]=await Promise.all([modelPath(),visionProjectorPath()]);
  const [modelInfo,projectorInfo]=await Promise.all([
   modelPathValue?FileSystem.getInfoAsync(modelPathValue).catch(()=>({exists:false} as const)):Promise.resolve({exists:false} as const),
   projectorPathValue?FileSystem.getInfoAsync(projectorPathValue).catch(()=>({exists:false} as const)):Promise.resolve({exists:false} as const),
  ]);
  const hasModel=!!modelPathValue&&modelInfo.exists&&(!('size'in modelInfo)||!!modelInfo.size);
  const hasProjector=!!projectorPathValue&&projectorInfo.exists&&(!('size'in projectorInfo)||!!projectorInfo.size);
  setModelFile(modelPathValue);setProjectorFile(projectorPathValue);setModelExists(hasModel);setProjectorExists(hasProjector);
  setTextReady(hasModel&&modelLoaded());
  if(!hasModel)setVisionReady(false);
  return {modelPathValue,projectorPathValue,hasModel,hasProjector};
 },[]);

 const refreshOverview=useCallback(async()=>{
  const paths=await refreshModelFiles();
  setAiSummary(!paths.modelPathValue?'Not set up':!paths.hasModel?'Needs attention':modelLoaded()?'Ready':'Installed');
  const [speechOK,model,voice]=await Promise.all([speechInstalled(),installedModel(),voiceChoice()]);
  setVoiceSummary(speechOK&&model?(voice.offline==='verified'?'Installed':'Speech installed'):'Not installed');
 },[refreshModelFiles]);
 useEffect(()=>{void refreshOverview();},[refreshOverview]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('memoryWarning',()=>{setTextReady(false);setVisionReady(false);setAiSummary(modelExists?'Installed':modelFile?'Needs attention':'Not set up');});
  return()=>subscription.remove();
 },[modelExists,modelFile]);

 useEffect(()=>{
  const listener=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(busyChildRef.current)return true;
   if(navigationRef.isReady()&&navigationRef.canGoBack()){navigationRef.goBack();return true;}
   back();return true;
  });
  return()=>listener.remove();
 },[back,navigationRef]);

 const setBusyStatus=useCallback((value:boolean)=>{busyChildRef.current=value;setBusyChild(value);},[]);

 async function testModel(){
  if(modelOperation.current)return;
  modelOperation.current=true;setModelError(false);setModelResult('');setSetupStage('load-model');setModelProgress(0);setVisionReady(false);
  try{
   const result=await benchmarkModel(p=>setModelProgress(Math.max(0,Math.min(100,Math.round(p)))),()=>{setSetupStage('check-model');setModelProgress(null);});
   setTextReady(true);setAiSummary('Ready');
   if(projectorFile&&projectorExists){
    try{
     setSetupStage('check-model');
     if(!await supportsVision())throw new Error('The image encoder could not be initialized.');
     const vision=await probeVision(await probeImageUri());
     if(!vision.passed)throw new Error(`The image check did not recognize the test picture (“${vision.answer||'no answer'}”).`);
     setVisionReady(true);setModelResult(`Ready for text and images · ${result.tokensPerSec.toFixed(1)} tokens/s`);
    }catch(error){setVisionReady(false);setModelResult(`Text is ready. Image support did not pass its check: ${(error as Error).message}`);setModelError(true);}
   }else setModelResult(`Ready for text · ${projectorFile?'The image encoder file is missing.':'Add a matching image encoder to use image input.'}`);
  }catch(error){setTextReady(false);setVisionReady(false);setAiSummary('Needs attention');setModelResult((error as Error).message||'The local model could not be started.');setModelError(true);}
  finally{modelOperation.current=false;setSetupStage(null);setModelProgress(null);void refreshOverview();}
 }

 async function downloadBriefModel(){
  if(modelOperation.current)return;
  modelOperation.current=true;cancelRequested.current=false;setModelError(false);setModelResult('');setModelProgress(0);setSetupStage('download-model');
  let downloaded:{modelUri:string,projectorUri:string}|null=null,oldModel='',oldProjector='',switched=false;
  try{
   downloaded=await downloadCatalogBundle(MODEL,p=>setModelProgress(Math.round(p*100)),task=>{downloadTask.current=task;if(task&&cancelRequested.current)void task.cancelAsync();});
   if(!downloaded){setModelResult('Download canceled. Your current model is unchanged.');return;}
   const info=await inspectModel(downloaded.modelUri);if(info.architecture!=='qwen3vl')throw new Error('The downloaded model file is not a compatible Qwen3-VL model.');
   [oldModel,oldProjector]=await Promise.all([modelPath(),visionProjectorPath()]);
   await configureModel(downloaded.modelUri,downloaded.projectorUri);switched=true;setModelFile(downloaded.modelUri);setProjectorFile(downloaded.projectorUri);
   setSetupStage('load-model');setModelProgress(0);
   const benchmark=await benchmarkModel(p=>setModelProgress(Math.max(0,Math.min(100,Math.round(p)))),()=>{setSetupStage('check-model');setModelProgress(null);});
   if(!await supportsVision())throw new Error('The matching image encoder could not be initialized. Your previous model was restored.');
   const imageCheck=await probeVision(await probeImageUri());
   if(!imageCheck.passed)throw new Error(`The image check failed (“${imageCheck.answer||'no answer'}”). Your previous model was restored.`);
   if(oldModel&&oldModel!==downloaded.modelUri)await deleteLocalFile(oldModel).catch(()=>{});
   if(oldProjector&&oldProjector!==downloaded.projectorUri)await deleteLocalFile(oldProjector).catch(()=>{});
   setModelFile(downloaded.modelUri);setProjectorFile(downloaded.projectorUri);setModelExists(true);setProjectorExists(true);setTextReady(true);setVisionReady(true);setAiSummary('Ready');
   setModelResult(`Brief AI is ready for text and images · ${benchmark.tokensPerSec.toFixed(1)} tokens/s`);
  }catch(error){
   if(switched)await configureModel(oldModel,oldProjector).catch(()=>{});
   if(downloaded){await deleteLocalFile(downloaded.modelUri).catch(()=>{});await deleteLocalFile(downloaded.projectorUri).catch(()=>{});}
   setModelResult((error as Error).message||'Brief AI could not be installed.');setModelError(true);setVisionReady(false);
  }finally{
   modelOperation.current=false;downloadTask.current=null;cancelRequested.current=false;setSetupStage(null);setModelProgress(null);await refreshOverview();
  }
 }

 function confirmDownload(){
  if(modelFile&&modelExists){Alert.alert('Switch to Brief AI?','Brief will keep the current model until the new model and image support pass local checks.',[{text:'Cancel',style:'cancel'},{text:'Continue',onPress:()=>void downloadBriefModel()}]);return;}
  void downloadBriefModel();
 }
 function cancelModelDownload(){cancelRequested.current=true;void downloadTask.current?.cancelAsync();}

 async function importLocalModel(){
  if(modelOperation.current)return;
  modelOperation.current=true;setModelError(false);setModelResult('');setSetupStage('choose-model');
  let imported='',oldModel='',oldProjector='',switched=false;
  try{
   imported=await pickModel()||'';if(!imported)return;
   setSetupStage('import-model');const info=await inspectModel(imported);
   if(!info.architecture)throw new Error('This model file could not be read.');
   [oldModel,oldProjector]=await Promise.all([modelPath(),visionProjectorPath()]);
   await configureModel(imported,'');switched=true;
   setSetupStage('load-model');setModelProgress(0);
   const result=await benchmarkModel(p=>setModelProgress(Math.max(0,Math.min(100,Math.round(p)))),()=>{setSetupStage('check-model');setModelProgress(null);});
   if(oldModel&&oldModel!==imported)await deleteLocalFile(oldModel).catch(()=>{});
   if(oldProjector)await deleteLocalFile(oldProjector).catch(()=>{});
   setModelFile(imported);setProjectorFile('');setModelExists(true);setProjectorExists(false);setTextReady(true);setVisionReady(false);setAiSummary('Ready');
   setModelResult(`Imported model is ready for text · ${result.tokensPerSec.toFixed(1)} tokens/s. Image input needs a compatible encoder.`);
  }catch(error){
   if(switched)await configureModel(oldModel,oldProjector).catch(()=>{});
   if(imported)await deleteLocalFile(imported).catch(()=>{});
   setModelResult((error as Error).message||'The model could not be installed.');setModelError(true);setAiSummary('Needs attention');
  }finally{modelOperation.current=false;setSetupStage(null);setModelProgress(null);await refreshOverview();}
 }

 async function importImageEncoder(){
  if(modelOperation.current)return;
  if(!modelFile||!modelExists){setModelResult('Install a local model before adding its image encoder.');setModelError(true);return;}
  modelOperation.current=true;setModelError(false);setModelResult('');setSetupStage('choose-projector');
  let imported='',oldProjector='',switched=false;
  try{
   imported=await pickVisionProjector()||'';if(!imported)return;
   setSetupStage('import-projector');oldProjector=await visionProjectorPath();await configureVisionProjector(imported);switched=true;
   setSetupStage('load-model');
   if(!await supportsVision())throw new Error('This encoder is not compatible with the installed model.');
   setSetupStage('check-model');const imageCheck=await probeVision(await probeImageUri());
   if(!imageCheck.passed)throw new Error(`Image support did not pass its local check (“${imageCheck.answer||'no answer'}”).`);
   if(oldProjector&&oldProjector!==imported)await deleteLocalFile(oldProjector).catch(()=>{});
   setProjectorFile(imported);setProjectorExists(true);setVisionReady(true);setModelResult('Image support is ready on this phone.');
  }catch(error){
   if(switched)await configureVisionProjector(oldProjector).catch(()=>{});
   if(imported)await deleteLocalFile(imported).catch(()=>{});
   setProjectorFile(oldProjector);setProjectorExists(!!oldProjector);setVisionReady(false);setModelResult((error as Error).message||'Image support could not be installed.');setModelError(true);
  }finally{modelOperation.current=false;setSetupStage(null);await refreshOverview();}
 }

 function removeLocalModel(){
  Alert.alert('Remove local AI model?','Brief AI chats and interview practice will need a model again. Your jobs, resume and settings stay on this phone.',[
   {text:'Cancel',style:'cancel'},
   {text:'Remove model',style:'destructive',onPress:()=>void (async()=>{
    if(modelOperation.current)return;modelOperation.current=true;setModelError(false);setModelResult('');
    try{
     await configureModel('','');
     await Promise.all([deleteLocalFile(modelFile),deleteLocalFile(projectorFile)]);
     setModelFile('');setProjectorFile('');setModelExists(false);setProjectorExists(false);setTextReady(false);setVisionReady(false);setAiSummary('Not set up');setModelResult('The local model was removed.');
    }catch(error){setModelResult((error as Error).message||'The model could not be removed.');setModelError(true);}
    finally{modelOperation.current=false;await refreshOverview();}
   })()},
  ]);
 }

 const currentModelStatus=modelError?'Needs attention':!modelFile?'Not installed':!modelExists?'File missing':textReady&&visionReady?'Ready for text and images':textReady?'Ready for text':projectorFile&&projectorExists?'Installed · image check needed':'Installed';
 const currentModelName=modelFile?.includes(MODEL.id)?'Qwen3-VL 2B Instruct Q4_K_M':'Custom local model';

 async function saveName(){
  if(nameSaving)return;setNameSaving(true);
  try{await updateProfile({...profile,name:draftName.trim()});setNameSheet(false);}
  catch(error){Alert.alert('Couldn’t save name',(error as Error).message);}
  finally{setNameSaving(false);}
 }
 async function changeCurrency(value:string){try{await setCurrency(value);}catch(error){Alert.alert('Couldn’t save currency',(error as Error).message);}}
 async function changeTime(value:'12h'|'24h'){try{await setTimeFormat(value);}catch(error){Alert.alert('Couldn’t save time format',(error as Error).message);}}
 const setVoiceStatus=useCallback((status:string)=>setVoiceSummary(status),[]);
 const manager:SettingsManager={
  profile,updateProfile,currency,timeFormat,aiSummary,voiceSummary,onBack:back,
  onRefresh:refreshOverview,onEditName:()=>{setDraftName(profile.name);setNameSheet(true);},onCurrency:()=>setChoice('currency'),onTime:()=>setChoice('time'),
  modelFile,modelExists,projectorFile,projectorExists,status:currentModelStatus,name:currentModelName,textReady,visionReady,result:modelResult,resultError:modelError,
  onCheck:()=>void testModel(),onDownload:confirmDownload,onImportModel:()=>void importLocalModel(),onImportEncoder:()=>void importImageEncoder(),onRemove:removeLocalModel,
  onVoiceStatus:setVoiceStatus,onVoiceBusy:setBusyStatus,busyChild,fx,fxError,refreshFx,replayOnboarding,
 };

 return <SettingsManagerContext.Provider value={manager}><View style={{flex:1,backgroundColor:C.background}}>
  <NavigationContainer ref={navigationRef}>
   <SettingsStack.Navigator initialRouteName="home" screenOptions={{headerShown:false,contentStyle:{backgroundColor:C.background},animation:reduce?'fade':'default',animationMatchesGesture:true,gestureEnabled:!busyChild}}>
    <SettingsStack.Screen name="home" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="ai" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="voice" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="notifications" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="privacy" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="advanced" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="about" component={SettingsRouteScreen}/>
    <SettingsStack.Screen name="resume" component={SettingsRouteScreen}/>
   </SettingsStack.Navigator>
  </NavigationContainer>
  <ChoiceSheet visible={choice==='currency'} title="Salary currency" items={CURRENCIES.map(item=>({value:item.value,label:item.value==='original'?'As listed':`${item.value} · ${item.label}`}))} selected={currency} onClose={()=>setChoice('')} onChoose={value=>void changeCurrency(value)}/>
  <ChoiceSheet visible={choice==='time'} title="Time format" items={[{value:'12h',label:'12-hour',detail:'For example, 2:30 PM'},{value:'24h',label:'24-hour',detail:'For example, 14:30'}]} selected={timeFormat} onClose={()=>setChoice('')} onChoose={value=>void changeTime(value)}/>
  <NameSheet visible={nameSheet} value={draftName} onChange={setDraftName} onClose={()=>setNameSheet(false)} onSave={()=>void saveName()} saving={nameSaving}/>
  <ModelSetupOverlay stage={setupStage} progress={modelProgress} onCancel={setupStage==='download-model'?cancelModelDownload:undefined}/>
 </View></SettingsManagerContext.Provider>;
}

function SettingsRouteScreen({route,navigation}:NativeStackScreenProps<SettingsStackParamList,SettingsRoute>){
 const manager=useSettingsManager(),active=useIsFocused();
 const navigate=(next:SettingsRoute)=>navigation.navigate(next);
 let content:React.ReactNode;
 switch(route.name){
  case 'home':content=<SettingsHome active={active} aiSummary={manager.aiSummary} voiceSummary={manager.voiceSummary} onRefresh={manager.onRefresh} onPush={navigate} onEditName={manager.onEditName} onCurrency={manager.onCurrency} onTime={manager.onTime} currency={manager.currency} timeFormat={manager.timeFormat}/>;break;
  case 'ai':content=<BriefAiSettings modelFile={manager.modelFile} modelExists={manager.modelExists} projectorFile={manager.projectorFile} projectorExists={manager.projectorExists} status={manager.status} name={manager.name} textReady={manager.textReady} visionReady={manager.visionReady} result={manager.result} resultError={manager.resultError} onCheck={manager.onCheck} onDownload={manager.onDownload} onImportModel={manager.onImportModel} onImportEncoder={manager.onImportEncoder} onRemove={manager.onRemove}/>;break;
  case 'voice':content=<VoiceSettings onStatusChange={manager.onVoiceStatus} onBusyChange={manager.onVoiceBusy}/>;break;
  case 'notifications':content=<ScrollView contentContainerStyle={{padding:18,paddingTop:16,paddingBottom:28}}><NotificationsContent/></ScrollView>;break;
  case 'privacy':content=<PrivacySettings profile={manager.profile} updateProfile={manager.updateProfile} onResume={()=>navigate('resume')}/>;break;
  case 'advanced':content=<AdvancedSettings active={active} aiSummary={manager.aiSummary} voiceSummary={manager.voiceSummary} modelFile={manager.modelFile} projectorFile={manager.projectorFile} onCheck={manager.onCheck} onVoice={()=>navigate('voice')} onTour={()=>void manager.replayOnboarding()} fx={manager.fx} fxError={manager.fxError} refreshFx={manager.refreshFx}/>;break;
  case 'resume':content=<ResumeScreen withinSettings onOpenBriefAi={()=>navigate('ai')}/>;break;
  case 'about':content=<AboutSettings/>;break;
 }
 return <SettingsPage title={TITLES[route.name]} disabled={manager.busyChild} onBack={navigation.canGoBack()?()=>navigation.goBack():manager.onBack}>{content}</SettingsPage>;
}

function SettingsPage({title,disabled,onBack,children}:{title:string,disabled:boolean,onBack:()=>void,children:React.ReactNode}){
 return <View style={{flex:1,backgroundColor:C.background}}>
  <View style={{height:54,flexDirection:'row',alignItems:'center',paddingHorizontal:9}}>
   <Tap accessibilityRole="button" accessibilityLabel="Back" accessibilityHint="Returns to the previous Settings page" disabled={disabled} onPress={onBack} style={{width:44,height:44,alignItems:'center',justifyContent:'center',opacity:disabled?0.45:1}}><Icon name="chevron-back" size={25} color={C.blue}/></Tap>
   <Txt size={18} bold style={{flex:1,textAlign:'center'}} numberOfLines={1}>{title}</Txt>
   <View style={{width:44}}/>
  </View>
  <View style={{flex:1}}>{children}</View>
 </View>;
}

function SettingsHome({active,aiSummary,voiceSummary,onRefresh,onPush,onEditName,onCurrency,onTime,currency,timeFormat}:{active:boolean,aiSummary:string,voiceSummary:string,onRefresh:()=>Promise<void>,onPush:(route:SettingsRoute)=>void,onEditName:()=>void,onCurrency:()=>void,onTime:()=>void,currency:string,timeFormat:'12h'|'24h'}){
 const {profile}=useBrief();
 const wasActive=useRef(active);
 useEffect(()=>{if(active&&!wasActive.current)void onRefresh();wasActive.current=active;},[active,onRefresh]);
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:13,paddingBottom:28,gap:17}}>
  <SettingsSection title="Profile"><SettingsGroup>
   <SettingsRow icon="person-outline" label="Display name" value={profile.name||'Add your name'} disclosure onPress={onEditName}/>
  </SettingsGroup></SettingsSection>
  <SettingsSection title="AI & Offline"><SettingsGroup>
   <SettingsRow icon="hardware-chip-outline" label="Brief AI" value={aiSummary} disclosure onPress={()=>onPush('ai')}/>
   <SettingsDivider/>
   <SettingsRow icon="mic-outline" label="Voice interviews" value={voiceSummary} disclosure onPress={()=>onPush('voice')}/>
  </SettingsGroup></SettingsSection>
  <SettingsSection title="Preferences"><SettingsGroup>
   <SettingsRow icon="cash-outline" label="Salary currency" value={currencyValue(currency)} disclosure onPress={onCurrency}/>
   <SettingsDivider/>
   <SettingsRow icon="time-outline" label="Time format" value={timeFormat==='12h'?'12-hour':'24-hour'} disclosure onPress={onTime}/>
  </SettingsGroup></SettingsSection>
  <SettingsSection title="Other"><SettingsGroup>
   <SettingsRow icon="notifications-outline" label="Notifications" disclosure onPress={()=>onPush('notifications')}/>
   <SettingsDivider/>
   <SettingsRow icon="shield-checkmark-outline" label="Privacy" disclosure onPress={()=>onPush('privacy')}/>
   <SettingsDivider/>
   <SettingsRow icon="construct-outline" label="Advanced & diagnostics" disclosure onPress={()=>onPush('advanced')}/>
   <SettingsDivider/>
   <SettingsRow icon="information-circle-outline" label="About Brief" disclosure onPress={()=>onPush('about')}/>
  </SettingsGroup></SettingsSection>
 </ScrollView>;
}

function BriefAiSettings({modelFile,modelExists,projectorFile,projectorExists,status,name,textReady,visionReady,result,resultError,onCheck,onDownload,onImportModel,onImportEncoder,onRemove}:{modelFile:string,modelExists:boolean,projectorFile:string,projectorExists:boolean,status:string,name:string,textReady:boolean,visionReady:boolean,result:string,resultError:boolean,onCheck:()=>void,onDownload:()=>void,onImportModel:()=>void,onImportEncoder:()=>void,onRemove:()=>void}){
 const [advanced,setAdvanced]=useState(false);
 const canUseOfficial=!!modelFile&&modelFile.includes(MODEL.id)&&modelExists;
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:16,paddingBottom:28,gap:18}}>
  <SettingsSection title="On-device model"><SettingsGroup>
   <SettingsRow icon="hardware-chip-outline" label={modelFile?name:'Qwen3-VL 2B Instruct Q4_K_M'} value={status} detail={modelFile?'Used by Brief AI chats and interview practice':'Recommended for chat, interviews, and images'} />
   {!modelFile||!modelExists?<>
    <SettingsDivider/>
    <Tap accessibilityRole="button" onPress={onDownload} style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:C.blue,marginHorizontal:12,marginVertical:12,borderRadius:13}}><Icon name="cloud-download-outline" size={18} color={C.white}/><Txt size={15} bold color={C.white}>{modelFile?'Reinstall Brief AI':'Download Brief AI'}</Txt></Tap>
   </>:<>
    <SettingsDivider/>
    <SettingsRow icon="checkmark-circle-outline" label="Local setup check" value="Run check" onPress={onCheck}/>
    {projectorFile&&!projectorExists&&<><SettingsDivider/><SettingsRow icon="image-outline" label="Image encoder" value="File missing" detail="Text remains available; image input needs repair."/></>}
    {projectorExists&&!visionReady&&<><SettingsDivider/><SettingsRow icon="image-outline" label="Image input" value={textReady?'Not verified':'Check setup'} detail="Image inference is only available after its local check passes." onPress={onCheck}/></>}
    {visionReady&&<><SettingsDivider/><SettingsRow icon="image-outline" label="Image input" value="Ready" detail="The local image check passed."/></>}
   </>}
  </SettingsGroup></SettingsSection>

  {!canUseOfficial&&<Txt size={12} color={C.muted} style={{lineHeight:18}}>Brief’s recommended model is Qwen3-VL 2B Instruct Q4_K_M with its matching image encoder. Downloading the pair needs {MODEL.sizeLabel} and an internet connection. Your current model stays active until the new setup passes its local checks.</Txt>}
  {!modelFile&&<Txt size={12} color={C.muted}>The download starts only when you tap the button. Saved jobs and preferences work without a model.</Txt>}
  {modelFile&&<SettingsSection title="Manage"><SettingsGroup>
   <SettingsRow icon="trash-outline" label="Remove local model" value="Remove" onPress={onRemove}/>
  </SettingsGroup></SettingsSection>}

  <SettingsGroup>
   <SettingsRow icon="options-outline" label="Advanced model options" value={advanced?'Hide':'Show'} disclosure onPress={()=>setAdvanced(value=>!value)}/>
   {advanced&&<>
    <SettingsDivider/>
    <SettingsRow icon="document-outline" label="Import or replace a model" value="Choose" disclosure onPress={onImportModel}/>
    <SettingsDivider/>
    <SettingsRow icon="image-outline" label="Import matching image encoder" value={projectorFile?'Replace':'Choose'} disclosure onPress={onImportEncoder}/>
    <View style={{paddingHorizontal:14,paddingBottom:14,paddingTop:5,gap:4}}><Txt size={12} color={C.muted}>GGUF model files and compatible image encoders only. The recommended Qwen model is Q4_K_M with an mmproj encoder. License: {MODEL.license}.</Txt></View>
   </>}
  </SettingsGroup>
  {!!result&&<View accessibilityRole={resultError?'alert':undefined} accessibilityLiveRegion="polite"><Txt size={13} color={resultError?C.danger:C.muted} style={{lineHeight:19}}>{result}</Txt></View>}
 </ScrollView>;
}

function PrivacySettings({profile,updateProfile,onResume}:{profile:Profile,updateProfile:(profile:Profile)=>Promise<void>,onResume:()=>void}){
 const changeConsent=async(enabled:boolean)=>{try{await updateProfile({...profile,useResumeForAI:enabled});}catch(error){Alert.alert('Couldn’t update privacy setting',(error as Error).message);}};
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:16,paddingBottom:28,gap:18}}>
  <SettingsSection title="Your information"><SettingsGroup>
   <View style={{minHeight:66,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14}}><Icon name="document-text-outline" size={18} color={C.blue}/><View style={{flex:1,gap:2}}><Txt size={15}>Use resume details in Brief AI</Txt><Txt size={12} color={C.muted}>Your profile and resume stay on this phone.</Txt></View><Switch accessibilityLabel="Use resume details in Brief AI" value={profile.useResumeForAI} onValueChange={enabled=>void changeConsent(enabled)} trackColor={{true:C.blue,false:C.line}}/></View>
   <SettingsDivider/>
   <SettingsRow icon="create-outline" label="Review or remove resume" value="Open" disclosure onPress={onResume}/>
  </SettingsGroup></SettingsSection>
  <SettingsSection title="How data is used"><SettingsGroup style={{padding:14,gap:11}}>
   <Txt size={14} color={C.muted} style={{lineHeight:20}}>Brief AI prompts use the local model on this phone. Resume details are included only while the switch above is on.</Txt>
   <Txt size={14} color={C.muted} style={{lineHeight:20}}>Voice answers are transcribed on this phone. Microphone audio is discarded after transcription; interview transcripts are saved in local session history.</Txt>
   <Txt size={14} color={C.muted} style={{lineHeight:20}}>Online job search fetches listings, and exchange-rate updates fetch public reference rates. Saved applications remain on this phone.</Txt>
  </SettingsGroup></SettingsSection>
 </ScrollView>;
}

function AdvancedSettings({active,aiSummary,voiceSummary,modelFile,projectorFile,onCheck,onVoice,onTour,fx,fxError,refreshFx}:{active:boolean,aiSummary:string,voiceSummary:string,modelFile:string,projectorFile:string,onCheck:()=>void,onVoice:()=>void,onTour:()=>void,fx:ReturnType<typeof useBrief>['fx'],fxError:string,refreshFx:()=>Promise<{ok:boolean,error?:string}>}){
 const [storage,setStorage]=useState('Checking…'),[refreshing,setRefreshing]=useState(false),[rateMessage,setRateMessage]=useState('');
 const refreshStorage=useCallback(async()=>{
  const paths=[modelFile,projectorFile,...Object.values(await speechModelPaths())].filter(Boolean);
  const infos=await Promise.all(paths.map(path=>FileSystem.getInfoAsync(path).catch(()=>({exists:false} as const))));
  const used=infos.reduce((sum,info)=>sum+('size'in info&&typeof info.size==='number'?info.size:0),0);
  const free=await FileSystem.getFreeDiskStorageAsync().catch(()=>null);
  setStorage(`${humanBytes(used)} in local models${free===null?'':` · ${humanBytes(free)} available`}`);
 },[modelFile,projectorFile]);
 useEffect(()=>{if(active)void refreshStorage();},[active,refreshStorage]);
 async function updateRates(){if(refreshing)return;setRefreshing(true);setRateMessage('');try{const result=await refreshFx();setRateMessage(result.ok?'Exchange rates updated.':result.error||'Couldn’t update exchange rates. Your saved rates are still available.');}catch(error){setRateMessage((error as Error).message);}finally{setRefreshing(false);}}
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:16,paddingBottom:28,gap:18}}>
  <SettingsSection title="Readiness"><SettingsGroup>
   <SettingsRow icon="hardware-chip-outline" label="Brief AI" value={aiSummary} detail={modelFile?'Local model status':'No local model installed'}/>
   <SettingsDivider/>
   <SettingsRow icon="pulse-outline" label="Run local AI check" value="Check" detail="Tests a short response and, if installed, image input." onPress={onCheck} disabled={!modelFile}/>
   <SettingsDivider/>
   <SettingsRow icon="mic-outline" label="Speech recognition" value={voiceSummary} disclosure onPress={onVoice}/>
  </SettingsGroup></SettingsSection>
  <SettingsSection title="Storage"><SettingsGroup>
   <SettingsRow icon="folder-outline" label="Local model storage" value="Refresh" detail={storage} onPress={()=>void refreshStorage()}/>
  </SettingsGroup></SettingsSection>
  <SettingsSection title="Exchange rates"><SettingsGroup>
   <SettingsRow icon="stats-chart-outline" label="Salary conversion rates" value={refreshing?'Updating…':'Update'} detail={fx?`Reference rates · ${fx.rates.date}${fxError?' · last update failed':''}`:fxError||'No cached rates yet'} onPress={()=>void updateRates()} disabled={refreshing}/>
  </SettingsGroup></SettingsSection>
  {!!rateMessage&&<View accessibilityRole={rateMessage.includes('updated')?undefined:'alert'} accessibilityLiveRegion="polite"><Txt size={12} color={rateMessage.includes('updated')?C.green:C.danger}>{rateMessage}</Txt></View>}
  <SettingsSection title="Performance"><PerfPanel/></SettingsSection>
  <SettingsSection title="Troubleshooting"><SettingsGroup style={{padding:14,gap:10}}>
   <Txt size={13} color={C.muted} style={{lineHeight:19}}>If Brief AI will not start, run its local check and free phone memory. Reinstall the model if the file is missing or corrupt.</Txt>
   <Txt size={13} color={C.muted} style={{lineHeight:19}}>If voice is unavailable, install a speech model and make sure the phone has an on-device English voice.</Txt>
   <Txt size={13} color={C.muted} style={{lineHeight:19}}>Saved jobs, your profile and calendar stay available offline. Job discovery and exchange-rate updates need internet.</Txt>
  </SettingsGroup></SettingsSection>
  <SettingsGroup><SettingsRow icon="help-circle-outline" label="Replay welcome tour" value="Open" disclosure onPress={onTour}/></SettingsGroup>
 </ScrollView>;
}

function AboutSettings(){
 return <View style={{flex:1,padding:24,alignItems:'center',justifyContent:'center',gap:14}}>
  <Wordmark size={34}/>
  <Txt size={15} color={C.muted} style={{textAlign:'center',maxWidth:300,lineHeight:22}}>A private place to track your job search and practice for interviews.</Txt>
  <Txt size={13} color={C.soft}>Version {appConfig.expo.version}</Txt>
 </View>;
}

function NameSheet({visible,value,onChange,onClose,onSave,saving}:{visible:boolean,value:string,onChange:(value:string)=>void,onClose:()=>void,onSave:()=>void,saving:boolean}){
 return <FormSheet visible={visible} title="Display name" onClose={onClose} doneLabel={saving?'Saving…':'Save'} doneDisabled={saving} onDone={onSave}>
  <View style={{paddingTop:8}}><Field label="Name" value={value} onChangeText={onChange} placeholder="What Brief should call you"/></View>
 </FormSheet>;
}

