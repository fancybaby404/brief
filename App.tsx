import React from 'react';
import {ActivityIndicator,StatusBar,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
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
function Shell(){const {page,ready}=useBrief();
 const hasTopHeader=!['onboarding'].includes(page);
 const plainHeader=['job-detail','application-detail','resume','notifications','settings','add-job'].includes(page);
 const screens={home:<HomeScreen/>,applications:<ApplicationsScreen/>,jobs:<JobsScreen/>, 'job-detail':<JobDetailScreen/>, 'application-detail':<ApplicationDetailScreen/>,calendar:<CalendarScreen/>,mock:<MockScreen/>,chat:<ChatScreen/>,resume:<ResumeScreen/>,notifications:<NotificationsScreen/>,settings:<SettingsScreen/>,'add-job':<AddJobScreen/>,onboarding:<OnboardingScreen/>};
 return <SafeAreaView style={{flex:1,backgroundColor:C.background}} edges={['top','left','right']}>
 <StatusBar barStyle="dark-content" backgroundColor={C.background}/>
 {!ready?<View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" color={C.blue}/></View>:<>
 {hasTopHeader&&<Header plain={plainHeader}/>}
 <View style={{flex:1}}>{screens[page]}</View>
 {page!=='onboarding'&&<FloatingNav/>}
 <Overlays/>
 </>}
 </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><BriefProvider><Shell/></BriefProvider></SafeAreaProvider>}
