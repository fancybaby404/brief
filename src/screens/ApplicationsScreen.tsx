import React,{useCallback,useDeferredValue,useMemo,useRef,useState} from 'react';
import Reanimated,{LayoutAnimationConfig} from 'react-native-reanimated';
import {LIST_REFLOW,ROW_IN,ROW_OUT} from '../theme/motion';
import {ScrollView,TextInput,View} from 'react-native';
import {useBrief} from '../lib/appContext';
import {CompanyLogo,Heading,Icon,Primary,Sheet,StatusPill,Tap,Txt,useFloatingNavClearance} from '../components/Ui';import {C} from '../theme/tokens';
import {filterSortApplications,STATUS_LABEL,STATUS_ORDER,type SortKey} from '../lib/tracker';
import {EmptyState} from '../components/States';
import type {Application,ApplicationStatus} from '../types';

type Filters={status:ApplicationStatus|'',employmentType:string,remoteOnly:boolean,salaryOnly:boolean};
const DEFAULT_FILTERS:Filters={status:'',employmentType:'',remoteOnly:false,salaryOnly:false};
const STATUSES:{value:Filters['status'],label:string}[]=[{value:'',label:'Any'},...STATUS_ORDER.map(value=>({value,label:STATUS_LABEL[value]}))];
const SORT_OPTIONS:{value:SortKey,label:string}[]=[
 {value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},
 {value:'company',label:'Company A–Z'},{value:'status',label:'Application status'},
];
const QUICK_FILTERS=[{id:'all',label:'All'},{id:'remote',label:'Remote'},{id:'full-time',label:'Full-time'},{id:'internship',label:'Internship'}] as const;
const employmentName=(type:string)=>type.replace(/[-_]/g,' ').replace(/\b\w/g,s=>s.toUpperCase());
const isRemote=(application:Application)=>/\bremote\b/i.test(application.location)||/jobicy\.com/i.test(application.sourceUrl);
const chip=(selected:boolean)=>({minHeight:38,justifyContent:'center' as const,paddingHorizontal:14,borderRadius:19,backgroundColor:selected?C.blue:C.pale2});
function Choice<T extends string>({options,value,onChange,label}:{options:{value:T,label:string}[],value:T,onChange:(value:T)=>void,label:string}){
 return <View style={{gap:9}}><Txt size={13} bold color={C.muted} style={{letterSpacing:0.2}}>{label}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(option=><Tap key={option.value||'any'} accessibilityRole="radio" accessibilityState={{selected:option.value===value}} onPress={()=>onChange(option.value)} style={chip(option.value===value)}><Txt size={14} color={option.value===value?C.white:C.ink}>{option.label}</Txt></Tap>)}</View></View>;
}

