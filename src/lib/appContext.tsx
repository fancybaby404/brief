import React,{createContext,useContext,useEffect,useState} from 'react';
import { Alert } from 'react-native';
import * as DB from './db';
import type { Application,Event,Profile,RemoteJob,Page,Tab } from '../types';
type AppState={
 page:Page;tab:Tab;go:(p:Page)=>void;goTab:(t:Tab)=>void;back:()=>void;
 applications:Application[];events:Event[];profile:Profile;updateProfile:(p:Profile)=>Promise<void>;
 putApp:(a:Application)=>Promise<void>;removeApp:(id:string)=>Promise<void>;
 putEvent:(e:Event)=>Promise<void>;removeEvent:(id:string)=>Promise<void>;
 selectedApp:Application|null;openApp:(a:Application)=>void;selectedJob:RemoteJob|null;openJob:(j:RemoteJob)=>void;
 chatJob:Application|null;openChat:(job?:Application|null)=>void;
 quick:boolean;toggleQuick:()=>void;profileMenu:boolean;toggleProfileMenu:()=>void;
 ready:boolean;finishOnboarding:()=>Promise<void>;
};
const Context=createContext<AppState|null>(null);
export function useBrief(){const c=useContext(Context);if(!c)throw new Error('BriefProvider missing');return c;}
const emptyProfile:Profile={name:'',skills:'',education:'',experience:'',goals:'',resumeUri:'',resumeText:''};
export function BriefProvider({children}:{children:React.ReactNode}) {
 const [ready,setReady]=useState(false),[page,setPage]=useState<Page>('home'),[tab,setTab]=useState<Tab>('home');
 const [applications,setApplications]=useState<Application[]>([]),[events,setEvents]=useState<Event[]>([]),[profile,setProfile]=useState(emptyProfile);
 const [selectedApp,setSelectedApp]=useState<Application|null>(null),[selectedJob,setSelectedJob]=useState<RemoteJob|null>(null),[chatJob,setChatJob]=useState<Application|null>(null);
 const [quick,setQuick]=useState(false),[profileMenu,setProfileMenu]=useState(false);
 useEffect(()=>{(async()=>{try{await DB.initializeDb();const [a,e,p,d]=await Promise.all([DB.listApplications(),DB.listEvents(),DB.getProfile(),DB.getPref('onboarded')]);setApplications(a);setEvents(e);setProfile(p);setPage(d?'home':'onboarding');}catch(e){Alert.alert('Storage error',String(e));}finally{setReady(true);}})();},[]);
 const go=(p:Page)=>{setQuick(false);setProfileMenu(false);setPage(p);};
 const goTab=(t:Tab)=>{setTab(t);go(t);};
 const back=()=>go(tab);
 const putApp=async(a:Application)=>{await DB.saveApplication(a);setApplications(old=>[a,...old.filter(x=>x.id!==a.id)]);setSelectedApp(a);};
 const removeApp=async(id:string)=>{await DB.deleteApplication(id);setApplications(old=>old.filter(x=>x.id!==id));go('applications');};
 const putEvent=async(e:Event)=>{await DB.saveEvent(e);setEvents(old=>[e,...old.filter(x=>x.id!==e.id)]);};
 const removeEvent=async(id:string)=>{await DB.deleteEvent(id);setEvents(old=>old.filter(x=>x.id!==id));};
 const updateProfile=async(p:Profile)=>{await DB.saveProfile(p);setProfile(p);};
 const openApp=(a:Application)=>{setSelectedApp(a);go('application-detail');};
 const openJob=(j:RemoteJob)=>{setSelectedJob(j);go('job-detail');};
 const openChat=(j?:Application|null)=>{setChatJob(j||null);go('chat');};
 const finishOnboarding=async()=>{await DB.setPref('onboarded','yes');go('home');};
 const value:AppState={page,tab,go,goTab,back,applications,events,profile,updateProfile,putApp,removeApp,putEvent,removeEvent,selectedApp,openApp,selectedJob,openJob,chatJob,openChat,quick,toggleQuick:()=>{setProfileMenu(false);setQuick(v=>!v)},profileMenu,toggleProfileMenu:()=>{setQuick(false);setProfileMenu(v=>!v)},ready,finishOnboarding};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
