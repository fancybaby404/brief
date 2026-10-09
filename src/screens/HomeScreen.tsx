import React from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {useBrief} from '../lib/appContext';
import {Card,Heading,Icon,Mascot,SectionTitle,StatusPill,Txt} from '../components/Ui';
import {C} from '../theme/tokens';
function buckets(dates:string[]){const now=Date.now();return [3,2,1,0].map(weeksAgo=>{
 const until=now-weeksAgo*7*86400000;const since=until-7*86400000;
 return dates.filter(x=>{const t=new Date(x).getTime();return t>=since&&t<until;}).length;
});}
export function HomeScreen(){const {profile,applications,go,openApp,openChat}=useBrief();
 const counts=buckets(applications.filter(a=>a.status!=='saved'&&a.status!=='interested').map(a=>a.appliedAt||a.createdAt));
 const max=Math.max(1,...counts);
 return <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingBottom:115,gap:19}}>
 <View style={{flexDirection:'row',gap:12,alignItems:'center',marginTop:6}}>
 <View style={{width:128,height:135,justifyContent:'center',alignItems:'center',backgroundColor:C.pale,borderRadius:37}}><Mascot size={120}/></View>
 <Pressable onPress={()=>openChat()} style={{flex:1,backgroundColor:C.pale,borderRadius:20,padding:13,minHeight:116,justifyContent:'center'}}>
 <Txt size={13} color={C.muted}>Good morning,</Txt><Txt size={23} bold>{profile.name||'job hunter'}!</Txt>
 <Txt size={12} color={C.muted}>Your next opportunity is one step closer. Ask Brief anything.</Txt>
 </Pressable></View>
 <Card style={{padding:14}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Txt size={16} bold>Application progress</Txt><Txt size={11} color={C.muted}>Last 4 weeks</Txt></View>
 <View style={{flexDirection:'row',gap:10,alignItems:'flex-end',marginTop:15}}>
 <View style={{width:86}}><Txt size={11} color={C.muted}>Applied</Txt><Txt size={28} bold>{applications.filter(a=>!['saved','interested'].includes(a.status)).length}</Txt><Txt color={C.blue} size={10}>{applications.filter(a=>a.status==='interview').length} interviews</Txt></View>
 <View style={{flex:1,height:94,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around'}}>{counts.map((n,i)=><View key={i} style={{alignItems:'center',gap:5}}><View style={{width:26,height:Math.max(5,73*n/max),borderRadius:6,backgroundColor:i===3?C.blue:'#B4D9FF'}}/><Txt size={10} color={C.muted}>{['W1','W2','W3','W4'][i]}</Txt></View>)}</View>
 </View></Card>
 <View><SectionTitle right="See all" onRight={()=>go('applications')}>Recent applications</SectionTitle>
 {applications.length===0?<Card><Txt color={C.muted}>No applications yet. Tap + to add a job from a screenshot, link, or manually.</Txt></Card>:applications.slice(0,5).map(a=><Pressable key={a.id} onPress={()=>openApp(a)} style={{backgroundColor:C.white,borderRadius:17,padding:13,marginBottom:7,flexDirection:'row',alignItems:'center',gap:10,borderColor:C.line,borderWidth:1}}>
 <View style={{width:35,height:35,borderRadius:10,backgroundColor:C.pale2,alignItems:'center',justifyContent:'center'}}><Icon name="business-outline" color={C.blue}/></View>
 <View style={{flex:1}}><Txt bold size={13}>{a.company}</Txt><Txt size={11} color={C.muted} style={{flexShrink:1}}>{a.title}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={16}/>
 </Pressable>)}</View>
 </ScrollView>;
}