const Gap=()=><View style={{height:13}}/>;
/** One saved job row. Memoized: typing in search or changing filters doesn't re-render rows that didn't change. */
const AppRow=React.memo(function AppRow({a,onOpen}:{a:Application,onOpen:(a:Application)=>void}){
 return <Reanimated.View entering={ROW_IN} exiting={ROW_OUT}><Tap accessibilityRole="button" onPress={()=>onOpen(a)} style={{backgroundColor:C.white,borderRadius:17,padding:13,flexDirection:'row',alignItems:'center',gap:11,borderColor:C.line,borderWidth:1}}><CompanyLogo uri={a.logoUrl} size={42}/><View style={{flex:1}}><Txt bold>{a.company}</Txt><Txt color={C.muted} size={12}>{a.title}</Txt><Txt color={C.soft} size={10}>{a.createdAt.slice(0,10)}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={14}/></Tap></Reanimated.View>;
});
export function ApplicationsScreen(){
 const {applications,openApp,go,goTab,openAddJob}=useBrief();
 const bottomClearance=useFloatingNavClearance();
 const [q,setQ]=useState(''),[sort,setSort]=useState<SortKey>('newest'),[draftSort,setDraftSort]=useState<SortKey>('newest');
 const [filters,setFilters]=useState<Filters>(DEFAULT_FILTERS),[draft,setDraft]=useState<Filters>(DEFAULT_FILTERS),[showFilters,setShowFilters]=useState(false);
 const typeOptions=useMemo(()=>{
  const types=[...new Set(applications.map(a=>a.employmentType.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  return [{value:'',label:'Any'},...types.map(type=>({value:type,label:employmentName(type)}))];
 },[applications]);
 // Typing stays responsive with long lists: filtering uses a deferred copy of the query.
 const dq=useDeferredValue(q);
 const openRef=useRef(openApp);openRef.current=openApp;const openRow=useCallback((a:Application)=>openRef.current(a),[]);
 const filtered=useMemo(()=>{
  const matches=applications.filter(a=>
   (!filters.status||a.status===filters.status)&&
   (!filters.employmentType||a.employmentType.toLowerCase().split(/\s*,\s*/).includes(filters.employmentType.toLowerCase()))&&
   (!filters.remoteOnly||isRemote(a))&&
   (!filters.salaryOnly||!!(a.salary.trim()||a.pay))
  );
  return filterSortApplications(matches,dq,sort);
 },[applications,dq,sort,filters]);
 const activeFilterCount=Number(!!filters.status)+Number(!!filters.employmentType)+Number(filters.remoteOnly)+Number(filters.salaryOnly)+Number(sort!=='newest');
 function applyQuick(id:typeof QUICK_FILTERS[number]['id']){
  setFilters(current=>({...current,employmentType:id==='full-time'?'Full-Time':id==='internship'?'Internship':'',remoteOnly:id==='remote'}));
 }
 function selectedQuick(id:typeof QUICK_FILTERS[number]['id']){
  if(id==='all')return !filters.employmentType&&!filters.remoteOnly;
  if(id==='remote')return filters.remoteOnly&&!filters.employmentType;
  if(id==='full-time')return /full[\s-]?time/i.test(filters.employmentType)&&!filters.remoteOnly;
  return /intern(ship)?/i.test(filters.employmentType)&&!filters.remoteOnly;
 }
 function applyFilters(){setFilters(draft);setSort(draftSort);setShowFilters(false);}
 function resetFilters(){setDraft(DEFAULT_FILTERS);setFilters(DEFAULT_FILTERS);setDraftSort('newest');setSort('newest');}
 // Header stays outside the virtualized rows; rows render on demand (hundreds of saved jobs scroll smoothly).
 const header=<View style={{gap:13,paddingBottom:13}}><Heading>Applications</Heading>
 <View style={{flexDirection:'row',gap:8}}>
  <View style={{backgroundColor:C.pale2,borderRadius:25,flex:1,flexDirection:'row',alignItems:'center',paddingHorizontal:12}}><Icon name="search" size={18} color={C.muted}/><TextInput accessibilityLabel="Search applications" style={{padding:11,flex:1,color:C.ink}} placeholder="Search applications..." placeholderTextColor={C.soft} value={q} onChangeText={setQ}/></View>
  <Tap onPress={()=>{setDraft(filters);setDraftSort(sort);setShowFilters(true);}} accessibilityRole="button" accessibilityLabel={activeFilterCount?`Filters and sorting, ${activeFilterCount} active`:'Filters and sorting'} style={{width:46,height:46,borderRadius:23,borderWidth:1,borderColor:activeFilterCount?C.blue:C.line,backgroundColor:activeFilterCount?C.pale:C.white,alignItems:'center',justifyContent:'center'}}><Icon name="options-outline" size={19} color={activeFilterCount?C.blue:C.ink}/>{activeFilterCount>0&&<View style={{position:'absolute',top:3,right:3,minWidth:16,height:16,borderRadius:8,backgroundColor:C.blue,alignItems:'center',justifyContent:'center',paddingHorizontal:4}}><Txt size={10} bold color={C.white} style={{lineHeight:13}}>{activeFilterCount}</Txt></View>}</Tap>
 </View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal:-18}} contentContainerStyle={{gap:8,paddingHorizontal:18}}>{QUICK_FILTERS.map(option=>{const active=selectedQuick(option.id);return <Tap key={option.id} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>applyQuick(option.id)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:15,borderRadius:22,backgroundColor:active?C.blue:C.pale2}}><Txt size={14} bold={active} color={active?C.white:C.ink}>{option.label}</Txt></Tap>;})}</ScrollView>
 </View>;
 const empty=applications.length?<EmptyState compact mood="question" title={`No matching applications${q.trim()?` for “${q.trim()}”`:''}`} body="Try another filter or clear the search." action={activeFilterCount?{label:'Reset filters',onPress:resetFilters}:undefined} secondary={q?{label:'Clear search',onPress:()=>setQ('')}:undefined}/>:<EmptyState title="No applications yet" body="Everything you track lives here: jobs you’re interested in, applied to, or interviewing for." action={{label:'Add a job',onPress:()=>openAddJob('manual')}} secondary={{label:'Explore jobs',onPress:()=>goTab('jobs')}}/>;
 return <LayoutAnimationConfig skipEntering><Reanimated.FlatList data={filtered} keyExtractor={a=>a.id} ListHeaderComponent={header} ListEmptyComponent={empty}
  renderItem={({item})=><AppRow a={item} onOpen={openRow}/>} ItemSeparatorComponent={Gap} itemLayoutAnimation={LIST_REFLOW}
  keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:bottomClearance}} initialNumToRender={12} windowSize={9}/>
 <Sheet scroll visible={showFilters} onClose={()=>setShowFilters(false)} title="Filter applications" footer={<View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Primary secondary label="Reset" onPress={()=>{setDraft(DEFAULT_FILTERS);setDraftSort('newest');}}/></View><View style={{flex:2}}><Primary label="Show applications" onPress={applyFilters}/></View></View>}>
  <View style={{gap:22,paddingBottom:4}}>
   <Choice label="APPLICATION STATUS" options={STATUSES} value={draft.status} onChange={status=>setDraft(f=>({...f,status}))}/>
   <Choice label="JOB TYPE" options={typeOptions} value={draft.employmentType} onChange={employmentType=>setDraft(f=>({...f,employmentType}))}/>
   <Choice label="SORT BY" options={SORT_OPTIONS} value={draftSort} onChange={setDraftSort}/>
   <View style={{flexDirection:'row',gap:8}}>
    <Tap accessibilityRole="checkbox" accessibilityState={{checked:draft.remoteOnly}} onPress={()=>setDraft(f=>({...f,remoteOnly:!f.remoteOnly}))} style={{...chip(draft.remoteOnly),flexDirection:'row',alignItems:'center',gap:6}}><Icon name={draft.remoteOnly?'checkmark-circle':'ellipse-outline'} size={16} color={draft.remoteOnly?C.white:C.ink}/><Txt size={14} color={draft.remoteOnly?C.white:C.ink}>Remote</Txt></Tap>
    <Tap accessibilityRole="checkbox" accessibilityState={{checked:draft.salaryOnly}} onPress={()=>setDraft(f=>({...f,salaryOnly:!f.salaryOnly}))} style={{...chip(draft.salaryOnly),flexDirection:'row',alignItems:'center',gap:6}}><Icon name={draft.salaryOnly?'checkmark-circle':'ellipse-outline'} size={16} color={draft.salaryOnly?C.white:C.ink}/><Txt size={14} color={draft.salaryOnly?C.white:C.ink}>Salary listed</Txt></Tap>
   </View>
  </View>
 </Sheet></LayoutAnimationConfig>;
}
