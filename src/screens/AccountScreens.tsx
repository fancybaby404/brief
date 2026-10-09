import React,{useEffect,useState} from 'react';
import {Alert,ScrollView,Switch,View} from 'react-native';
import {useBrief} from '../lib/appContext';import {C} from '../theme/tokens';
import {Card,Field,Heading,Icon,Primary,PullDownMenu,Txt,Tap} from '../components/Ui';
import {CURRENCIES} from '../lib/currency';
import {deleteLocalFile,importResume,pickModel} from '../lib/imports';import {benchmarkModel,configureModel,modelPath,releaseModel} from '../lib/ai';
import * as Sharing from 'expo-sharing';
import {EmptyState} from '../components/States';
import {ProfileForm} from '../components/ProfileForm';
import Reanimated,{LayoutAnimationConfig} from 'react-native-reanimated';
import {ROW_IN,ROW_OUT} from '../theme/motion';
import {listItems} from '../lib/profile';
export function ResumeScreen(){const {profile,updateProfile}=useBrief();const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false);
 async function attach(){setBusy(true);try{const r=await importResume(profile.resumeUri);if(!r)return;await updateProfile({...profile,resumeUri:r.resumeUri,resumeText:r.resumeText,useResumeForAI:true});
  if(r.note)Alert.alert('Resume added',`${r.note} Add a few details so Brief can use them.`,[{text:'Later',style:'cancel'},{text:'Enter details',onPress:()=>setEditing(true)}]);}
  catch(e){Alert.alert('Couldn’t add resume',(e as Error).message);}finally{setBusy(false);}}
 async function openResume(){if(!profile.resumeUri)return;try{await Sharing.shareAsync(profile.resumeUri);}catch(e){Alert.alert('Can’t open the file',(e as Error).message);}}
 const remove=()=>Alert.alert('Remove resume?','The file and its extracted text are deleted from this phone. Your typed summary stays.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void deleteLocalFile(profile.resumeUri).then(()=>updateProfile({...profile,resumeUri:'',resumeText:''}))}]);
 const rows=[{icon:'briefcase-outline',text:profile.experience,empty:'Add your experience'},{icon:'school-outline',text:profile.education,empty:'Add your education'},{icon:'list-outline',text:profile.skills,empty:'Add your skills'},{icon:'flag-outline',text:profile.goals,empty:'Add the role you’re aiming for'}];
 return <LayoutAnimationConfig skipEntering><ScrollView contentContainerStyle={{padding:18,paddingBottom:125,gap:15}}><Heading>Resume</Heading>
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
export function NotificationsScreen(){const {goTab}=useBrief();return <ScrollView contentContainerStyle={{padding:18,paddingBottom:110,gap:15}}><Heading>Notifications</Heading><EmptyState title="You’re all caught up" body="Brief doesn’t send reminders yet. Your interviews and deadlines are in Calendar." action={{label:'Open Calendar',onPress:()=>goTab('calendar')}}/></ScrollView>}
export function SettingsScreen(){const {profile,updateProfile,replayOnboarding,currency,setCurrency,fx,fxError,refreshFx}=useBrief();const [refreshing,setRefreshing]=useState(false);const [model,setModel]=useState(''),[busy,setBusy]=useState(''),[name,setName]=useState(profile.name),[result,setResult]=useState('');
 useEffect(()=>{void modelPath().then(setModel);},[]);
 async function importModel(){setBusy('Importing model… large files can take a minute.');setResult('');try{await releaseModel();const uri=await pickModel();if(!uri)return;await configureModel(uri);setModel(uri);setResult('Model imported. Tap “Test local model” to load it.');}catch(e){Alert.alert('Import failed',(e as Error).message);}finally{setBusy('');}}
 async function testModel(){setBusy('Loading model… 0%');setResult('');try{const r=await benchmarkModel(p=>setBusy(`Loading model… ${Math.round(p)}%`));setResult(`Ready on this device. Load ${(r.loadMs/1000).toFixed(1)} s · ${r.tokensPerSec.toFixed(1)} tokens/s.\nSample: “${r.sample}”`);}catch(e){setResult('');Alert.alert('Model failed',(e as Error).message);}finally{setBusy('');}}
 return <ScrollView contentContainerStyle={{padding:18,paddingBottom:120,gap:18}}><Heading>Settings</Heading>
 <Card><Txt bold>Display name</Txt><Field label="Name" value={name} onChangeText={setName}/><Primary secondary label="Save name" onPress={()=>void updateProfile({...profile,name})}/></Card>
 <Card style={{gap:10}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}><View style={{flex:1}}><Txt bold>Salary currency</Txt><Txt color={C.muted} size={12}>Salaries in other currencies are converted for display.</Txt></View><PullDownMenu label="Salary currency" value={currency} options={CURRENCIES} onChange={c=>void setCurrency(c)}/></View>
  {currency!=='original'&&<View style={{flexDirection:'row',alignItems:'center',gap:8}}>
   <Txt size={12} color={fxError&&!fx?C.danger:C.muted} style={{flex:1}}>{fx?`European Central Bank rates from ${fx.rates.date}.${fxError?' Couldn’t update just now.':''}`:fxError||'Getting exchange rates…'}{!fx?' Salaries show as listed until rates arrive.':''}</Txt>
   <Tap accessibilityRole="button" disabled={refreshing} hitSlop={10} onPress={()=>{setRefreshing(true);void refreshFx().finally(()=>setRefreshing(false));}}><Txt size={13} bold color={C.blue}>{refreshing?'Updating…':'Update'}</Txt></Tap>
  </View>}
 </Card>
 <Card><Txt bold>On-device AI model</Txt><Txt color={C.muted} size={12} style={{marginVertical:9}}>{model?'A model is installed on this phone. Test it to check it loads and see how fast it runs.':'No model yet. Download a small GGUF chat model to your phone (for example Qwen3 1.7B, Q4_K_M, about 1.1 GB; or 0.6B for phones with 4 GB RAM or less), check its license, then import it here. Job tracking works without it.'}</Txt><Primary label="Import GGUF model" disabled={!!busy} onPress={()=>void importModel()}/><View style={{height:8}}/><Primary label="Test local model" secondary disabled={!!busy||!model} onPress={()=>void testModel()}/>{!!(busy||result)&&<Txt size={12} color={busy?C.muted:C.green} style={{marginTop:10}}>{busy||result}</Txt>}</Card>
 <Card><Txt bold>Privacy</Txt><Txt color={C.muted} style={{marginTop:8}}>Applications, messages, and profile data are saved in your device's local SQLite database. Discovery requires an internet connection. No account or cloud LLM is configured.</Txt></Card>
 <Card style={{gap:10}}><Txt bold>Welcome tour</Txt><Txt color={C.muted} size={12}>See the introduction again. Your jobs and profile are kept.</Txt><Primary secondary label="Show onboarding again" onPress={()=>void replayOnboarding()}/></Card>
 </ScrollView>;
}
