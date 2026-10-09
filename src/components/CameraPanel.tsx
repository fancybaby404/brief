import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Dimensions,Image,Linking,Modal,Pressable,StyleSheet,View} from 'react-native';
import Reanimated,{useAnimatedStyle,useSharedValue,withSpring,withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView,useCameraPermissions,type FlashMode} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {C} from '../theme/tokens';
import {EASE_OUT,EASE_SHEET} from '../theme/motion';
import {pickJobImage} from '../lib/imports';
import {Icon,Primary,Tap,Txt,useReducedMotion} from './Ui';

/** PiP-style camera: viewfinder in a bottom-anchored rounded panel over the dimmed app.
 *  Springs up like the sheets, slides back down before calling onClose; tap outside to dismiss. */
export function CameraPanel({onClose,onUsePhoto,startWithGallery=false}:{onClose:()=>void,onUsePhoto:(uri:string)=>void,startWithGallery?:boolean}){
 const reduce=useReducedMotion();const H=Dimensions.get('window').height;
 const [permission,requestPermission]=useCameraPermissions();
 const [photo,setPhoto]=useState(''),[flash,setFlash]=useState<FlashMode>('off'),[cameraReady,setCameraReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const camera=useRef<CameraView>(null),requested=useRef(false),galleryOpened=useRef(false);
 const y=useSharedValue(reduce?0:H),fade=useSharedValue(reduce?0:1);
 const close=useRef(onClose);close.current=onClose;
 const finish=useCallback(()=>close.current(),[]);
 useEffect(()=>{if(reduce)fade.set(withTiming(1,{duration:180,easing:EASE_OUT}));else y.set(withSpring(0,{duration:300,dampingRatio:1}));},[reduce]);
 const requestClose=useCallback(()=>{
  const done=(f?:boolean)=>{'worklet';if(f)scheduleOnRN(finish);};
  if(reduce)fade.set(withTiming(0,{duration:150,easing:EASE_OUT},done));
  else y.set(withTiming(H,{duration:240,easing:EASE_SHEET},done));
 },[reduce]);
 const backdrop=useAnimatedStyle(()=>({opacity:fade.get()}));
 const panelStyle=useAnimatedStyle(()=>({opacity:fade.get(),transform:[{translateY:y.get()}]}));
 async function chooseGallery(){try{const uri=await pickJobImage();if(uri){setError('');setPhoto(uri);}else if(startWithGallery)requestClose();}catch(e){setError((e as Error).message||'The photo library could not be opened.');}}
 useEffect(()=>{if(startWithGallery&&!galleryOpened.current){galleryOpened.current=true;void chooseGallery();}else if(!startWithGallery&&permission&&!permission.granted&&permission.canAskAgain&&!requested.current){requested.current=true;void requestPermission();}},[permission?.granted,startWithGallery]);
 async function capture(){if(!camera.current||!cameraReady||busy)return;setBusy(true);setError('');try{const result=await camera.current.takePictureAsync({quality:0.92});if(!result?.uri)throw new Error('No image was returned. Try again.');setPhoto(result.uri);void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);}catch(e){setError((e as Error).message||'The photo could not be captured.');}finally{setBusy(false);}}
 function retake(){setPhoto('');setError('');setCameraReady(false);}
 const button={width:46,height:46,borderRadius:23,backgroundColor:'rgba(8,17,32,0.48)',alignItems:'center',justifyContent:'center'} as const;
 return <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={requestClose}>
  <View style={{flex:1}}>
   <Reanimated.View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(9,25,45,0.3)'},backdrop]}><Pressable accessibilityRole="button" accessibilityLabel="Close camera" style={{flex:1}} onPress={requestClose}/></Reanimated.View>
   <Reanimated.View accessibilityViewIsModal style={[{position:'absolute',left:0,right:0,bottom:0,height:H*0.78,backgroundColor:'#07111F',borderTopLeftRadius:28,borderTopRightRadius:28,overflow:'hidden'},panelStyle]}>
    {photo?<Image source={{uri:photo}} resizeMode="contain" style={StyleSheet.absoluteFill} onError={()=>{setError('This photo could not be opened. Choose another image.');setPhoto('');}}/>:permission?.granted?<CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" flash={flash} autofocus="on" onCameraReady={()=>setCameraReady(true)} onMountError={event=>setError(event.message||'Camera could not start.')}/>:null}
    {photo?<>
     <View style={{position:'absolute',top:14,left:18}}><Tap accessibilityRole="button" accessibilityLabel="Close photo preview" onPress={requestClose} style={button}><Icon name="close" color={C.white}/></Tap></View>
     <SafeAreaView edges={['bottom']} style={{position:'absolute',bottom:0,left:0,right:0,padding:22,flexDirection:'row',gap:12}}><View style={{flex:1}}><Primary large secondary label="Retake" onPress={retake}/></View><View style={{flex:1}}><Primary large label="Use Photo" onPress={()=>onUsePhoto(photo)}/></View></SafeAreaView>
    </>:permission?.granted?<>
     <View style={{position:'absolute',top:14,left:0,right:0,paddingHorizontal:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
      <Tap accessibilityRole="button" accessibilityLabel="Close camera" onPress={requestClose} style={button}><Icon name="close" color={C.white}/></Tap>
      <Tap accessibilityRole="button" accessibilityLabel={flash==='off'?'Turn flash on':'Turn flash off'} accessibilityState={{selected:flash==='on'}} onPress={()=>setFlash(value=>value==='off'?'on':'off')} style={[button,{backgroundColor:flash==='on'?'rgba(22,119,242,0.88)':button.backgroundColor}]}><Icon name={flash==='on'?'flash':'flash-outline'} color={C.white}/></Tap>
     </View>
     <SafeAreaView edges={['bottom']} style={{position:'absolute',bottom:0,left:0,right:0,paddingHorizontal:24,paddingTop:32,paddingBottom:12,backgroundColor:'rgba(4,11,21,0.24)'}}>
      {!!error&&<View accessibilityRole="alert"><Txt color={C.white} size={13} style={{textAlign:'center',marginBottom:12}}>{error}</Txt></View>}
      <View style={{height:82,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
       <Tap accessibilityRole="button" accessibilityLabel="Choose an existing photo" onPress={()=>void chooseGallery()} style={{width:54,height:54,borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,0.6)',alignItems:'center',justifyContent:'center'}}><Icon name="images-outline" size={24} color={C.white}/></Tap>
       <Tap accessibilityRole="button" accessibilityLabel="Take photo" disabled={!cameraReady||busy} onPress={()=>void capture()} style={{width:76,height:76,borderRadius:38,borderWidth:4,borderColor:C.white,alignItems:'center',justifyContent:'center',opacity:cameraReady?1:0.55}}><View style={{width:60,height:60,borderRadius:30,backgroundColor:C.white,alignItems:'center',justifyContent:'center'}}>{busy&&<ActivityIndicator color={C.blue}/>}</View></Tap>
       <View style={{width:54,height:54}}/>
      </View>
     </SafeAreaView>
    </>:permission===null?<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12,padding:22}}><ActivityIndicator color={C.white}/><Txt color={C.white}>Checking camera access…</Txt></View>:<SafeAreaView edges={['bottom']} style={{flex:1,justifyContent:'space-between',padding:22,paddingTop:14}}>
     <Tap accessibilityRole="button" accessibilityLabel="Close camera" onPress={requestClose} style={[button,{alignSelf:'flex-start'}]}><Icon name="close" color={C.white}/></Tap>
     <View style={{alignItems:'center',gap:12,paddingHorizontal:10}}>
      <Icon name="camera-outline" size={38} color={C.white}/><Txt size={21} bold color={C.white}>Camera access needed</Txt>
      <Txt size={14} color="#D8E2F0" style={{textAlign:'center'}}>Allow Brief to photograph a job listing. You can also choose an existing photo.</Txt>
      {!!error&&<View accessibilityRole="alert"><Txt size={13} color="#FFD6DC" style={{textAlign:'center'}}>{error}</Txt></View>}
      <View style={{width:'100%',gap:9}}><Primary label={permission?.canAskAgain?'Allow camera':'Open Settings'} onPress={()=>{if(permission?.canAskAgain){requested.current=true;void requestPermission().then(result=>{if(!result.granted)setError('Camera access is off. Allow it in Settings or choose a photo.');});}else void Linking.openSettings();}}/><Primary secondary label="Choose a photo" onPress={()=>void chooseGallery()}/></View>
     </View>
     <View style={{height:44}}/>
    </SafeAreaView>}
   </Reanimated.View>
  </View>
 </Modal>;
}
