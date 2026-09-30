// Offline source harness: compile real TypeScript and lazily resolve facade re-exports.
// No Obsidian runtime, HTTP calls, repository I/O, or UI mounting is provided.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.TYPESCRIPT_PATH || require.resolve('typescript', { paths: [path.resolve(process.argv[2] || process.cwd()), process.cwd(), __dirname] }));
function createLoader(root, overrides = {}) {
 const cache = new Map(); const omitted = new Set();
 function resolve(spec, parent) {
  const aliases = {'@/':'src/','@core/':'src/core/','@shared/':'src/shared/','@app/':'src/app/','@features/':'src/features/','@platform/':'src/platform/'};
  let p;
  for (const [a,b] of Object.entries(aliases)) if(spec.startsWith(a)) {p=path.join(root,b,spec.slice(a.length)); break;}
  if(!p && spec.startsWith('.')) p=path.resolve(path.dirname(parent),spec);
  if(!p) return spec;
  for(const f of [p,p+'.ts',p+'.tsx',p+'.js',path.join(p,'index.ts')]) if(fs.existsSync(f)&&fs.statSync(f).isFile())return f;
  throw new Error('Unresolved source '+spec+' from '+parent);
 }
 function load(spec, parent=path.join(root,'entry.cjs')) {
  const file=resolve(spec,parent);
  if (Object.prototype.hasOwnProperty.call(overrides, file)) return overrides[file];
  if (Object.prototype.hasOwnProperty.call(overrides, spec)) return overrides[spec];
  if(!path.isAbsolute(file)) return require(file);
  if(cache.has(file))return cache.get(file).exports;
  // These dependencies are unavailable; fail if any tested function actually uses them.
  if(file===path.join(root,'src/core/utils/date.ts')) {
   omitted.add(path.relative(root,file));
   return new Proxy({}, {get(_t,k){throw new Error('Date helper outside offline harness: '+String(k));}});
  }
  const mod={exports:{}};cache.set(file,mod);
  const text=fs.readFileSync(file,'utf8');
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(ast.statements.every(s=>ts.isExportDeclaration(s)||ts.isInterfaceDeclaration(s)||ts.isTypeAliasDeclaration(s)||ts.isEmptyStatement(s))) {
   const names=new Map(), stars=[];
   for(const s of ast.statements) if(ts.isExportDeclaration(s)&&s.moduleSpecifier&&!s.isTypeOnly){
    const from=s.moduleSpecifier.text;
    if(s.exportClause&&ts.isNamedExports(s.exportClause))for(const e of s.exportClause.elements) if(!e.isTypeOnly)names.set(e.name.text,{from,key:e.propertyName?.text||e.name.text});
    else {} // export-star handled separately below
    if(!s.exportClause)stars.push(from);
   }
   mod.exports=new Proxy({}, {get(_t,k){
    if(k==='__esModule')return true;
    if(names.has(k)){const {from,key}=names.get(k);return load(from,file)[key];}
    for(const from of stars){const v=load(from,file)[k];if(v!==undefined)return v;}
    return undefined;
   }});return mod.exports;
  }
  const result=ts.transpileModule(text,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true,experimentalDecorators:true,jsx:ts.JsxEmit.ReactJSX,jsxImportSource:'preact'},reportDiagnostics:true});
  const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  if(errors.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));
  const fn=vm.runInThisContext('(function(require,module,exports,__filename,__dirname){\n'+result.outputText+'\n})',{filename:file});
  fn(s=>load(s,file),mod,mod.exports,file,path.dirname(file));
  return mod.exports;
 }
 return {load,cache,omitted};
}
module.exports={createLoader,ts};
