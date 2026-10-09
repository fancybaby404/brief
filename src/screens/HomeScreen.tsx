import React from 'react';
import {ScrollView,View} from 'react-native';
import {useBrief} from '../lib/appContext';
import {Card,CloudHalo,CompanyLogo,Icon,Mascot,SectionTitle,StatusPill,Tap,Txt} from '../components/Ui';
import {C} from '../theme/tokens';
import {progressBuckets,isApplied} from '../lib/tracker';
const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning,':h<18?'Good afternoon,':'Good evening,';};
export function HomeScreen(){const {profile,applications,go,openApp,openChat}=useBrief();
 const weeks=progressBuckets(applications);const max=Math.max(1,...weeks.map(w=>w.count));
 const applied=applications.filter(isApplied).length;
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingBottom:115,gap:19}}>
 <View style={{flexDirection:'row',gap:12,alignItems:'center',marginTop:6}}>
 <CloudHalo size={150}><Mascot size={104}/></CloudHalo>
 <Tap accessibilityRole="button" accessibilityHint="Opens Ask Brief" onPress={()=>openChat()} style={{flex:1,backgroundColor:C.pale,borderRadius:20,padding:13,minHeight:116,justifyContent:'center'}}>
 <Txt size={13} color={C.muted}>{greeting()}</Txt><Txt size={23} bold>{profile.name||'job hunter'}!</Txt>
 <Txt size={12} color={C.muted}>Your next opportunity is one step closer. Ask Brief anything.</Txt>
 </Tap></View>
 <Card style={{padding:14}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Txt size={16} bold>Application progress</Txt><Txt size={11} color={C.muted}>Last 4 weeks</Txt></View>
 <View style={{flexDirection:'row',gap:10,alignItems:'flex-end',marginTop:15}}>
 <View style={{width:86}}><Txt size={11} color={C.muted}>Applied</Txt><Txt size={28} bold>{applied}</Txt><Txt color={C.blue} size={10}>{applications.filter(a=>a.status==='interview').length} interviews</Txt></View>
 <View style={{flex:1,height:94,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around'}}>{weeks.map((w,i)=><View key={w.label} accessible accessibilityLabel={`Week of ${w.label}: ${w.count} applied`} style={{alignItems:'center',gap:4}}><Txt size={10} color={C.muted}>{w.count||''}</Txt><View style={{width:26,height:Math.max(5,62*w.count/max),borderRadius:6,backgroundColor:i===3?C.blue:'#B4D9FF'}}/><Txt size={10} color={C.muted}>{w.label}</Txt></View>)}</View>
 </View></Card>
 <View><SectionTitle right="See all" onRight={()=>go('applications')}>Recent applications</SectionTitle>
 {applications.length===0?<Card><Txt color={C.muted}>No applications yet. Tap + to add a job from a screenshot, link, or manually.</Txt></Card>:applications.slice(0,5).map(a=><Tap key={a.id} accessibilityRole="button" onPress={()=>openApp(a)} style={{backgroundColor:C.white,borderRadius:17,padding:13,marginBottom:7,flexDirection:'row',alignItems:'center',gap:10,borderColor:C.line,borderWidth:1}}>
 <CompanyLogo uri={a.logoUrl} size={38}/>
 <View style={{flex:1}}><Txt bold size={13}>{a.company}</Txt><Txt size={11} color={C.muted} style={{flexShrink:1}}>{a.title}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={16}/>
  </Tap>)}</View>
 </ScrollView>;
}
