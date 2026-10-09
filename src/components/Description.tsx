import React,{useMemo,useState} from 'react';
import {Text,View} from 'react-native';
import {C} from '../theme/tokens';
import {Icon,Tap,Txt} from './Ui';
import {splitBold,textToBlocks,type Block} from '../lib/format';

const BODY='#3A4A6C'; // between ink and muted: comfortable for long reading
const body={fontSize:15,lineHeight:22,color:BODY};
function Inline({text}:{text:string}){return <Text selectable style={body}>{splitBold(text).map((r,i)=>r.bold?<Text key={i} style={{fontWeight:'700',color:C.ink}}>{r.text}</Text>:r.text)}</Text>;}

function BlockView({b,first,afterBullet,clamp}:{b:Block,first:boolean,afterBullet:boolean,clamp?:number}){
 if(b.type==='heading')return <Text accessibilityRole="header" style={{fontSize:16,lineHeight:21,fontWeight:'700',color:C.ink,letterSpacing:-0.2,marginTop:first?0:18}}>{b.text}</Text>;
 if(b.type==='bullet')return <View style={{flexDirection:'row',marginTop:first?0:afterBullet?5:8}}>
  <Text style={[body,{width:b.marker==='•'?16:24,color:b.marker==='•'?C.blue:BODY}]}>{b.marker}</Text>
  <View style={{flex:1}}><Inline text={b.text}/></View></View>;
 return <View style={{marginTop:first?0:10}}>{clamp?<Text selectable numberOfLines={clamp} style={body}>{b.text.replace(/\*\*/g,'')}</Text>:<Inline text={b.text}/>}</View>;
}

/** Formatted job description with a block-aware "Show more" (never cuts mid-bullet). */
export function Description({text,empty,budget=520}:{text:string,empty:string,budget?:number}){
 const [open,setOpen]=useState(false);
 const blocks=useMemo(()=>textToBlocks(text),[text]);
 if(!blocks.length)return <Txt color={C.muted}>{empty}</Txt>;
 let shown=blocks,clampFirst=false;
 if(!open){
  let n=0,i=0;for(;i<blocks.length;i++){n+=blocks[i].text.length;if(n>budget&&i>0)break;}
  shown=blocks.slice(0,Math.max(1,i));
  while(shown.length>1&&shown[shown.length-1].type==='heading')shown=shown.slice(0,-1); // no dangling heading
  clampFirst=shown.length===1&&blocks[0].type==='paragraph'&&blocks[0].text.length>budget;
 }
 const more=!open&&(shown.length<blocks.length||clampFirst);
 return <View>
 {shown.map((b,i)=><BlockView key={i} b={b} first={i===0} afterBullet={i>0&&shown[i-1].type==='bullet'} clamp={clampFirst&&i===0?7:undefined}/>)}
 {(more||open&&blocks.length>1)&&<Tap accessibilityRole="button" hitSlop={10} onPress={()=>setOpen(!open)} style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:12,minHeight:32,alignSelf:'flex-start'}}><Txt color={C.blue} size={14} bold>{open?'Show less':'Show more'}</Txt><Icon name={open?'chevron-up':'chevron-down'} size={15} color={C.blue}/></Tap>}
 </View>;
}
