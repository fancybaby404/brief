import React from 'react';
import {ScrollView,View} from 'react-native';
import {useBrief} from '../lib/appContext';
import {Card,CloudHalo,CompanyLogo,Icon,SectionTitle,StatusPill,Tap,Txt} from '../components/Ui';
import {C} from '../theme/tokens';
import {ProgressChart} from '../components/ProgressChart';
import Reanimated,{LayoutAnimationConfig} from 'react-native-reanimated';
import {LIST_REFLOW,ROW_IN,ROW_OUT} from '../theme/motion';
import {LiveMascot} from '../components/LiveMascot';
import {EmptyState} from '../components/States';
const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning,':h<18?'Good afternoon,':'Good evening,';};
export function HomeScreen(){const {profile,applications,go,goTab,openApp,openChat}=useBrief();
 return <LayoutAnimationConfig skipEntering><ScrollView contentContainerStyle={{paddingHorizontal:18,paddingBottom:115,gap:19}}>
 <View style={{flexDirection:'row',gap:12,alignItems:'center',marginTop:6}}>
 <CloudHalo size={150}><LiveMascot size={104}/></CloudHalo>
 <Tap accessibilityRole="button" accessibilityHint="Opens Ask Brief" onPress={()=>openChat()} style={{flex:1,backgroundColor:C.pale,borderRadius:20,padding:13,minHeight:116,justifyContent:'center'}}>
 <Txt size={13} color={C.muted}>{greeting()}</Txt><Txt size={23} bold>{profile.name||'job hunter'}!</Txt>
 <Txt size={12} color={C.muted}>Your next opportunity is one step closer. Ask Brief anything.</Txt>
 </Tap></View>
 <ProgressChart applications={applications}/>
 <View><SectionTitle right="See all" onRight={()=>go('applications')}>Recent applications</SectionTitle>
 {applications.length===0?<EmptyState card compact title="Your job hunt starts here" body="Add a job from a screenshot, a photo, or by hand — or browse remote jobs open to the Philippines." action={{label:'Add your first job',onPress:()=>go('add-job')}} secondary={{label:'Explore jobs',onPress:()=>goTab('jobs')}}/>:applications.slice(0,5).map(a=><Reanimated.View key={a.id} layout={LIST_REFLOW} entering={ROW_IN} exiting={ROW_OUT}><Tap accessibilityRole="button" onPress={()=>openApp(a)} style={{backgroundColor:C.white,borderRadius:17,padding:13,marginBottom:7,flexDirection:'row',alignItems:'center',gap:10,borderColor:C.line,borderWidth:1}}>
 <CompanyLogo uri={a.logoUrl} size={38}/>
 <View style={{flex:1}}><Txt bold size={13}>{a.company}</Txt><Txt size={11} color={C.muted} style={{flexShrink:1}}>{a.title}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={16}/>
  </Tap></Reanimated.View>)}</View>
 </ScrollView></LayoutAnimationConfig>;
}
