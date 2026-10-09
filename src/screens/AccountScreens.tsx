import React,{useEffect,useRef,useState} from 'react';
import {Alert,ScrollView,Switch,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,Field,Heading,Icon,Input,Mascot,Primary,PullDownMenu,Txt,Tap,useFloatingNavClearance} from '../components/Ui';
import {CURRENCIES} from '../lib/currency';
import {deleteLocalFile,downloadCatalogBundle,importResume,pickModel,pickVisionProjector} from '../lib/imports';import {benchmarkModel,configureModel,configureVisionProjector,modelPath,visionProjectorPath,supportsVision} from '../lib/ai';
import {MODEL_CATALOG,type CatalogModel} from '../lib/modelCatalog';
import * as Sharing from 'expo-sharing';
import {EmptyState,ModelSetupOverlay,type ModelSetupStage} from '../components/States';
import {ProfileForm} from '../components/ProfileForm';
import Reanimated,{LayoutAnimationConfig} from 'react-native-reanimated';
import {ROW_IN,ROW_OUT} from '../theme/motion';
import {listItems} from '../lib/profile';
export function ResumeScreen(){const {profile,updateProfile}=useBrief();const bottomClearance=useFloatingNavClearance();const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false);
 async function attach(){setBusy(true);try{const r=await importResume(profile.resumeUri);if(!r)return;await updateProfile({...profile,resumeUri:r.resumeUri,resumeText:r.resumeText,useResumeForAI:true});
  if(r.note)Alert.alert('Resume added',`${r.note} Add a few details so Brief can use them.`,[{text:'Later',style:'cancel'},{text:'Enter details',onPress:()=>setEditing(true)}]);}
  catch(e){Alert.alert('Couldn’t add resume',(e as Error).message);}finally{setBusy(false);}}
 async function openResume(){if(!profile.resumeUri)return;try{await Sharing.shareAsync(profile.resumeUri);}catch(e){Alert.alert('Can’t open the file',(e as Error).message);}}
 const remove=()=>Alert.alert('Remove resume?','The file and its extracted text are deleted from this phone. Your typed summary stays.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void deleteLocalFile(profile.resumeUri).then(()=>updateProfile({...profile,resumeUri:'',resumeText:''}))}]);
 const rows=[{icon:'briefcase-outline',text:profile.experience,empty:'Add your experience'},{icon:'school-outline',text:profile.education,empty:'Add your education'},{icon:'list-outline',text:profile.skills,empty:'Add your skills'},{icon:'flag-outline',text:profile.goals,empty:'Add the role you’re aiming for'}];
 return <LayoutAnimationConfig skipEntering><ScrollView contentContainerStyle={{padding:18,paddingBottom:bottomClearance,gap:15}}><Heading>Resume</Heading>
 {profile.resumeUri?<Reanimated.View key={profile.resumeUri} entering={ROW_IN} exiting={ROW_OUT} style={{gap:15}}>
  <Tap accessibilityRole="button" accessibilityLabel="Open your resume file" onPress={()=>void openResume()} style={{height:300,borderRadius:20,backgroundColor:C.pale2,borderColor:C.line,borderWidth:1,padding:17,alignItems:'center',justifyContent:'center'}}>
   <View style={{width:'88%',height:'96%',backgroundColor:C.white,borderRadius:6,padding:18,shadowColor:'#142742',shadowOpacity:0.09,shadowRadius:12,elevation:3,gap:9}}>
    <Txt size={19} bold numberOfLines={1}>{profile.name||'Your name'}</Txt><Txt size={12} color={C.blue} numberOfLines={1}>{listItems(profile.goals,1)[0]||'Career profile'}</Txt><View style={{height:1,backgroundColor:C.line}}/>
    {([['EXPERIENCE',profile.experience||profile.resumeText.slice(0,160)],['EDUCATION',profile.education],['SKILLS',profile.skills]] as const).map(([h,t])=><View key={h} style={{gap:3}}><Txt bold size={10}>{h}</Txt><Txt size={11} color={C.muted} numberOfLines={3}>{t||'—'}</Txt></View>)}
   </View>
  </Tap>
  <View style={{flexDirection:'row',gap:8}}>
   {([['eye-outline','View',()=>void openResume(),C.blue],['cloud-upload-outline',busy?'Adding…':'Replace',()=>void attach(),C.blue],['trash-outline','Remove',remove,C.danger]] as const).map(([icon,label,onPress,color])=>
    <Tap key={label} accessibilityRole="button" disabled={busy} onPress={onPress} style={{flex:1,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:13,backgroundColor:color===C.danger?C.redSoft:C.pale}}><Icon name={icon} size={17} color={color}/><Txt bold size={13} color={color}>{label}</Txt></Tap>)}
  </View></Reanimated.View>
 :<Reanimated.View key="empty" entering={ROW_IN} exiting={ROW_OUT} style={{borderRadius:20,backgroundColor:C.pale2,borderColor:C.line,borderWidth:1}}>
  <EmptyState mood="question" title="No resume yet" body="Add a PDF or DOCX. It stays on this phone and helps Brief tailor advice and mock interviews." action={{label:busy?'Adding…':'Upload resume',icon:'cloud-upload-outline',onPress:()=>void attach()}} secondary={{label:'Enter details instead',onPress:()=>setEditing(true)}}/>
 </Reanimated.View>}
 <Card><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><Txt bold size={17}>Resume summary</Txt><Tap accessibilityRole="button" hitSlop={10} onPress={()=>setEditing(true)}><Txt color={C.blue} bold>Edit</Txt></Tap></View>
  <View style={{gap:12}}>{rows.map(x=><Tap key={x.icon} accessibilityRole="button" onPress={()=>setEditing(true)} style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}><Icon name={x.icon} color={x.text?C.ink:C.soft}/><View style={{flex:1}}><Txt size={13} color={x.text?C.ink:C.muted}>{x.text||x.empty}</Txt></View></Tap>)}</View>
 </Card>
 <Card><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}><View style={{flex:1}}><Txt bold>Use imported resume in Brief AI</Txt><Txt color={C.muted} size={11}>Only on this device. You can switch this off anytime.</Txt></View><Switch accessibilityLabel="Use imported resume in Brief AI" value={profile.useResumeForAI} onValueChange={x=>void updateProfile({...profile,useResumeForAI:x})} trackColor={{true:C.blue,false:C.line}}/></View></Card>
 <Txt color={C.muted} size={11}>The preview is a summary, not a rendered PDF; View opens the file with your phone’s viewer. Text is read from digital PDFs; for scanned PDFs and DOCX, type your details.</Txt>
 <ProfileForm visible={editing} profile={profile} onClose={()=>setEditing(false)} onSave={d=>{setEditing(false);void updateProfile({...profile,...d});}}/>
 </ScrollView></LayoutAnimationConfig>;
}
export function NotificationsScreen(){const {goTab}=useBrief();const bottomClearance=useFloatingNavClearance();return <ScrollView contentContainerStyle={{padding:18,paddingBottom:bottomClearance,gap:15}}><Heading>Notifications</Heading><EmptyState title="You’re all caught up" body="Brief doesn’t send reminders yet. Your interviews and deadlines are in Calendar." action={{label:'Open Calendar',onPress:()=>goTab('calendar')}}/></ScrollView>}
function SettingsSection({title,children}:{title:string,children:React.ReactNode}){return <View style={{gap:9}}><Txt size={17} bold style={{letterSpacing:-0.2}}>{title}</Txt>{children}</View>}
function SettingsDivider(){return <View style={{height:1,backgroundColor:C.line,marginLeft:56}}/>}
function SettingsIcon({name,children}:{name:string,children?:React.ReactNode}){return <View style={{width:42,height:42,borderRadius:22,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}>{children||<Icon name={name} size={21} color={C.blue}/>}</View>}
function SettingsStatus({children,ready=false}:{children:string,ready?:boolean}){return <View style={{paddingHorizontal:9,paddingVertical:5,borderRadius:12,backgroundColor:ready?C.greenSoft:C.pale2}}><Txt size={11} bold color={ready?C.green:C.muted}>{children}</Txt></View>}
export function SettingsScreen(){
 const {profile,updateProfile,replayOnboarding,go,currency,setCurrency,timeFormat,setTimeFormat,fx,fxError,refreshFx}=useBrief();
 const bottomClearance=useFloatingNavClearance();
 const downloadTask=useRef<import('expo-file-system/legacy').DownloadResumable|null>(null),cancelRequested=useRef(false);
 const [refreshing,setRefreshing]=useState(false),[model,setModel]=useState(''),[projector,setProjector]=useState(''),[vision,setVision]=useState(false),[setupStage,setSetupStage]=useState<ModelSetupStage|null>(null),[modelProgress,setModelProgress]=useState<number|null>(null),[name,setName]=useState(profile.name),[editingName,setEditingName]=useState(false),[result,setResult]=useState(''),[resultError,setResultError]=useState(false),[showModelFiles,setShowModelFiles]=useState(false);
 useEffect(()=>{void Promise.all([modelPath(),visionProjectorPath()]).then(([m,p])=>{setModel(m);setProjector(p);});},[]);
 async function importModel(){let imported='';setResult('');setResultError(false);setSetupStage('choose-model');try{const uri=await pickModel();if(!uri)return;imported=uri;setSetupStage('import-model');const [oldModel,oldProjector]=await Promise.all([modelPath(),visionProjectorPath()]);await configureModel(uri);if(oldModel&&oldModel!==uri)await deleteLocalFile(oldModel).catch(()=>{});if(oldProjector)await deleteLocalFile(oldProjector).catch(()=>{});setModel(uri);setProjector('');setVision(false);setResult('Model added. Test it once to check performance and image support.');}catch(e){if(imported)await deleteLocalFile(imported).catch(()=>{});setResult(`Couldn’t add the model. ${(e as Error).message}`);setResultError(true);}finally{setSetupStage(null);}}
 async function importProjector(){let imported='';setResult('');setResultError(false);setSetupStage('choose-projector');try{const uri=await pickVisionProjector();if(!uri)return;imported=uri;setSetupStage('import-projector');const oldProjector=await visionProjectorPath();await configureVisionProjector(uri);if(oldProjector&&oldProjector!==uri)await deleteLocalFile(oldProjector).catch(()=>{});setProjector(uri);setVision(false);setResult('Vision projector added. Test the model to check image support.');}catch(e){if(imported)await deleteLocalFile(imported).catch(()=>{});setResult(`Couldn’t add the vision projector. ${(e as Error).message}`);setResultError(true);}finally{setSetupStage(null);}}
 async function downloadModel(entry:CatalogModel){
  cancelRequested.current=false;setResult('');setResultError(false);setModelProgress(0);setSetupStage('download-model');
  let downloaded:{modelUri:string,projectorUri:string}|null=null;let previousModel='',previousProjector='';let switched=false;
  try{
   downloaded=await downloadCatalogBundle(entry,p=>setModelProgress(Math.round(p*100)),t=>{downloadTask.current=t;if(t&&cancelRequested.current)void t.cancelAsync();});
   if(!downloaded){setResult('Download canceled. Your current model is unchanged.');return;}
   [previousModel,previousProjector]=await Promise.all([modelPath(),visionProjectorPath()]);
   await configureModel(downloaded.modelUri,downloaded.projectorUri);switched=true;
   setSetupStage('load-model');setModelProgress(0);
   const benchmark=await benchmarkModel(p=>setModelProgress(Math.max(0,Math.min(100,Math.round(p)))),()=>{setSetupStage('check-model');setModelProgress(null);});
   if(!await supportsVision())throw new Error('The model loaded, but image support did not initialize. Your previous model is restored.');
   if(previousModel&&previousModel!==downloaded.modelUri)await deleteLocalFile(previousModel).catch(()=>{});
   if(previousProjector&&previousProjector!==downloaded.projectorUri)await deleteLocalFile(previousProjector).catch(()=>{});
   setModel(downloaded.modelUri);setProjector(downloaded.projectorUri);setVision(true);
   setResult(`Ready for text and images · ${(benchmark.loadMs/1000).toFixed(1)} s load · ${benchmark.tokensPerSec.toFixed(1)} tokens/s`);
  }catch(e){
   if(switched)await configureModel(previousModel,previousProjector).catch(()=>{});
   if(downloaded){await deleteLocalFile(downloaded.modelUri).catch(()=>{});await deleteLocalFile(downloaded.projectorUri).catch(()=>{});}
   setResult(`Couldn’t set up the vision model. ${(e as Error).message}`);setResultError(true);
  }finally{downloadTask.current=null;cancelRequested.current=false;setSetupStage(null);setModelProgress(null);}
 }
 function chooseVisionModel(entry:CatalogModel){
  if(model.includes(entry.id)&&projector){void testModel();return;}
  if(model){Alert.alert('Install the vision model?',`Brief will download ${entry.sizeLabel}. Your current model will stay active until the new model and image support pass a local check.`,[{text:'Cancel',style:'cancel'},{text:'Continue',onPress:()=>void downloadModel(entry)}]);return;}
  void downloadModel(entry);
 }
 function cancelDownload(){cancelRequested.current=true;void downloadTask.current?.cancelAsync();}
 async function testModel(){setResult('');setResultError(false);setModelProgress(0);setSetupStage('load-model');try{const r=await benchmarkModel(p=>setModelProgress(Math.max(0,Math.min(100,Math.round(p)))),()=>{setSetupStage('check-model');setModelProgress(null);});const hasVision=await supportsVision();setVision(hasVision);setResult(`Ready · ${(r.loadMs/1000).toFixed(1)} s load · ${r.tokensPerSec.toFixed(1)} tokens/s · ${hasVision?'images supported':projector?'projector unsupported':'text only'}`);}catch(e){setResult(`Model setup failed. ${(e as Error).message}`);setResultError(true);}finally{setSetupStage(null);}}
 const recommended=MODEL_CATALOG[0],recommendedInstalled=!!model&&model.includes(recommended.id),visionBundleInstalled=recommendedInstalled&&!!projector;
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:12,paddingBottom:bottomClearance+10,gap:20}}>
  <View style={{gap:3,marginBottom:2}}><Heading>Settings</Heading><Txt size={15} color={C.muted}>Manage Brief and personalize your experience.</Txt></View>
  <SettingsSection title="Profile">
   <Card style={{padding:12}}>
    <Tap accessibilityRole="button" accessibilityState={{expanded:editingName}} onPress={()=>setEditingName(v=>!v)} style={{minHeight:72,flexDirection:'row',alignItems:'center',gap:12}}>
     <SettingsIcon name="briefcase-outline"><Mascot size={38}/></SettingsIcon>
     <View style={{width:1,height:46,backgroundColor:C.line}}/>
     <View style={{flex:1,gap:2}}><Txt size={13} color={C.muted}>Display name</Txt><Txt size={17} bold numberOfLines={1}>{profile.name||'Add your name'}</Txt></View>
     <Icon name={editingName?'chevron-up':'chevron-forward'} size={20} color={C.muted}/>
    </Tap>
    {editingName&&<View style={{paddingTop:10,gap:9}}><Input value={name} onChangeText={setName} placeholder="Your name"/><View style={{flexDirection:'row',justifyContent:'flex-end',gap:8}}><Tap accessibilityRole="button" onPress={()=>{setName(profile.name);setEditingName(false);}} style={{minHeight:42,justifyContent:'center',paddingHorizontal:12}}><Txt bold color={C.muted}>Cancel</Txt></Tap><Primary secondary label="Save name" onPress={()=>{void updateProfile({...profile,name:name.trim()});setEditingName(false);}}/></View></View>}
   </Card>
  </SettingsSection>
  <SettingsSection title="On-device AI">
   <Card style={{padding:12,gap:12}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:2}}>
     <SettingsIcon name="hardware-chip-outline"/>
     <View style={{flex:1,gap:2}}><Txt size={16} bold>Local model</Txt><Txt size={13} color={C.muted}>Brief AI runs on your device. No internet needed.</Txt></View>
    </View>
    <View style={{height:1,backgroundColor:C.line}}/>
    <View style={{borderRadius:17,backgroundColor:C.pale2,padding:11,gap:10}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <SettingsIcon name="cube-outline"/>
      <View style={{flex:1,gap:3}}><View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}><Txt size={15} bold>Qwen3‑VL · 2B</Txt><SettingsStatus ready={vision}>{vision?'Images ready':visionBundleInstalled?'Installed':'Image model'}</SettingsStatus></View><Txt size={12} color={C.muted}>{recommended.sizeLabel} · Q4_K_M + Q8_0 vision encoder</Txt></View>
     </View>
     <Tap accessibilityRole="button" accessibilityLabel={visionBundleInstalled?'Check Qwen3-VL image support':'Download Qwen3-VL vision model'} onPress={()=>chooseVisionModel(recommended)} style={{minHeight:48,borderRadius:13,backgroundColor:C.blue,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>
      <Icon name={visionBundleInstalled?'checkmark-circle-outline':'cloud-download-outline'} size={19} color={C.white}/><Txt size={14} bold color={C.white}>{visionBundleInstalled?'Check image support':model?'Download & switch':'Download model'}</Txt>
     </Tap>
    </View>
    <Txt size={12} color={C.muted}>The model and matching image encoder download only when you tap Download. Together they need about 1.6 GB of storage. {recommended.license} · Source: Qwen on Hugging Face.</Txt>
    {model&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><View style={{flex:1}}><Txt size={13} bold>{vision?'Image input is ready':projector?'Model added · check image support':'A local model is installed'}</Txt><Txt size={11} color={C.muted}>{vision?'Images are processed locally.':'Text chat and mock interviews remain available.'}</Txt></View><SettingsStatus ready={vision}>{vision?'Images ready':'Text only'}</SettingsStatus></View>}
    <Tap accessibilityRole="button" accessibilityState={{expanded:showModelFiles}} onPress={()=>setShowModelFiles(v=>!v)} style={{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Txt size={13} bold color={C.blue}>More model options</Txt><Icon name={showModelFiles?'chevron-up':'chevron-down'} size={18} color={C.muted}/></Tap>
    {showModelFiles&&<Reanimated.View entering={ROW_IN} exiting={ROW_OUT} style={{gap:8}}>
     <SettingsDivider/>
     <Tap accessibilityRole="button" onPress={()=>void importModel()} style={{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:56}}><Txt size={13}>Import or replace GGUF</Txt><Txt size={13} bold color={C.blue}>Choose</Txt></Tap>
     <SettingsDivider/>
     <Tap accessibilityRole="button" onPress={()=>void importProjector()} style={{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:56}}><View style={{flex:1}}><Txt size={13}>Import matching vision encoder</Txt><Txt size={11} color={C.muted}>For a compatible model you already have</Txt></View><Txt size={13} bold color={C.blue}>{projector?'Replace':'Import'}</Txt></Tap>
    </Reanimated.View>}
    {!!result&&<Txt size={12} color={resultError?C.danger:C.green}>{result}</Txt>}
   </Card>
  </SettingsSection>
  <SettingsSection title="Preferences">
   <Card style={{paddingHorizontal:12,paddingVertical:2}}>
    <View style={{minHeight:70,flexDirection:'row',alignItems:'center',gap:12}}><SettingsIcon name="cash-outline"/><View style={{flex:1,gap:2}}><Txt size={14} bold>Salary currency</Txt><Txt size={12} color={C.muted}>Currency used for salary display</Txt></View><PullDownMenu label="Salary currency" value={currency} options={CURRENCIES} onChange={c=>void setCurrency(c)}/></View>
    <SettingsDivider/>
    <View style={{minHeight:66,flexDirection:'row',alignItems:'center',gap:12}}><SettingsIcon name="time-outline"/><View style={{flex:1,gap:2}}><Txt size={14} bold>Time format</Txt><Txt size={12} color={C.muted}>Used for times throughout Brief</Txt></View><PullDownMenu label="Time format" value={timeFormat} options={[{value:'12h',label:'12-hour'},{value:'24h',label:'24-hour'}]} onChange={format=>void setTimeFormat(format)}/></View>
    <SettingsDivider/>
    <View style={{minHeight:66,flexDirection:'row',alignItems:'center',gap:12}}><SettingsIcon name="stats-chart-outline"/><View style={{flex:1,gap:2}}><Txt size={14} bold>Exchange rates</Txt><Txt size={12} color={fxError&&!fx?C.danger:C.muted}>{fx?`ECB rates · ${fx.rates.date}${fxError?' · Update unavailable':''}`:fxError||'Getting exchange rates…'}</Txt></View><Tap accessibilityRole="button" disabled={refreshing} onPress={()=>{setRefreshing(true);void refreshFx().finally(()=>setRefreshing(false));}} style={{minHeight:44,justifyContent:'center',paddingHorizontal:4}}><Txt size={14} bold color={C.blue}>{refreshing?'Updating…':'Update'}</Txt></Tap></View>
   </Card>
  </SettingsSection>
  <SettingsSection title="Support & About">
   <Card style={{paddingHorizontal:12,paddingVertical:2}}>
    <Tap accessibilityRole="button" onPress={()=>go('notifications')} style={{minHeight:52,flexDirection:'row',alignItems:'center',gap:12}}><Icon name="notifications-outline" size={20}/><Txt size={14} style={{flex:1}}>Notifications</Txt><Icon name="chevron-forward" size={17} color={C.muted}/></Tap>
    <SettingsDivider/>
    <View style={{minHeight:52,flexDirection:'row',alignItems:'center',gap:12}}><Icon name="shield-checkmark-outline" size={20}/><View style={{flex:1,gap:1}}><Txt size={14}>Privacy</Txt><Txt size={11} color={C.muted}>Local AI data stays on this device</Txt></View></View>
    <SettingsDivider/>
    <Tap accessibilityRole="button" onPress={()=>void replayOnboarding()} style={{minHeight:52,flexDirection:'row',alignItems:'center',gap:12}}><Icon name="help-circle-outline" size={20}/><Txt size={14} style={{flex:1}}>Welcome tour</Txt><Icon name="chevron-forward" size={17} color={C.muted}/></Tap>
   </Card>
  </SettingsSection>
  <ModelSetupOverlay stage={setupStage} progress={modelProgress} onCancel={setupStage==='download-model'?cancelDownload:undefined}/>
 </ScrollView>;
}
