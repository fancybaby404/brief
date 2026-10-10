import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type {CatalogModel} from './modelCatalog';
import {timer} from './perf';
export async function pickJobImage(camera=false):Promise<string|null> {
  if(camera){const perm=await ImagePicker.requestCameraPermissionsAsync();if(!perm.granted)throw new Error('Camera permission is needed to photograph a job post.');}
  const res=camera?await ImagePicker.launchCameraAsync({quality:0.85}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.85});
  return res.canceled?null:res.assets[0]?.uri||null;
}
/** Image picked from the document/Files picker rather than the photo library. */
export async function pickImageFile():Promise<string|null> {
  const res=await DocumentPicker.getDocumentAsync({type:'image/*',copyToCacheDirectory:true});
  return res.canceled||!res.assets?.length?null:res.assets[0].uri;
}
export async function recognizeJobImage(uri:string):Promise<string> {
  const {recognizeText}=await import('expo-ocr-kit');
  const res=await recognizeText(uri);
  if(!res.text.trim())throw new Error('No text detected. Try a clearer photo or enter the job manually.');
  return res.text;
}
export async function readJobListing(url:string):Promise<{url:string,text:string}> {
  const normalized=/^https?:\/\//i.test(url)?url:`https://${url}`;
  let parsed:URL;
  try{parsed=new URL(normalized);}catch{throw new Error('Enter a valid job listing link.');}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Use a public http or https job link.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(parsed.toString(),{signal:controller.signal,headers:{Accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'}});
    if(!response.ok)throw new Error(response.status===403||response.status===401?'This job site blocks automatic reading. Enter the details manually.':`The listing returned an error (${response.status}).`);
    const contentType=response.headers.get('content-type')||'';
    if(contentType&&!/html|text\/plain/i.test(contentType))throw new Error('This link is not a readable job page. Enter the details manually.');
    const html=(await response.text()).slice(0,600000);
    const decode=(value:string)=>value.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n:string)=>{const cp=Number(n);return cp<=0x10ffff?String.fromCodePoint(cp):'';}).replace(/&#x([\da-f]+);/gi,(_,n:string)=>{const cp=parseInt(n,16);return cp<=0x10ffff?String.fromCodePoint(cp):'';});
    const attr=(tag:string,name:string)=>tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'))?.[1]||'';
    const metadata=[...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag])=>{
      const name=(attr(tag,'name')||attr(tag,'property')).toLowerCase();
      return /^(og:title|og:description|twitter:title|twitter:description|description)$/.test(name)?decode(attr(tag,'content')):'';
    }).filter(Boolean);
    const title=decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g,' ')||'');
    const jsonLd=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
    const body=html.replace(/<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<(style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<\/(p|div|li|h[1-6]|br|tr)\s*>/gi,'\n').replace(/<[^>]+>/g,' ');
    const text=decode([title,...metadata,jsonLd,body].filter(Boolean).join('\n')).replace(/[\t\f\v ]+/g,' ').replace(/\n\s*/g,'\n').trim().slice(0,12000);
    if(text.replace(/\s/g,'').length<80)throw new Error('The page opened but did not expose readable job details. Try another link or enter the details manually.');
    return {url:response.url||parsed.toString(),text};
  }catch(error){
    if((error as Error)?.name==='AbortError')throw new Error('The job page took too long to respond. Try again or enter the details manually.');
    throw error;
  }finally{clearTimeout(timeout);}
}
export async function pickResume():Promise<string|null> {
  const res=await DocumentPicker.getDocumentAsync({type:['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/*'],copyToCacheDirectory:true});
  if(res.canceled || !res.assets?.length)return null;
  const asset=res.assets[0],mime=asset.mimeType?.toLowerCase()||'';
  const ext=asset.name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]||({ 'application/pdf':'pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','image/jpeg':'jpg','image/png':'png','image/webp':'webp' } as Record<string,string>)[mime];
  if(!['pdf','docx','jpg','jpeg','png','webp'].includes(ext||''))throw new Error('Choose a PDF, DOCX, or JPG/PNG/WEBP resume image.');
  if(!FileSystem.documentDirectory) throw new Error('Private document storage is unavailable');
  const dest=FileSystem.documentDirectory+`resume-${Date.now()}.${ext}`;
  try{
    await FileSystem.copyAsync({from:asset.uri,to:dest});
    const info=await FileSystem.getInfoAsync(dest);
    if(!info.exists||info.size===0)throw new Error('The copied file is empty.');
    return dest;
  }catch(error){
    await FileSystem.deleteAsync(dest,{idempotent:true}).catch(()=>{});
    throw new Error(`Brief couldn’t copy this file into private storage. ${(error as Error).message||''}`.trim());
  }
}
export async function pickModel():Promise<string|null> {
  const res=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});
  if(res.canceled||!res.assets?.length)return null;
  if(!(res.assets[0].name||'').toLowerCase().endsWith('.gguf'))throw new Error('Please select a .gguf model file.');
  if(!FileSystem.documentDirectory) throw new Error('Private document storage is unavailable');
  const dest=FileSystem.documentDirectory+`brief-model-${Date.now()}.gguf`;
  // Move, not copy: the picker already cached a private copy, and models are ~1 GB.
  await FileSystem.moveAsync({from:res.assets[0].uri,to:dest});return dest;
}
export async function pickVisionProjector():Promise<string|null> {
  const res=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});
  if(res.canceled||!res.assets?.length)return null;
  if(!(res.assets[0].name||'').toLowerCase().endsWith('.gguf'))throw new Error('Please select the matching mmproj .gguf projector file.');
  if(!FileSystem.documentDirectory)throw new Error('Private document storage is unavailable');
  const dest=FileSystem.documentDirectory+`brief-mmproj-${Date.now()}.gguf`;
  await FileSystem.moveAsync({from:res.assets[0].uri,to:dest});return dest;
}
export async function downloadCatalogBundle(model:CatalogModel,onProgress:(fraction:number)=>void,onTask:(task:FileSystem.DownloadResumable|null)=>void):Promise<{modelUri:string,projectorUri:string}|null>{
  if(!FileSystem.documentDirectory)throw new Error('Private document storage is unavailable');
  const assets=[{fileName:model.fileName,url:model.url,bytes:model.bytes},...(model.projector?[model.projector]:[])];
  const totalBytes=assets.reduce((sum,asset)=>sum+asset.bytes,0);
  const free=await FileSystem.getFreeDiskStorageAsync().catch(()=>null);
  if(free!==null&&free<totalBytes*1.08)throw new Error(`Brief needs about ${model.sizeLabel} plus temporary space. Free some storage and try again.`);
  const paths=assets.map((asset,index)=>FileSystem.documentDirectory+`brief-model-${model.id}-${index}-${Date.now()}.gguf`);
  let completedBytes=0;
  try{
    for(let index=0;index<assets.length;index++){
      const asset=assets[index],dest=paths[index];
      const task=FileSystem.createDownloadResumable(asset.url,dest,{sessionType:FileSystem.FileSystemSessionType.BACKGROUND},p=>{
        const expected=p.totalBytesExpectedToWrite>0?p.totalBytesExpectedToWrite:asset.bytes;
        const fraction=Math.max(0,Math.min(1,p.totalBytesWritten/expected));
        onProgress(Math.max(0,Math.min(1,(completedBytes+fraction*asset.bytes)/totalBytes)));
      });
      onTask(task);
      let result:FileSystem.FileSystemDownloadResult|undefined;
      try{result=await task.downloadAsync();}finally{onTask(null);}
      if(!result){for(const path of paths)await FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{});return null;}
      if(result.status<200||result.status>=300)throw new Error(`The model source returned ${result.status}. Try again when your connection is stable.`);
      const info=await FileSystem.getInfoAsync(dest);
      if(!info.exists||!info.size||info.size!==asset.bytes)throw new Error(`The ${index===0?'model':'vision encoder'} download was incomplete. Please try again.`);
      completedBytes+=asset.bytes;
    }
    onProgress(1);
    return {modelUri:paths[0],projectorUri:paths[1]||''};
  }catch(e){for(const path of paths)await FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{});throw e;}
}
/** Keeps a private, vision-ready copy (scaled, JPEG) of an attached image; the chat shows the same file. */
export async function importChatImage(uri:string):Promise<string> {
  if(!FileSystem.documentDirectory)throw new Error('Private document storage is unavailable');
  let src=uri;try{src=await prepareImageForVision(uri);}catch{/* keep the original if it can't be decoded here; the model may still read it */}
  const dest=FileSystem.documentDirectory+`chat-image-${Date.now()}.jpg`;
  await FileSystem.copyAsync({from:src,to:dest});return dest;
}

