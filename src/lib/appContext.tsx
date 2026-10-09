import React,{createContext,useContext,useEffect,useState} from 'react';
export type AddJobIntent='library'|'camera'|'manual'|'link';
import { Alert,BackHandler } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DB from './db';
import type { Application,Event,Profile,RemoteJob,Page,Tab } from '../types';
import type { MockMode } from './agent/types';
export type MockSetup={mode:MockMode,question?:string,topic?:string,voice?:boolean};
import { formatPay,type Pay } from './currency';
import type { TimeFormat } from './time';
import { cachedRates,refreshRates,STALE_MS,type CachedRates } from './rates';
import { formatTime } from './time';
import { record, timer } from './perf';
const APP_START=Date.now();
import { trackStatus } from './tracker';
import { cancelReminder,syncReminder,type ReminderResult } from './reminders';
export type Toast={id:number,message:string,action?:{label:string,onPress:()=>void}};
type AppState={
 page:Page;tab:Tab;go:(p:Page)=>void;goTab:(t:Tab)=>void;back:()=>void;returnTo:Page|null;
 applications:Application[];events:Event[];profile:Profile;updateProfile:(p:Profile)=>Promise<void>;
 putApp:(a:Application)=>Promise<Application>;removeApp:(id:string,navigate?:boolean)=>Promise<void>;
 putEvent:(e:Event)=>Promise<ReminderResult>;removeEvent:(id:string)=>Promise<void>;
 selectedApp:Application|null;openApp:(a:Application)=>void;selectedJob:RemoteJob|null;openJob:(j:RemoteJob)=>void;
 chatJob:Application|null;openChat:(job?:Application|null)=>void;
 mockJob:Application|null;mockSetup:MockSetup;openMock:(job:Application|null,setup?:MockSetup)=>void;
 quick:boolean;toggleQuick:()=>void;profileMenu:boolean;toggleProfileMenu:()=>void;
 currency:string;setCurrency:(c:string)=>Promise<void>;timeFormat:TimeFormat;setTimeFormat:(format:TimeFormat)=>Promise<void>;fx:CachedRates|null;fxError:string;refreshFx:()=>Promise<void>;money:(x:{pay?:Pay,salary:string})=>string;
 toast:Toast|null;showToast:(message:string,action?:Toast['action'])=>void;
 ready:boolean;storageError:string;retryStorage:()=>void;finishOnboarding:(next?:Page)=>Promise<void>;replayOnboarding:()=>Promise<void>;
 addJobIntent:AddJobIntent|null;openAddJob:(intent:AddJobIntent)=>void;closeAddJob:()=>void;
};
const Context=createContext<AppState|null>(null);
export function useBrief(){const c=useContext(Context);if(!c)throw new Error('BriefProvider missing');return c;}
const emptyProfile:Profile={name:'',skills:'',education:'',experience:'',goals:'',resumeUri:'',resumeText:'',useResumeForAI:false};
export function BriefProvider({children}:{children:React.ReactNode}) {
 const [ready,setReady]=useState(false),[page,setPage]=useState<Page>('home'),[tab,setTab]=useState<Tab>('home');
 const [applications,setApplications]=useState<Application[]>([]),[events,setEvents]=useState<Event[]>([]),[profile,setProfile]=useState(emptyProfile);
 const [selectedApp,setSelectedApp]=useState<Application|null>(null),[selectedJob,setSelectedJob]=useState<RemoteJob|null>(null),[chatJob,setChatJob]=useState<Application|null>(null),[mockJob,setMockJob]=useState<Application|null>(null),[mockSetup,setMockSetup]=useState<MockSetup>({mode:'job'});
 // Where Back returns when Ask Brief or Practice was opened from a job (null = the current tab's root).
 const [returnTo,setReturnTo]=useState<Page|null>(null);
 const [quick,setQuick]=useState(false),[profileMenu,setProfileMenu]=useState(false),[addJobIntent,setAddJobIntent]=useState<AddJobIntent|null>(null);
 // Open SQLite and load everything. On failure the app shows a recoverable error screen instead of running on a broken database.
 const [storageError,setStorageError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0);
 // Salary display currency. Rates are cached in SQLite (works offline) and refreshed in the background when stale.
 const [currency,setCurrencyState]=useState('PHP'),[fx,setFx]=useState<CachedRates|null>(null),[fxError,setFxError]=useState('');
 const [timeFormat,setTimeFormatState]=useState<TimeFormat>('12h');
 const refreshFx=async()=>{try{setFx(await refreshRates());setFxError('');}catch(e){setFxError((e as Error).message);}};
 const setCurrency=async(c:string)=>{setCurrencyState(c);await DB.setPref('currency',c);if(c!=='original'&&!fx)void refreshFx();};
 const setTimeFormat=async(format:TimeFormat)=>{setTimeFormatState(format);await DB.setPref('timeFormat',format);};
 const money=(x:{pay?:Pay,salary:string})=>x.pay?formatPay(x.pay,currency,fx?.rates??null).text:x.salary;
 const [toast,setToast]=useState<Toast|null>(null);
 const showToast=(message:string,action?:Toast['action'])=>{const id=Date.now();setToast({id,message,action});setTimeout(()=>setToast(t=>t?.id===id?null:t),2800);};
 useEffect(()=>{(async()=>{setStorageError('');const loaded=timer('db.load');try{await DB.initializeDb();const [a,e,p,d,cur,tf,cached]=await Promise.all([DB.listApplications(),DB.listEvents(),DB.getProfile(),DB.getPref('onboarded'),DB.getPref('currency'),DB.getPref('timeFormat'),cachedRates()]);setApplications(a);setEvents(e);setProfile(p);setPage(d?'home':'onboarding');
  const c=cur||'PHP';setCurrencyState(c);setTimeFormatState(tf==='24h'?'24h':'12h');setFx(cached);
  if(c!=='original'&&(!cached||Date.now()-new Date(cached.fetchedAt).getTime()>STALE_MS))void refreshFx();
  loaded();record('startup.ready',Date.now()-APP_START); // no AI, speech or network work is awaited before this
 }catch(e){setStorageError((e as Error)?.message||String(e));}finally{setReady(true);}})();},[loadAttempt]);
 const retryStorage=()=>{setReady(false);setLoadAttempt(n=>n+1);};
 const go=(p:Page)=>{setQuick(false);setProfileMenu(false);setReturnTo(null);setPage(p);};
 const goTab=(t:Tab)=>{setTab(t);go(t);};
 const back=()=>go(returnTo||tab);
 // Haptics only for meaningful commits: success when a job is added, a tick when its status changes, nothing for edits like notes.
 // Every status move passes through here, so it lands in the job's activity whichever screen made it.
 const putApp=async(next:Application)=>{const prev=applications.find(x=>x.id===next.id);const a=trackStatus(prev,next);await DB.saveApplication(a);if(!prev)void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);else if(prev.status!==a.status)void Haptics.selectionAsync();setApplications(old=>[a,...old.filter(x=>x.id!==a.id)]);setSelectedApp(a);return a;};
 // A job's events (and their reminders) go with it, so Calendar never shows orphans.
 const removeApp=async(id:string,navigate=true)=>{const linked=events.filter(e=>e.applicationId===id);for(const e of linked)await cancelReminder(e.notificationId);await DB.deleteApplicationWithEvents(id,linked.map(e=>e.id));setEvents(old=>old.filter(e=>e.applicationId!==id));setApplications(old=>old.filter(x=>x.id!==id));if(navigate)go('applications');};
 /** Saves the event and (re)schedules its local reminder. A reminder that couldn't be set isn't kept, so nothing claims one. */
 const putEvent=async(e:Event)=>{const prev=events.find(x=>x.id===e.id);let r:{notificationId?:string,result:ReminderResult};
  try{r=await syncReminder(e,prev?.notificationId,formatTime(e.date,timeFormat));}catch{r={result:'failed'};}
  const saved:Event={...e,reminderMinutes:r.result==='set'?e.reminderMinutes:null,notificationId:r.notificationId};
  await DB.saveEvent(saved);setEvents(old=>[saved,...old.filter(x=>x.id!==saved.id)]);return r.result;};
 const removeEvent=async(id:string)=>{await cancelReminder(events.find(x=>x.id===id)?.notificationId);await DB.deleteEvent(id);setEvents(old=>old.filter(x=>x.id!==id));};
 const updateProfile=async(p:Profile)=>{await DB.saveProfile(p);setProfile(p);};
 const openApp=(a:Application)=>{const fromChat=page==='chat';setSelectedApp(a);go('application-detail');if(fromChat)setReturnTo('chat');};
 const openJob=(j:RemoteJob)=>{setSelectedJob(j);go('job-detail');};
 const from=page==='application-detail'?page:null; // go() clears returnTo, so set it after
 const openChat=(j?:Application|null)=>{setChatJob(j||null);go('chat');setReturnTo(j?from:null);};
 const openMock=(j:Application|null,setup:MockSetup={mode:'job'})=>{setMockJob(j);setMockSetup(setup);setTab('mock');go('mock');setReturnTo(j?from:null);};
 // Android back: close overlays, then pop to the tab root, then to Home, then let the OS exit.
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
  if(quick||profileMenu){setQuick(false);setProfileMenu(false);return true;}
  if(page==='onboarding')return false;
  if(returnTo||page!==tab){back();return true;}
  if(page!=='home'){setTab('home');go('home');return true;}
  return false;});return ()=>sub.remove();},[page,tab,quick,profileMenu,returnTo]);
 const finishOnboarding=async(next:Page='home')=>{await DB.setPref('onboarded','yes');setTab('home');go(next);};
 const replayOnboarding=async()=>{await DB.setPref('onboarded','');go('onboarding');};
 const openAddJob=(intent:AddJobIntent)=>{setQuick(false);setProfileMenu(false);setAddJobIntent(intent);};
 const closeAddJob=()=>setAddJobIntent(null);
 const value:AppState={page,tab,go,goTab,back,returnTo,applications,events,profile,updateProfile,putApp,removeApp,putEvent,removeEvent,selectedApp,openApp,selectedJob,openJob,chatJob,openChat,mockJob,mockSetup,openMock,quick,toggleQuick:()=>{setProfileMenu(false);setQuick(v=>!v)},profileMenu,toggleProfileMenu:()=>{setQuick(false);setProfileMenu(v=>!v)},currency,setCurrency,timeFormat,setTimeFormat,fx,fxError,refreshFx,money,toast,showToast,ready,storageError,retryStorage,finishOnboarding,replayOnboarding,addJobIntent,openAddJob,closeAddJob};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
