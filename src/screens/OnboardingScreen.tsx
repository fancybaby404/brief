import React,{useEffect,useRef,useState} from 'react';
import {BackHandler,ScrollView,Text,View,useWindowDimensions,type DimensionValue} from 'react-native';
import Reanimated,{Extrapolation,FadeIn,interpolate,useAnimatedRef,useAnimatedScrollHandler,useAnimatedStyle,useSharedValue,withDelay,withSpring,withTiming,type EntryExitAnimationFunction,type SharedValue} from 'react-native-reanimated';
import {EASE_OUT,SPRING_SETTLE} from '../theme/motion';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBrief} from '../lib/appContext';
import {C} from '../theme/tokens';
import {CloudHalo,CompanyLogo,Icon,Mascot,Primary,Sparkles,Tap,Txt,Wordmark,useReducedMotion} from '../components/Ui';
import {LiveMascot} from '../components/LiveMascot';
import {TypingDots} from '../components/States';
import {hasProfileDetails,listItems} from '../lib/profile';
import type {Profile} from '../types';

const PAGES=4;
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

/** First-launch onboarding: four swipeable pages. Everything entered here is saved to the local profile
 *  immediately; Skip / Get started set the `onboarded` pref so it never shows again. */
export function OnboardingScreen(){
 const {profile,finishOnboarding}=useBrief();
 const {width}=useWindowDimensions();const insets=useSafeAreaInsets();const reduce=useReducedMotion();
 const pager=useAnimatedRef<Reanimated.ScrollView>();const x=useSharedValue(0);
 const onScroll=useAnimatedScrollHandler(e=>{x.set(e.contentOffset.x);});
 const [index,setIndex]=useState(0);
 const goTo=(i:number)=>{setIndex(i);pager.current?.scrollTo({x:i*width,animated:!reduce});};
 useEffect(()=>{const s=BackHandler.addEventListener('hardwareBackPress',()=>{if(index>0){goTo(index-1);return true;}return false;});return ()=>s.remove();},[index,width]);
 const last=index===PAGES-1;
 const page=(i:number,content:React.ReactNode)=><ScrollView key={i} style={{width}} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow:1,paddingHorizontal:24,paddingTop:16,paddingBottom:12,gap:16}}>{content}</ScrollView>;

 return <View style={{flex:1}}>
 <Reanimated.ScrollView ref={pager} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
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
    {icon:'shield-checkmark-outline',title:'Safe & secure',sub:'Practice with confidence'},
   ]}/>
   <Txt size={12} color={C.muted} style={{textAlign:'center'}}>Add an on-device model in Settings when you’re ready. Job tracking works without it.</Txt>
  </>)}
 </Reanimated.ScrollView>
 <View style={{paddingHorizontal:24,paddingTop:10,paddingBottom:Math.max(insets.bottom,12)+4,gap:12}}>
  <PageDots x={x} width={width} index={index}/>
  <Primary large icon="chevron-forward" label={last?'Get started':'Continue'} onPress={()=>last?void finishOnboarding():goTo(index+1)}/>
  <Tap accessibilityRole="button" onPress={()=>last?goTo(index-1):void finishOnboarding()} style={{alignSelf:'center',minHeight:44,minWidth:88,alignItems:'center',justifyContent:'center'}}><Txt size={15} color={C.muted}>{last?'Back':'Skip'}</Txt></Tap>
 </View>
 </View>;
}
