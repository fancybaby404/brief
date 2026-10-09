import React,{useRef} from 'react';
import {ActivityIndicator,StatusBar,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {useFonts} from 'expo-font';
import {Fredoka_700Bold} from '@expo-google-fonts/fredoka/700Bold';
import {BriefProvider,useBrief} from './src/lib/appContext';
import {C} from './src/theme/tokens';
import {Header,FloatingNav,Overlays} from './src/components/Chrome';
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
function Shell(){const {page,ready,storageError,retryStorage}=useBrief();
 // Brand font loads with the database; if it fails the wordmark falls back to the system font.
 const [fontsLoaded,fontError]=useFonts({Fredoka_700Bold});
 // Explore stays mounted once visited so search, filters, results and scroll survive job detail and tab switches.
 const jobsVisited=useRef(false);if(page==='jobs')jobsVisited.current=true;
 const hasTopHeader=!['onboarding'].includes(page);
 const plainHeader=['job-detail','application-detail','resume','notifications','settings','add-job'].includes(page);
 const screens={home:<HomeScreen/>,applications:<ApplicationsScreen/>,jobs:null, 'job-detail':<JobDetailScreen/>, 'application-detail':<ApplicationDetailScreen/>,calendar:<CalendarScreen/>,mock:<MockScreen/>,chat:<ChatScreen/>,resume:<ResumeScreen/>,notifications:<NotificationsScreen/>,settings:<SettingsScreen/>,'add-job':<AddJobScreen/>,onboarding:<OnboardingScreen/>};
 return <SafeAreaView style={{flex:1,backgroundColor:C.background}} edges={['top','left','right']}>
 <StatusBar barStyle="dark-content" backgroundColor={C.background}/>
 {!ready||!(fontsLoaded||fontError)?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" color={C.blue}/></View>
 :storageError?<View style={{flex:1,justifyContent:'center',padding:20}}><EmptyState mood="error" title="Brief couldn’t open your data" body={`Your jobs are stored only on this phone and nothing has been deleted. Close other apps to free space, then try again. (${storageError})`} action={{label:'Try again',icon:'refresh',onPress:retryStorage}}/></View>:<>
 {hasTopHeader&&<Header plain={plainHeader}/>}
 {jobsVisited.current&&<View style={{flex:1,display:page==='jobs'?'flex':'none'}}><JobsScreen/></View>}
 {page!=='jobs'&&<View style={{flex:1}}>{screens[page]}</View>}
 {page!=='onboarding'&&<FloatingNav/>}
 <Overlays/>
 </>}
 </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><BriefProvider><Shell/></BriefProvider></SafeAreaProvider>}
