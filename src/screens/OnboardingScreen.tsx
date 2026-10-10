import React,{useEffect,useRef,useState} from 'react';
import {BackHandler,ScrollView,Text,View,useWindowDimensions,type DimensionValue} from 'react-native';
import Reanimated,{Extrapolation,FadeIn,cancelAnimation,interpolate,useAnimatedRef,useAnimatedScrollHandler,useAnimatedStyle,useSharedValue,withDelay,withRepeat,withSequence,withSpring,withTiming,type EntryExitAnimationFunction,type SharedValue} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type {DownloadResumable} from 'expo-file-system/legacy';
import {EASE_IN_OUT,EASE_OUT,EASE_OUT_CSS,ROW_IN,ROW_OUT,SPRING_SETTLE} from '../theme/motion';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBrief} from '../lib/appContext';
import {C} from '../theme/tokens';
import {CloudHalo,CompanyLogo,Icon,Mascot,Primary,Sparkles,Tap,Txt,Wordmark,useReducedMotion} from '../components/Ui';
import {LiveMascot} from '../components/LiveMascot';
import {ModelSetupOverlay,TypingDots,type ModelSetupStage} from '../components/States';
import {hasProfileDetails,listItems} from '../lib/profile';
import type {Profile} from '../types';
import {MODEL_CATALOG,type CatalogModel} from '../lib/modelCatalog';
import {downloadCatalogBundle,deleteLocalFile,pickModel} from '../lib/imports';
import {benchmarkModel,configureModel,modelPath,visionProjectorPath,supportsVision} from '../lib/ai';
import {STT_MODELS,VAD_MODEL,formatMB,type SpeechModel} from '../lib/voice/catalog';
import {downloadSpeechModels,installedModel as installedSpeechModel,speechInstalled} from '../lib/voice/stt';

const PAGES=5;
const shadow={shadowColor:'#33446A',shadowOpacity:0.1,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:4} as const;

function Headline({a,b}:{a:string,b:string}){return <Text accessibilityRole="header" style={{fontSize:32,lineHeight:37,fontWeight:'800',letterSpacing:-0.9,color:C.ink}}>{a}{'\n'}<Text style={{color:C.blue}}>{b}</Text></Text>;}
const Lead=({children}:{children:string})=><Txt size={17} color={C.muted} style={{lineHeight:24}}>{children}</Txt>;
const Bar=({w,color='#E3ECF8',h=8}:{w:DimensionValue,color?:string,h?:number})=><View style={{width:w,height:h,borderRadius:h/2,backgroundColor:color}}/>;
const Dot=()=><View style={{width:5,height:5,borderRadius:3,backgroundColor:C.blue}}/>;

/** Illustration drifts a little slower than the page for depth (UI thread, driven by the pager); static with Reduce Motion. */
function Parallax({x,i,width,children}:{x:SharedValue<number>,i:number,width:number,children:React.ReactNode}){
 const reduce=useReducedMotion();
 const style=useAnimatedStyle(()=>reduce?{}:{transform:[{translateX:interpolate(x.get(),[(i-1)*width,i*width,(i+1)*width],[width*0.18,0,-width*0.18],Extrapolation.CLAMP)}]});
 return <Reanimated.View style={style}>{children}</Reanimated.View>;
}

// First-run welcome (the delight budget lives here): the mascot settles up into place, sparkles follow, then the words.
const MASCOT_IN:EntryExitAnimationFunction=()=>{'worklet';return {initialValues:{opacity:0,transform:[{translateY:14},{scale:0.96}]},animations:{opacity:withTiming(1,{duration:260,easing:EASE_OUT}),transform:[{translateY:withSpring(0,SPRING_SETTLE)},{scale:withSpring(1,SPRING_SETTLE)}]}};};
const SPARKLES_IN:EntryExitAnimationFunction=()=>{'worklet';return {initialValues:{opacity:0,transform:[{scale:0.6}]},animations:{opacity:withDelay(180,withTiming(1,{duration:200,easing:EASE_OUT})),transform:[{scale:withDelay(180,withSpring(1,{duration:350,dampingRatio:0.8}))}]}};};
const TEXT_IN=FadeIn.duration(260).easing(EASE_OUT).delay(240),TEXT_IN_2=FadeIn.duration(260).easing(EASE_OUT).delay(300);

