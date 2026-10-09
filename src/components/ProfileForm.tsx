import React,{useEffect,useState} from 'react';
import {C} from '../theme/tokens';
import {Field,Txt} from './Ui';
import {FormSheet} from './FormSheet';
import type {Profile} from '../types';

type Details=Pick<Profile,'name'|'goals'|'experience'|'education'|'skills'>;

/** Manual resume details in the shared form sheet. Dismissing discards; Save writes the fields back through onSave. */
export function ProfileForm({visible,profile,onClose,onSave}:{visible:boolean,profile:Profile,onClose:()=>void,onSave:(d:Details)=>void}){
 const [d,setD]=useState<Details>(profile);
 useEffect(()=>{if(visible)setD({name:profile.name,goals:profile.goals,experience:profile.experience,education:profile.education,skills:profile.skills});},[visible]);
 const set=(k:keyof Details)=>(v:string)=>setD(old=>({...old,[k]:v}));
 return <FormSheet visible={visible} title="Your details" onClose={onClose} doneLabel="Save" onDone={()=>onSave({...d,name:d.name.trim()})}>
  <Txt color={C.muted} size={13} style={{marginBottom:14}}>Everything here stays on this phone. Fill in what you like; you can change it later in Resume.</Txt>
  <Field label="Your name" value={d.name} onChangeText={set('name')} placeholder="First name"/>
  <Field label="Target role or goal" value={d.goals} onChangeText={set('goals')} placeholder="e.g. Customer support, remote"/>
  <Field label="Experience" value={d.experience} onChangeText={set('experience')} placeholder={'One per line, e.g.\n2 years call-centre agent at …'} multiline/>
  <Field label="Education" value={d.education} onChangeText={set('education')} placeholder="e.g. BS Information Technology" multiline/>
  <Field label="Skills" value={d.skills} onChangeText={set('skills')} placeholder="Comma separated, e.g. Excel, English, Customer service" multiline/>
 </FormSheet>;
}
