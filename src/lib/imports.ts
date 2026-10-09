import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type {CatalogModel} from './modelCatalog';
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
  const assets=[{fileName:model.fileName,url:model.url,approximateBytes:model.approximateBytes,minimumBytes:model.minimumBytes},...(model.projector?[model.projector]:[])];
  const totalBytes=assets.reduce((sum,asset)=>sum+asset.approximateBytes,0);
  const free=await FileSystem.getFreeDiskStorageAsync().catch(()=>null);
  if(free!==null&&free<totalBytes*1.08)throw new Error(`Brief needs about ${model.sizeLabel} plus temporary space. Free some storage and try again.`);
  const paths=assets.map((asset,index)=>FileSystem.documentDirectory+`brief-model-${model.id}-${index}-${Date.now()}.gguf`);
  let completedBytes=0;
  try{
    for(let index=0;index<assets.length;index++){
      const asset=assets[index],dest=paths[index];
      const task=FileSystem.createDownloadResumable(asset.url,dest,{sessionType:FileSystem.FileSystemSessionType.BACKGROUND},p=>{
        const expected=p.totalBytesExpectedToWrite>0?p.totalBytesExpectedToWrite:asset.approximateBytes;
        const fraction=Math.max(0,Math.min(1,p.totalBytesWritten/expected));
        onProgress(Math.max(0,Math.min(1,(completedBytes+fraction*asset.approximateBytes)/totalBytes)));
      });
      onTask(task);
      let result:FileSystem.FileSystemDownloadResult|undefined;
      try{result=await task.downloadAsync();}finally{onTask(null);}
      if(!result){for(const path of paths)await FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{});return null;}
      if(result.status<200||result.status>=300)throw new Error(`The model source returned ${result.status}. Try again when your connection is stable.`);
      const info=await FileSystem.getInfoAsync(dest);
      if(!info.exists||!info.size||info.size<asset.minimumBytes)throw new Error(`The ${index===0?'model':'vision encoder'} download was incomplete. Please try again.`);
      completedBytes+=asset.approximateBytes;
    }
    onProgress(1);
    return {modelUri:paths[0],projectorUri:paths[1]||''};
  }catch(e){for(const path of paths)await FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{});throw e;}
}
export async function importChatImage(uri:string):Promise<string> {
  if(!FileSystem.documentDirectory)throw new Error('Private document storage is unavailable');
  const ext=uri.split('?')[0].split('.').pop()?.toLowerCase();
  const suffix=ext&&/^(jpg|jpeg|png|webp|bmp)$/.test(ext)?ext:'jpg';
  const dest=FileSystem.documentDirectory+`chat-image-${Date.now()}.${suffix}`;
  await FileSystem.copyAsync({from:uri,to:dest});return dest;
}

export async function readResumeText(uri:string):Promise<string> {
 if (!uri.toLowerCase().endsWith('.pdf')) return '';
 const { extractText, isAvailable } = await import('expo-pdf-text-extract');
 if(!isAvailable()) throw new Error('Resume extraction requires a native development build.');
 return (await extractText(uri)).slice(0,14000);
}
export async function deleteLocalFile(uri:string) { if(uri) await FileSystem.deleteAsync(uri,{idempotent:true}); }
/** Picks a resume, stores it privately, extracts digital-PDF text when possible, and removes a replaced file.
 *  Returns the profile changes plus an honest note when text couldn't be read (DOCX / scanned PDF), or null if cancelled. */
export async function importResume(currentUri:string):Promise<{resumeUri:string,resumeText:string,note:string}|null> {
 const uri=await pickResume();if(!uri)return null;
 let resumeText='',note='';
 if(uri.endsWith('.pdf')){
  try{resumeText=await readResumeText(uri);}catch{note='Your PDF is saved, but its text couldn’t be read on this device.';}
  if(!resumeText&&!note)note='This PDF looks scanned, so there’s no text to read.';
 }else note='Your DOCX is saved. Reading DOCX text isn’t supported yet.';
 if(currentUri&&currentUri!==uri)await deleteLocalFile(currentUri);
 return {resumeUri:uri,resumeText,note};
}
