import React,{useMemo,useState} from 'react';
import {ScrollView,TextInput,View} from 'react-native';
import {useBrief} from '../lib/appContext';
import {CompanyLogo,Heading,Icon,StatusPill,Tap,Txt} from '../components/Ui';import {C} from '../theme/tokens';
import {filterSortApplications,type SortKey} from '../lib/tracker';
export function ApplicationsScreen(){const {applications,openApp}=useBrief();const [q,setQ]=useState('');const [sort,setSort]=useState<SortKey>('newest');
 const filtered=useMemo(()=>filterSortApplications(applications,q,sort),[applications,q,sort]);
 function nextSort(){setSort(v=>({newest:'oldest',oldest:'company',company:'status',status:'newest'} as const)[v]);}
 return <ScrollView contentContainerStyle={{padding:18,paddingBottom:120,gap:13}}><Heading>Applications</Heading>
 <View style={{flexDirection:'row',gap:8}}><View style={{backgroundColor:C.pale2,borderRadius:25,flex:1,flexDirection:'row',alignItems:'center',paddingHorizontal:12}}><Icon name="search" size={18} color={C.muted}/><TextInput accessibilityLabel="Search applications" style={{padding:11,flex:1,color:C.ink}} placeholder="Search applications..." placeholderTextColor={C.soft} value={q} onChangeText={setQ}/></View><Tap onPress={nextSort} accessibilityRole="button" accessibilityLabel={`Sort by ${sort}. Tap to change`} style={{paddingHorizontal:13,backgroundColor:C.white,borderRadius:23,borderWidth:1,borderColor:C.line,justifyContent:'center',flexDirection:'row',gap:6,alignItems:'center'}}><Icon name="options-outline" size={17} color={C.blue}/><Txt size={12} color={C.blue}>Sort: {sort}</Txt></Tap></View>
 {filtered.length?filtered.map(a=><Tap key={a.id} accessibilityRole="button" onPress={()=>openApp(a)} style={{backgroundColor:C.white,borderRadius:17,padding:13,flexDirection:'row',alignItems:'center',gap:11,borderColor:C.line,borderWidth:1}}><CompanyLogo uri={a.logoUrl} size={42}/><View style={{flex:1}}><Txt bold>{a.company}</Txt><Txt color={C.muted} size={12}>{a.title}</Txt><Txt color={C.soft} size={10}>{a.createdAt.slice(0,10)}</Txt></View><StatusPill status={a.status}/><Icon name="chevron-forward" color={C.soft} size={14}/></Tap>):<Txt color={C.muted}>{applications.length?`No applications match “${q}”.`:'No applications yet. Tap + to add one.'}</Txt>}
 </ScrollView>;
}
