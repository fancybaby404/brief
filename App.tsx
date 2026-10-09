import React,{useRef} from 'react';
import {ActivityIndicator,StatusBar,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {useFonts} from 'expo-font';
import {Ionicons} from '@expo/vector-icons';
import {Freeze} from './src/components/Freeze';
import type {Page} from './src/types';
import {Fredoka_700Bold} from '@expo-google-fonts/fredoka/700Bold';
import {BriefProvider,useBrief} from './src/lib/appContext';
import {C} from './src/theme/tokens';
import {Header,FloatingNav,Overlays,ToastHost} from './src/components/Chrome';
import {HomeScreen} from './src/screens/HomeScreen';
import {ApplicationsScreen} from './src/screens/ApplicationsScreen';
import {JobsScreen,JobDetailScreen} from './src/screens/JobsScreen';
import {ApplicationDetailScreen} from './src/screens/ApplicationDetailScreen';
import {CalendarScreen} from './src/screens/CalendarScreen';
import {MockScreen} from './src/screens/MockScreen';
import {ChatScreen} from './src/screens/ChatScreen';
import {ResumeScreen,SettingsScreen,NotificationsScreen} from './src/screens/AccountScreens';
import {AddJobScreen} from './src/screens/AddJobScreen';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {EmptyState} from './src/components/States';
const KEEP_ALIVE:Page[]=['home','jobs','calendar','applications','chat'];
function Shell(){const {page,ready,storageError,retryStorage,addJobIntent,closeAddJob,returnTo}=useBrief();
 // Brand font and the icon font load with the database, so icons never render blank on first show.
 // If loading fails the wordmark falls back to the system font and icons load on demand.
 const [fontsLoaded,fontError]=useFonts({Fredoka_700Bold,...Ionicons.font});
 // Screens people return to stay mounted once visited (state, scroll, decoded images survive) and are
 // frozen while hidden, so they don't re-render on every app-state change. Mock is excluded on purpose:
 // unmounting it releases the microphone, Whisper and speech resources.
 const visited=useRef(new Set<Page>());if(KEEP_ALIVE.includes(page))visited.current.add(page);
 // Application detail is a focused workspace: it draws its own bar (back, title on scroll, more) and hides the tab bar.
 const hasTopHeader=!['onboarding','application-detail'].includes(page);
 const hasFloatingNav=!['onboarding','application-detail'].includes(page);
 const plainHeader=['job-detail','resume','notifications','settings'].includes(page)||!!returnTo;
 const screens:Record<Page,React.ReactNode>={home:<HomeScreen/>,applications:<ApplicationsScreen/>,jobs:<JobsScreen/>, 'job-detail':<JobDetailScreen/>, 'application-detail':<ApplicationDetailScreen/>,calendar:<CalendarScreen/>,mock:<MockScreen/>,chat:<ChatScreen/>,resume:<ResumeScreen/>,notifications:<NotificationsScreen/>,settings:<SettingsScreen/>,onboarding:<OnboardingScreen/>};
 // The shell owns the bottom inset once; onboarding positions its own footer within it.
 const safeEdges=page==='onboarding'?['top','left','right'] as const:['top','left','right','bottom'] as const;
 return <SafeAreaView style={{flex:1,backgroundColor:C.background}} edges={safeEdges}>
 <StatusBar barStyle="dark-content" backgroundColor={C.background}/>
 {!ready||!(fontsLoaded||fontError)?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" color={C.blue}/></View>
 :storageError?<View style={{flex:1,justifyContent:'center',padding:20}}><EmptyState mood="error" title="Brief couldn’t open your data" body={`Your jobs are stored only on this phone and nothing has been deleted. Close other apps to free space, then try again. (${storageError})`} action={{label:'Try again',icon:'refresh',onPress:retryStorage}}/></View>:<View style={{flex:1}}>
 {hasTopHeader&&<Header plain={plainHeader}/>}
 {KEEP_ALIVE.filter(p=>visited.current.has(p)).map(p=><View key={p} style={{flex:1,display:page===p?'flex':'none'}}><Freeze frozen={page!==p}>{screens[p]}</Freeze></View>)}
 {!KEEP_ALIVE.includes(page)&&<View key={page} style={{flex:1}}>{screens[page]}</View>}
 {hasFloatingNav&&<FloatingNav/>}
 <ToastHost/>
 <Overlays/>
 {addJobIntent&&<AddJobScreen intent={addJobIntent} onClose={closeAddJob}/>}
 </View>}
 </SafeAreaView>;
}
// Gesture handler and keyboard-controller roots wrap everything once; gestures silently do nothing without them.
export default function App(){return <GestureHandlerRootView style={{flex:1,backgroundColor:C.background}}><KeyboardProvider><SafeAreaProvider><BriefProvider><Shell/></BriefProvider></SafeAreaProvider></KeyboardProvider></GestureHandlerRootView>}
