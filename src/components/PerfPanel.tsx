import React,{useState} from 'react';
import {View} from 'react-native';
import {C} from '../theme/tokens';
import {Card,Tap,Txt} from './Ui';
import {formatValue,resetPerf,summary} from '../lib/perf';

/** Settings → Performance: real timings measured on this phone during this session (median · 90th percentile · count).
 *  Nothing here is estimated, and nothing leaves the device. */
export function PerfPanel(){
 const [open,setOpen]=useState(false),[,setTick]=useState(0);
 const rows=open?summary():[];
 return <Card style={{padding:14,gap:8}}>
  <Tap accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(o=>!o)} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:40}}>
   <View style={{flex:1}}><Txt bold>Performance (this session)</Txt><Txt size={12} color={C.muted}>Measured on this phone. Use it before and after changes.</Txt></View>
   <Txt size={13} bold color={C.blue}>{open?'Hide':'Show'}</Txt>
  </Tap>
  {open&&(rows.length?<>
   {rows.map(r=><View key={r.name} accessible accessibilityLabel={`${r.label}: median ${formatValue(r.median,r.unit)}`} style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:28}}>
    <Txt size={13} style={{flex:1}}>{r.label}</Txt>
    <Txt size={13} bold>{formatValue(r.median,r.unit)}</Txt>
    <Txt size={11} color={C.muted} style={{width:96,textAlign:'right'}}>p90 {formatValue(r.p90,r.unit)} · {r.count}×</Txt>
   </View>)}
   <View style={{flexDirection:'row',gap:16}}>
    <Tap accessibilityRole="button" onPress={()=>setTick(t=>t+1)} style={{minHeight:36,justifyContent:'center'}}><Txt size={13} bold color={C.blue}>Refresh</Txt></Tap>
    <Tap accessibilityRole="button" onPress={()=>{resetPerf();setTick(t=>t+1);}} style={{minHeight:36,justifyContent:'center'}}><Txt size={13} bold color={C.blue}>Clear</Txt></Tap>
   </View>
  </>:<Txt size={13} color={C.muted}>No measurements yet. Use Ask Brief, a mock interview or Jobs, then come back.</Txt>)}
 </Card>;
}
