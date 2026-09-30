const fs=require('node:fs'),path=require('node:path');const {ts}=require('./source-loader.cjs');
const root=process.argv[2]||process.cwd();let count=0,errors=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(f)&&!f.endsWith('.d.ts')){
 count++;const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,jsx:ts.JsxEmit.ReactJSX,jsxImportSource:'preact'}});
 for(const d of r.diagnostics||[])if(d.category===ts.DiagnosticCategory.Error)errors.push({file:path.relative(root,f),code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')});
}}}
walk(path.join(root,'src'));console.log(JSON.stringify({typescript:ts.version,sourceFilesTranspiled:count,syntaxErrors:errors.length,errors,note:'Syntax/transpile diagnostics only. Not full-project type checking.'},null,2));process.exitCode=errors.length?1:0;
