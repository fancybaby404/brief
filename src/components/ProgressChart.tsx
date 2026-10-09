import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Text,View} from 'react-native';
import {C,SPRING} from '../theme/tokens';
import {Card,PullDownMenu,Txt,useReducedMotion} from './Ui';
import {niceAxis,progressBuckets,RANGES,type ProgressRange} from '../lib/tracker';
import type {Application} from '../types';

const PLOT=132,AXIS=28,GRID='#EDF2FA';
// Native CSS gradient (New Architecture); backgroundColor is the fallback.
const bar={backgroundColor:'#6AAAF8',experimental_backgroundImage:'linear-gradient(180deg, #2A84F6 0%, #A9CDFB 70%, #D6E8FE 100%)'} as const;

/** Applications reported as applied per week/month, from real tracker dates. Bars grow in on range change. */
export function ProgressChart({applications}:{applications:Application[]}) {
 const [range,setRange]=useState<ProgressRange>('4w');
 const buckets=useMemo(()=>progressBuckets(applications,Date.now(),range),[applications,range]);
 const ticks=niceAxis(Math.max(0,...buckets.map(b=>b.count)));const top=ticks[ticks.length-1];
 const total=buckets.reduce((n,b)=>n+b.count,0);
 const reduce=useReducedMotion();const grow=useRef(new Animated.Value(1)).current;
 // Home is opened tens of times a day, so the bars are simply there on mount; they grow only when the user changes the range.
 const firstRun=useRef(true);
 useEffect(()=>{if(firstRun.current||reduce){firstRun.current=false;grow.setValue(1);return;}grow.setValue(0);Animated.spring(grow,{toValue:1,...SPRING.ui,useNativeDriver:true}).start();},[range,reduce]);
 const barW=buckets.length<=4?34:buckets.length<=6?26:18,dense=buckets.length>6;
 const rangeLabel=RANGES.find(r=>r.value===range)!.label;
 return <Card style={{padding:16}}>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}><Txt size={17} bold style={{flexShrink:1}}>Application progress</Txt><PullDownMenu label="Time range" value={range} options={RANGES} onChange={setRange}/></View>
 <View accessible accessibilityLabel={`${rangeLabel}. ${buckets.map(b=>`${b.label}: ${b.count}`).join(', ')}`} style={{marginTop:26}}>
 <View style={{flexDirection:'row',height:PLOT}}>
  <View style={{width:AXIS}}>{ticks.map(v=><Text key={v} style={{position:'absolute',right:8,bottom:v/top*PLOT-7,fontSize:11,lineHeight:14,color:C.muted}}>{v}</Text>)}</View>
  <View style={{flex:1}}>
   {ticks.map(v=><View key={v} style={{position:'absolute',left:0,right:0,bottom:v/top*PLOT,height:1,backgroundColor:GRID}}/>)}
   <View style={{flex:1,flexDirection:'row',alignItems:'flex-end'}}>
   {buckets.map(b=>{const h=b.count?Math.max(6,b.count/top*PLOT):3;
    return <View key={b.label} style={{flex:1,alignItems:'center',justifyContent:'flex-end'}}>
     {b.count>0&&<Animated.Text style={{fontSize:dense?11:13,fontWeight:'700',color:C.ink,marginBottom:4,opacity:grow}}>{b.count}</Animated.Text>}
     <Animated.View style={[{width:barW,height:h,borderTopLeftRadius:Math.min(8,barW/3),borderTopRightRadius:Math.min(8,barW/3),borderBottomLeftRadius:2,borderBottomRightRadius:2,transformOrigin:'bottom',transform:[{scaleY:grow}]},b.count?bar:{backgroundColor:GRID}]}/>
    </View>;})}
   </View>
   {total===0&&<View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:PLOT*0.3,alignItems:'center'}}><Txt size={12} color={C.muted}>No applications in this period</Txt></View>}
  </View>
 </View>
 <View style={{flexDirection:'row',marginLeft:AXIS,marginTop:8}}>{buckets.map((b,i)=><Text key={b.label} numberOfLines={1} style={{flex:1,textAlign:'center',fontSize:11,color:C.muted,opacity:dense&&i%2===1?0:1}}>{b.label}</Text>)}</View>
 </View>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:14}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:6}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:C.blue}}/><Txt size={12} color={C.muted}>Applications</Txt></View>
  <Txt size={12} color={C.muted}>{total} in this period</Txt>
 </View>
 </Card>;
}
