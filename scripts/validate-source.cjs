// Offline syntactic source validator; does not replace tsc, native build or runtime QA.
const fs=require('fs'),path=require('path');
let ts;try{ts=require('typescript')}catch{try{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}catch{console.error('Install TypeScript and rerun');process.exit(1)}}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.tsx?$/.test(e.name)&&!e.name.endsWith('.d.ts')?[path.join(dir,e.name)]:[])}
const root=path.resolve(__dirname,'..');let error=0;for(const f of [...files(path.join(root,'src')),path.join(root,'App.tsx')]){
 const out=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 for(const d of out.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error){console.error(path.relative(root,f),ts.flattenDiagnosticMessageText(d.messageText,' '));error++}}
}
console.log(`${error?'FAIL':'PASS'}: parsed TS/TSX modules; syntax issues ${error}`);if(error)process.exit(1);