function Rows({rows}:{rows:{icon:string,title:string,sub:string,onPress?:()=>void}[]}){
 return <View style={{backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:C.line,paddingHorizontal:14,...shadow,shadowOpacity:0.05}}>
 {rows.map((r,i)=>{
  const style={flexDirection:'row',alignItems:'center',gap:12,minHeight:r.onPress?64:58,borderTopWidth:i?1:0,borderTopColor:C.line} as const; // info-only rows sit tighter
  const body=<><View style={{width:40,height:40,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name={r.icon} size={21} color={C.blue}/></View>
   <View style={{flex:1}}><Txt bold size={15}>{r.title}</Txt><Txt size={13} color={C.muted}>{r.sub}</Txt></View>
   {!!r.onPress&&<Icon name="chevron-forward" size={16} color={C.blue}/>}</>;
  return r.onPress?<Tap key={r.title} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.sub}`} onPress={r.onPress} style={style}>{body}</Tap>
   :<View key={r.title} accessible accessibilityLabel={`${r.title}. ${r.sub}`} style={style}>{body}</View>;})}
 </View>;
}

function Welcome(){
 const reduce=useReducedMotion();const fade=FadeIn.duration(200);
 return <View style={{alignItems:'center',gap:20}}>
 <Wordmark size={44}/>
 <View><CloudHalo size={244}><Reanimated.View entering={reduce?fade:MASCOT_IN}><LiveMascot size={176}/></Reanimated.View></CloudHalo><Reanimated.View entering={reduce?fade:SPARKLES_IN} style={{position:'absolute',left:4,top:16}}><Sparkles size={56}/></Reanimated.View></View>
 <View style={{gap:10,alignItems:'center'}}>
  <Reanimated.View entering={reduce?fade:TEXT_IN}><Text accessibilityRole="header" style={{fontSize:30,lineHeight:36,fontWeight:'800',letterSpacing:-0.8,color:C.ink}}>Welcome to brief</Text></Reanimated.View>
  <Reanimated.View entering={reduce?fade:TEXT_IN_2}><Txt size={17} color={C.muted} style={{textAlign:'center',lineHeight:24,maxWidth:320}}>Track jobs, prepare for interviews, and stay organized — all in one place, with the help of AI.</Txt></Reanimated.View>
 </View>
 </View>;
}

function JobCardArt(){
 return <View style={{height:180,alignItems:'center',justifyContent:'center'}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
 <View style={{position:'absolute',width:262,height:160,borderRadius:30,backgroundColor:C.pale,transform:[{rotate:'-3deg'}]}}/>
 <View style={{width:246,padding:16,gap:10,borderRadius:20,backgroundColor:C.white,transform:[{rotate:'-8deg'}],...shadow}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:10}}><CompanyLogo size={40}/><View><Txt bold size={15}>Product Manager</Txt><Txt size={12} color={C.muted}>Remote · Full-time</Txt></View></View>
  <Bar w="88%"/><Bar w="62%"/>
  <View style={{backgroundColor:C.blue,borderRadius:12,paddingVertical:10,alignItems:'center',marginTop:2}}><Txt bold color={C.white} size={14}>Add to Brief</Txt></View>
 </View>
 <View style={{position:'absolute',right:22,top:6,transform:[{rotate:'95deg'}]}}><Sparkles size={34}/></View>
 </View>;
}

function ResumeArt({p}:{p:Profile}){
 const section=(label:string,items:string[],bars:DimensionValue[])=><View style={{gap:5}}>
  <Txt bold size={10} style={{letterSpacing:0.8}}>{label}</Txt>
  {items.length?items.map((t,i)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:7}}><Dot/><Txt size={11} color={C.muted} numberOfLines={1} style={{flex:1}}>{t}</Txt></View>)
  :bars.map((w,i)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:7}}><Dot/><Bar w={w} h={6} color={i===0?'#9CC6FB':'#E3ECF8'}/></View>)}
 </View>;
 const skills=listItems(p.skills,4,true);
 return <View style={{backgroundColor:C.pale,borderRadius:22,padding:14}} accessible accessibilityLabel={hasProfileDetails(p)?'Your resume preview':'Empty resume preview'}>
 <View style={{backgroundColor:C.white,borderRadius:14,padding:16,gap:12,...shadow,shadowOpacity:0.07}}>
  <View style={{flexDirection:'row',alignItems:'flex-start',gap:10}}>
   <View style={{flex:1}}><Txt bold size={19} color="#0B3A8C" numberOfLines={1}>{p.name||'Your name'}</Txt><Txt size={12} color={C.muted} numberOfLines={1}>{listItems(p.goals,1)[0]||'Your target role'}</Txt></View>
   {p.resumeUri?<View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:C.greenSoft,borderRadius:12,paddingHorizontal:8,paddingVertical:4}}><Icon name="checkmark-circle" size={13} color={C.green}/><Txt size={11} color={C.green}>Resume added</Txt></View>
   :<View style={{gap:4,paddingTop:6,width:44}}><Bar w="100%" h={5}/><Bar w="100%" h={5}/></View>}
  </View>
  {section('EXPERIENCE',listItems(p.experience,2),['70%','86%'])}
  {section('EDUCATION',listItems(p.education,1),['62%'])}
  {section('SKILLS',skills.length?[skills.join(' · ')]:[],['78%'])}
 </View>
 </View>;
}

function PracticeArt(){
 return <View style={{height:144,flexDirection:'row',alignItems:'flex-end'}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
 <View><CloudHalo size={150}><Mascot size={108}/></CloudHalo><View style={{position:'absolute',left:-2,top:4}}><Sparkles size={36}/></View></View>
 <View style={{flex:1,gap:10,paddingBottom:34,marginLeft:-8}}>
  <View style={{alignSelf:'flex-end',maxWidth:206,flexDirection:'row',gap:8,backgroundColor:C.white,borderRadius:18,borderBottomLeftRadius:6,padding:12,...shadow,shadowOpacity:0.08}}><Icon name="sparkles" size={16} color={C.blue}/><Txt size={13} style={{flex:1,lineHeight:18}}>Let’s practice! What interests you about this role?</Txt></View>
  <View style={{alignSelf:'flex-end',backgroundColor:'#CFE2FC',borderRadius:18,borderBottomRightRadius:6,paddingHorizontal:18,paddingVertical:13}}><TypingDots/></View>
 </View>
 </View>;
}

/** One bar of the "listening" waveform: breathes while its page is on screen, rests at a fixed height otherwise. */
const BAR_REST=[0.45,0.8,1,0.65,0.4];
function SoundBar({i,active}:{i:number,active:boolean}){
 const reduce=useReducedMotion();const s=useSharedValue(BAR_REST[i]);
 useEffect(()=>{
  if(!active||reduce){cancelAnimation(s);s.set(withTiming(BAR_REST[i],{duration:200,easing:EASE_OUT}));return;}
  const d=360+i*60;
  s.set(withDelay(i*90,withRepeat(withSequence(withTiming(1,{duration:d,easing:EASE_IN_OUT}),withTiming(0.3,{duration:d,easing:EASE_IN_OUT})),-1)));
  return ()=>cancelAnimation(s);
 },[active,reduce]);
 const style=useAnimatedStyle(()=>({transform:[{scaleY:s.get()}]}));
 return <Reanimated.View style={[{width:4,height:22,borderRadius:2,backgroundColor:C.white},style]}/>;
}

/** Mascot listens (waveform), then the words appear: speech becomes text on the phone. */
function VoiceArt({active,mood,ready}:{active:boolean,mood:'happy'|'question'|'sad',ready:boolean}){
 const reduce=useReducedMotion();const shown=useSharedValue(0);
 useEffect(()=>{if(active&&!shown.get())shown.set(reduce?1:withDelay(700,withTiming(1,{duration:320,easing:EASE_OUT})));},[active,reduce]);
 const transcript=useAnimatedStyle(()=>({opacity:shown.get(),transform:[{translateY:(1-shown.get())*8}]}));
 return <View style={{height:150,flexDirection:'row',alignItems:'flex-end'}}>
 <View><CloudHalo size={150}><LiveMascot size={108} mood={mood}/></CloudHalo>
  {ready&&<Reanimated.View entering={reduce?FadeIn.duration(200):SPARKLES_IN} pointerEvents="none" style={{position:'absolute',left:-2,top:4}}><Sparkles size={36}/></Reanimated.View>}</View>
 <View style={{flex:1,gap:10,paddingBottom:30,marginLeft:-8,alignItems:'flex-end'}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
  <View style={{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.blue,borderRadius:18,borderBottomRightRadius:6,paddingHorizontal:14,paddingVertical:11}}>
   <Icon name="mic" size={16} color={C.white}/><View style={{flexDirection:'row',alignItems:'center',gap:4,height:22}}>{BAR_REST.map((_,i)=><SoundBar key={i} i={i} active={active}/>)}</View>
  </View>
  <Reanimated.View style={[{maxWidth:206,flexDirection:'row',gap:8,backgroundColor:C.white,borderRadius:18,borderBottomRightRadius:6,padding:12,...shadow,shadowOpacity:0.08},transcript]}>
   <Icon name="text-outline" size={16} color={C.blue}/><Txt size={13} style={{flex:1,lineHeight:18}}>“I led a team of four to ship our app.”</Txt>
  </Reanimated.View>
 </View>
 </View>;
}

function Progress({pct}:{pct:number}){
 const p=useSharedValue(pct/100);
 useEffect(()=>{p.set(withTiming(pct/100,{duration:240,easing:EASE_OUT}));},[pct]);
 const fill=useAnimatedStyle(()=>({transform:[{scaleX:p.get()}]}));
 return <View style={{height:6,borderRadius:3,backgroundColor:C.line,overflow:'hidden'}}><Reanimated.View style={[{height:6,backgroundColor:C.blue,transformOrigin:'left'},fill]}/></View>;
}

const VOICE_BLURB:Record<string,string>={'whisper-base-en':'Quick and light','whisper-small-en':'Better with accents, a bit slower'};
const voiceSize=(m:SpeechModel)=>formatMB(m.bytes+VAD_MODEL.bytes);
type VoiceSetup={phase:'idle'|'download'|'verify'|'ready'|'error',pct:number,message:string,model:SpeechModel|null};
const card={backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:C.line,paddingHorizontal:14,...shadow,shadowOpacity:0.05} as const;

/** Optional offline speech recognition for voice answers. Same download, size and checksum checks as Settings. */
function VoicePage({x,i,width,active,onBusyChange}:{x:SharedValue<number>,i:number,width:number,active:boolean,onBusyChange:(busy:boolean)=>void}){
 const [choice,setChoice]=useState(STT_MODELS[0].id),[setup,setSetup]=useState<VoiceSetup>({phase:'idle',pct:0,message:'',model:null});
 const task=useRef<DownloadResumable|null>(null),cancelRequested=useRef(false);
 useEffect(()=>{void Promise.all([speechInstalled(),installedSpeechModel()]).then(([ok,m])=>{if(ok){setSetup({phase:'ready',pct:0,message:'',model:m});if(m)setChoice(m.id);}}).catch(()=>{});},[]);
 const busy=setup.phase==='download'||setup.phase==='verify';
 async function download(){
  const model=STT_MODELS.find(m=>m.id===choice)??STT_MODELS[0];
  cancelRequested.current=false;onBusyChange(true);setSetup({phase:'download',pct:0,message:'',model});
  try{
   const done=await downloadSpeechModels(model,(stage,f)=>setSetup(s=>({...s,phase:stage,pct:Math.round(f*100)})),t=>{task.current=t;if(t&&cancelRequested.current)void t.cancelAsync();});
   if(!done){setSetup({phase:'idle',pct:0,message:'Download canceled.',model:null});return;}
   setSetup({phase:'ready',pct:0,message:'',model});void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }catch(e){setSetup({phase:'error',pct:0,message:(e as Error).message||'The voice model couldn’t be installed.',model});}
  finally{task.current=null;cancelRequested.current=false;onBusyChange(false);}
 }
 const mood=busy?'question':setup.phase==='error'?'sad':'happy';
 return <>
  <Headline a="Answer" b="out loud."/>
  <Lead>Speak your answers in mock interviews. Brief turns your voice into text right on this phone.</Lead>
  <Parallax x={x} i={i} width={width}><VoiceArt active={active} mood={mood} ready={setup.phase==='ready'}/></Parallax>
  {setup.phase==='ready'?<Reanimated.View key="ready" entering={ROW_IN} exiting={ROW_OUT} accessible accessibilityLiveRegion="polite" accessibilityLabel={`Voice answers are ready. ${setup.model?.name??''} speech model, works offline.`} style={[card,{flexDirection:'row',alignItems:'center',gap:12,minHeight:68}]}>
   <View style={{width:40,height:40,borderRadius:12,backgroundColor:C.greenSoft,alignItems:'center',justifyContent:'center'}}><Icon name="checkmark-circle" size={22} color={C.green}/></View>
   <View style={{flex:1}}><Txt bold size={15}>Voice answers are ready</Txt><Txt size={13} color={C.muted}>{setup.model?`${setup.model.name} · works offline`:'Works offline'}</Txt></View>
  </Reanimated.View>
  :busy?<Reanimated.View key="busy" entering={ROW_IN} exiting={ROW_OUT} style={[card,{paddingVertical:14,gap:10}]}>
   <View accessibilityRole="progressbar" accessibilityLabel={setup.phase==='download'?'Downloading voice model':'Checking voice model'} accessibilityValue={{min:0,max:100,now:setup.pct}}><Progress pct={setup.pct}/></View>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Txt size={13} color={C.muted}>{setup.phase==='download'?'Downloading':'Checking the file'} · {setup.pct}%</Txt>
    {setup.phase==='download'&&<Tap accessibilityRole="button" onPress={()=>{cancelRequested.current=true;void task.current?.cancelAsync();}} style={{minHeight:44,minWidth:64,alignItems:'flex-end',justifyContent:'center'}}><Txt size={14} bold color={C.blue}>Cancel</Txt></Tap>}
   </View>
  </Reanimated.View>
  :<Reanimated.View key="choose" entering={ROW_IN} exiting={ROW_OUT} style={{gap:10}}>
   <View accessibilityRole="radiogroup" style={card}>
    {STT_MODELS.map((m,n)=>{const on=m.id===choice;return <Tap key={m.id} accessibilityRole="radio" accessibilityState={{checked:on}} accessibilityLabel={`${m.name}${n===0?', recommended':''}. ${voiceSize(m)}. ${VOICE_BLURB[m.id]??m.description}`} onPress={()=>{if(on)return;setChoice(m.id);void Haptics.selectionAsync();}} style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:64,borderTopWidth:n?1:0,borderTopColor:C.line}}>
     <View style={{width:40,height:40,borderRadius:12,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name={n?'ear-outline':'flash-outline'} size={21} color={C.blue}/></View>
     <View style={{flex:1}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:6}}><Txt bold size={15}>{m.name}</Txt>{n===0&&<View style={{backgroundColor:C.pale,borderRadius:8,paddingHorizontal:7,paddingVertical:2}}><Txt size={11} bold color={C.blue}>Recommended</Txt></View>}</View>
      <Txt size={13} color={C.muted}>{voiceSize(m)} · {VOICE_BLURB[m.id]??m.description}</Txt>
     </View>
     <View style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:on?C.blue:'#C9D6EA',alignItems:'center',justifyContent:'center'}}>
      <Reanimated.View style={{width:10,height:10,borderRadius:5,backgroundColor:C.blue,transitionProperty:'transform',transitionDuration:180,transitionTimingFunction:EASE_OUT_CSS,transform:[{scale:on?1:0}]}}/>
     </View>
    </Tap>;})}
   </View>
   {!!setup.message&&<View accessibilityLiveRegion="polite" accessibilityRole={setup.phase==='error'?'alert':undefined}><Txt size={13} color={setup.phase==='error'?C.danger:C.muted} style={{textAlign:'center'}}>{setup.message}</Txt></View>}
   <Primary secondary label={setup.phase==='error'?'Try again':`Download · ${voiceSize(STT_MODELS.find(m=>m.id===choice)??STT_MODELS[0])}`} onPress={()=>void download()}/>
  </Reanimated.View>}
  <Txt size={12} color={C.muted} style={{textAlign:'center'}}>Optional. You can always type instead, or set this up later in Settings → Voice interviews. Your voice stays on this phone and is never saved.</Txt>
 </>;
}

/** Page indicator that tracks the finger: each dot's fill follows the pager's live scroll position. */
function PageDot({x,i,width}:{x:SharedValue<number>,i:number,width:number}){
 const fill=useAnimatedStyle(()=>({opacity:interpolate(x.get(),[(i-1)*width,i*width,(i+1)*width],[0,1,0],Extrapolation.CLAMP)}));
 return <View style={{width:8,height:8,borderRadius:4,backgroundColor:'#D5E3F7'}}><Reanimated.View style={[{position:'absolute',top:0,left:0,right:0,bottom:0,borderRadius:4,backgroundColor:C.blue},fill]}/></View>;
}
function PageDots({x,width,index}:{x:SharedValue<number>,width:number,index:number}){
 return <View accessible accessibilityLabel={`Page ${index+1} of ${PAGES}`} style={{flexDirection:'row',justifyContent:'center',gap:10}}>
 {Array.from({length:PAGES},(_,i)=><PageDot key={i} x={x} i={i} width={width}/>)}
 </View>;
}

/** First-launch onboarding: five swipeable pages. Everything entered here is saved to the local profile
 *  immediately; Skip / Get started set the `onboarded` pref so it never shows again. */
export function OnboardingScreen(){
 const {profile,finishOnboarding}=useBrief();
 const {width}=useWindowDimensions();const insets=useSafeAreaInsets();const reduce=useReducedMotion();
 const pager=useAnimatedRef<Reanimated.ScrollView>();const x=useSharedValue(0);
 const onScroll=useAnimatedScrollHandler(e=>{x.set(e.contentOffset.x);});
 const [index,setIndex]=useState(0),[voiceBusy,setVoiceBusy]=useState(false),[setupStage,setSetupStage]=useState<ModelSetupStage|null>(null),[modelProgress,setModelProgress]=useState<number|null>(null),[installedModel,setInstalledModel]=useState(''),[setupMessage,setSetupMessage]=useState(''),[setupError,setSetupError]=useState(false);
 const downloadTask=useRef<import('expo-file-system/legacy').DownloadResumable|null>(null),cancelRequested=useRef(false);
 const setupBusy=setupStage!==null||voiceBusy;
 useEffect(()=>{void modelPath().then(setInstalledModel);},[]);
 const goTo=(i:number)=>{if(setupBusy)return;setIndex(i);pager.current?.scrollTo({x:i*width,animated:!reduce});};
 useEffect(()=>{const s=BackHandler.addEventListener('hardwareBackPress',()=>{if(setupBusy)return true;if(index>0){goTo(index-1);return true;}return false;});return ()=>s.remove();},[index,width,setupBusy]);
 async function installFromCatalog(entry:CatalogModel){
  cancelRequested.current=false;setSetupMessage('');setSetupError(false);setModelProgress(0);setSetupStage('download-model');
  let downloaded:{modelUri:string,projectorUri:string}|null=null;let previousModel='',previousProjector='';let switched=false;
  try{
   downloaded=await downloadCatalogBundle(entry,p=>setModelProgress(Math.round(p*100)),task=>{downloadTask.current=task;if(task&&cancelRequested.current)void task.cancelAsync();});
   if(!downloaded){setSetupMessage('Download canceled. You can choose a model or continue without AI.');return;}
   [previousModel,previousProjector]=await Promise.all([modelPath(),visionProjectorPath()]);
   await configureModel(downloaded.modelUri,downloaded.projectorUri);switched=true;setInstalledModel(downloaded.modelUri);setSetupStage('load-model');setModelProgress(0);
   await benchmarkModel(p=>setModelProgress(Math.max(0,Math.min(100,Math.round(p)))),()=>{setSetupStage('check-model');setModelProgress(null);});
   if(entry.projector&&!await supportsVision())throw new Error('Image support did not initialize. Your previous model is restored.');
   if(previousModel&&previousModel!==downloaded.modelUri)await deleteLocalFile(previousModel).catch(()=>{});
   if(previousProjector&&previousProjector!==downloaded.projectorUri)await deleteLocalFile(previousProjector).catch(()=>{});
   setSetupMessage(`${entry.name} is ready ${entry.projector?'for text and images':'for text'} on this phone. Continue when you’re ready.`);
  }catch(e){
   if(switched){await configureModel(previousModel,previousProjector).catch(()=>{});setInstalledModel(previousModel);}
   if(downloaded){await deleteLocalFile(downloaded.modelUri).catch(()=>{});await deleteLocalFile(downloaded.projectorUri).catch(()=>{});}
   setSetupMessage(`Setup couldn’t finish. ${(e as Error).message}`);setSetupError(true);
  }
  finally{downloadTask.current=null;cancelRequested.current=false;setSetupStage(null);setModelProgress(null);}
 }
 async function importLocalModel(){
  setSetupMessage('');setSetupError(false);setSetupStage('choose-model');
  let imported='';
  try{const uri=await pickModel();if(!uri)return;imported=uri;setSetupStage('import-model');const [oldModel,oldProjector]=await Promise.all([modelPath(),visionProjectorPath()]);await configureModel(uri);if(oldModel&&oldModel!==uri)await deleteLocalFile(oldModel).catch(()=>{});if(oldProjector)await deleteLocalFile(oldProjector).catch(()=>{});setInstalledModel(uri);setSetupMessage('Model added. Brief will test it when you continue in Settings.');}
  catch(e){if(imported)await deleteLocalFile(imported).catch(()=>{});setSetupMessage(`Couldn’t add the model. ${(e as Error).message}`);setSetupError(true);}
  finally{setSetupStage(null);}
 }
 function cancelModelDownload(){cancelRequested.current=true;void downloadTask.current?.cancelAsync();}
 const last=index===PAGES-1;
 const page=(i:number,content:React.ReactNode)=><ScrollView key={i} style={{width}} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow:1,paddingHorizontal:24,paddingTop:16,paddingBottom:12,gap:16}}>{content}</ScrollView>;

 return <View style={{flex:1}}>
 <Reanimated.ScrollView ref={pager} horizontal pagingEnabled scrollEnabled={!setupBusy} bounces={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
  onScroll={onScroll}
  onMomentumScrollEnd={e=>setIndex(Math.round(e.nativeEvent.contentOffset.x/width))}>
  {page(0,<View style={{flex:1,justifyContent:'center'}}><Parallax x={x} i={0} width={width}><Welcome/></Parallax></View>)}
  {page(1,<>
   <Headline a="Add jobs" b="in seconds."/>
   <Lead>Save job posts from anywhere and keep track of your applications in one place.</Lead>
   <Parallax x={x} i={1} width={width}><JobCardArt/></Parallax>
   <Rows rows={[
    {icon:'image-outline',title:'Import screenshot',sub:'Grab job posts from anywhere'},
    {icon:'camera-outline',title:'Take a photo',sub:'Snap and save job details'},
    {icon:'document-text-outline',title:'Add manually',sub:'Enter the details yourself'},
   ]}/>
  </>)}
  {page(2,<>
   <Headline a="Make Brief smarter" b="with your resume."/>
   <Lead>Your resume helps Brief give you personalized interview practice, job-specific advice, and smarter suggestions.</Lead>
   <Parallax x={x} i={2} width={width}><ResumeArt p={profile}/></Parallax>
   <Txt size={13} color={C.muted} style={{textAlign:'center'}}>Add your resume anytime from Resume in the profile menu.</Txt>
  </>)}
  {page(3,<>
   <Headline a="Practice with" b="Local AI."/>
   <Lead>Realistic mock interviews and job-specific guidance, powered by AI that runs on your phone.</Lead>
   <Parallax x={x} i={3} width={width}><PracticeArt/></Parallax>
   <Rows rows={[
    {icon:'lock-closed-outline',title:'Runs on your device',sub:'Your data stays private'},
    {icon:'cloud-offline-outline',title:'No AI in the cloud',sub:'Chats and interviews stay on this phone'},
   ]}/>
   <View style={{gap:9}}>
    <Txt size={12} color={C.muted} style={{textAlign:'center'}}>Local AI is optional. Download a recommended model directly to this phone, or import a compatible GGUF you already have.</Txt>
    {MODEL_CATALOG.map(entry=><View key={entry.id} style={{gap:8,borderRadius:15,borderWidth:1,borderColor:C.line,padding:12,backgroundColor:C.white}}>
     <View style={{flexDirection:'row',alignItems:'flex-start',gap:8}}><View style={{flex:1,gap:3}}><Txt bold size={14}>{entry.name}{entry.badge?` · ${entry.badge}`:''}</Txt><Txt size={12} color={C.muted}>{entry.description}</Txt><Txt size={11} color={C.muted}>{entry.sizeLabel} · {entry.projector?'Text + images':'Text only'} · {entry.license}</Txt></View><Icon name="cloud-download-outline" size={18} color={C.blue}/></View>
     <Tap accessibilityRole="button" accessibilityLabel={`${installedModel?'Download and switch to':'Download'} ${entry.name}, ${entry.sizeLabel}`} onPress={()=>void installFromCatalog(entry)} style={{minHeight:42,flexDirection:'row',alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:C.pale}}><Txt size={13} bold color={C.blue}>{installedModel?'Download & switch':'Download model'}</Txt></Tap>
    </View>)}
    <Tap accessibilityRole="button" onPress={()=>void importLocalModel()} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Txt size={13} bold color={C.blue}>Import a model from this device instead</Txt></Tap>
    {!!setupMessage&&<Txt size={12} color={setupError?C.danger:C.green} style={{textAlign:'center'}}>{setupMessage}</Txt>}
    <Txt size={11} color={C.muted} style={{textAlign:'center'}}>Source: each model’s official GGUF files on Hugging Face. Downloads stay on this device; conversations never leave it.</Txt>
   </View>
  </>)}
  {page(4,<VoicePage x={x} i={4} width={width} active={index===4} onBusyChange={setVoiceBusy}/>)}
 </Reanimated.ScrollView>
 <View style={{paddingHorizontal:24,paddingTop:10,paddingBottom:Math.max(insets.bottom,12)+4,gap:12}}>
  <PageDots x={x} width={width} index={index}/>
  <Primary large disabled={setupBusy} icon="chevron-forward" label={last?'Get started':'Continue'} onPress={()=>last?void finishOnboarding():goTo(index+1)}/>
  <Tap accessibilityRole="button" disabled={setupBusy} onPress={()=>last?goTo(index-1):void finishOnboarding()} style={{alignSelf:'center',minHeight:44,minWidth:88,alignItems:'center',justifyContent:'center'}}><Txt size={15} color={C.muted}>{last?'Back':'Skip'}</Txt></Tap>
 </View>
 <ModelSetupOverlay stage={setupStage} progress={modelProgress} onCancel={setupStage==='download-model'?cancelModelDownload:undefined}/>
 </View>;
}