/** Longest edge sent to the vision model. Qwen3-VL's encoder (768-token budget) can't use more detail than
 *  this, so scaling first saves decode time and memory without losing readable text; EXIF rotation is baked in. */
export const VISION_MAX_EDGE=1536;
export async function prepareImageForVision(uri:string):Promise<string>{
 const {ImageManipulator,SaveFormat}=await import('expo-image-manipulator');
 const done=timer('vision.preprocess');
 const original=await ImageManipulator.manipulate(uri).renderAsync();
 const long=Math.max(original.width,original.height);
 const ctx=ImageManipulator.manipulate(uri);
 if(long>VISION_MAX_EDGE)ctx.resize(original.width>=original.height?{width:VISION_MAX_EDGE}:{height:VISION_MAX_EDGE});
 const out=await (await ctx.renderAsync()).saveAsync({compress:0.9,format:SaveFormat.JPEG});
 done();
 return out.uri;
}

/** The bundled mascot (a cartoon briefcase) as a local file, for the vision self-test in Settings. */
export async function probeImageUri():Promise<string> {
  const {Asset}=await import('expo-asset');
  const asset=Asset.fromModule(require('../../assets/mascot-happy.png'));
  await asset.downloadAsync();
  if(!asset.localUri)throw new Error('The test image is unavailable.');
  if(asset.localUri.includes(':'))return asset.localUri;
  // Release Android builds embed images as drawable resources (a bare name, not a file); llama.rn needs a real path.
  const dest=`${FileSystem.cacheDirectory}brief-vision-probe.png`;
  await FileSystem.copyAsync({from:asset.localUri,to:dest});
  return dest;
}

