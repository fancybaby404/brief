import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
export async function pickJobImage(camera=false):Promise<string|null> {
  if(camera){const perm=await ImagePicker.requestCameraPermissionsAsync();if(!perm.granted)throw new Error('Camera permission is needed to photograph a job post.');}
  const res=camera?await ImagePicker.launchCameraAsync({quality:0.85}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.85});
  return res.canceled?null:res.assets[0]?.uri||null;
}
export async function recognizeJobImage(uri:string):Promise<string> {
  const {recognizeText}=await import('expo-ocr-kit');
  const res=await recognizeText(uri);
  if(!res.text.trim())throw new Error('No text detected. Try a clearer photo or enter the job manually.');
  return res.text;
}
export async function pickResume():Promise<string|null> {
  const res=await DocumentPicker.getDocumentAsync({type:['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],copyToCacheDirectory:true});
  if(res.canceled || !res.assets?.length)return null;
  const src=res.assets[0].uri;const ext=res.assets[0].name?.toLowerCase().endsWith('.docx')?'docx':'pdf';
  if(!FileSystem.documentDirectory) throw new Error('Private document storage is unavailable');
  const dest=FileSystem.documentDirectory+'resume.'+ext;
  await FileSystem.deleteAsync(dest,{idempotent:true});await FileSystem.moveAsync({from:src,to:dest});return dest;
}
export async function pickModel():Promise<string|null> {
  const res=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});
  if(res.canceled||!res.assets?.length)return null;
  if(!res.assets[0].name.toLowerCase().endsWith('.gguf'))throw new Error('Please select a .gguf model file.');
  if(!FileSystem.documentDirectory) throw new Error('Private document storage is unavailable');
  const dest=FileSystem.documentDirectory+'brief-model.gguf';
  // Move, not copy: the picker already cached a private copy, and models are ~1 GB.
  await FileSystem.deleteAsync(dest,{idempotent:true});await FileSystem.moveAsync({from:res.assets[0].uri,to:dest});return dest;
}

export async function readResumeText(uri:string):Promise<string> {
 if (!uri.toLowerCase().endsWith('.pdf')) return '';
 const { extractText, isAvailable } = await import('expo-pdf-text-extract');
 if(!isAvailable()) throw new Error('Resume extraction requires a native development build.');
 return (await extractText(uri)).slice(0,14000);
}
export async function deleteLocalFile(uri:string) { if(uri) await FileSystem.deleteAsync(uri,{idempotent:true}); }