export async function readResumeText(uri:string):Promise<string> {
 const lower=uri.toLowerCase();
 if (/\.(jpe?g|png|webp)$/.test(lower)){
  const {recognizeText}=await import('expo-ocr-kit');
  const result=await recognizeText(uri),text=result.text.trim();
  if(!text)throw new Error('No text was found in this resume image. Choose a clearer image or enter your details manually.');
  return text.slice(0,14000);
 }
 if (!lower.endsWith('.pdf')) return '';
 const { extractText, isAvailable } = await import('expo-pdf-text-extract');
 if(!isAvailable()) throw new Error('Resume extraction requires a native development build.');
 return (await extractText(uri)).slice(0,14000);
}
export async function deleteLocalFile(uri:string) { if(uri) await FileSystem.deleteAsync(uri,{idempotent:true}); }
/** Picks and privately copies a resume, then extracts local text where supported. */
export async function importResume():Promise<{resumeUri:string,resumeText:string,note:string}|null> {
 const uri=await pickResume();if(!uri)return null;
 let resumeText='',note='';
 if(uri.toLowerCase().endsWith('.pdf')||/\.(jpe?g|png|webp)$/i.test(uri)){
  try{resumeText=await readResumeText(uri);}catch(error){
   const message=(error as Error).message||'';
   const nativeBuild=/native development build|native module|ExpoOcrKit|ExpoPdfTextExtract|Expo Go/i.test(message);
   note=nativeBuild?'Your resume is saved. Reading it requires the Brief development build.':'Your resume is saved, but its text couldn’t be read on this device.';
  }
  if(!resumeText&&!note)note=uri.toLowerCase().endsWith('.pdf')?'This PDF looks scanned, so there’s no embedded text to read. Choose a resume image or enter your details manually.':'No text was found in this resume image. Choose a clearer image or enter your details manually.';
 }else note='Your DOCX is saved. Reading DOCX text isn’t supported yet.';
 return {resumeUri:uri,resumeText,note};
}
