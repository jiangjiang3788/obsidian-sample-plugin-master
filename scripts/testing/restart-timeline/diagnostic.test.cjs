const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'); const vault=fs.mkdtempSync(path.join(os.tmpdir(),'think-diagnostic-only-'));
let passed=0;
function run(){const p=spawnSync(process.execPath,[path.join(root,'scripts/diagnostics/inspect-data.cjs'),'--vault',vault],{encoding:'utf8'});return{code:p.status,data:JSON.parse(p.stdout),raw:p.stdout}}
function put(file,text){const target=path.join(vault,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text)}
try{
 const missing=run();assert.equal(missing.code,2);assert.equal(fs.readdirSync(vault).length,0);passed++;
 const original=JSON.stringify({goalSettings:{goals:[],goalTemplates:[]},viewInstances:[],layouts:[],aiSettings:{apiKey:'DO_NOT_PRINT_SENTINEL'}});
 put('Think/data.json',original);const stat=fs.statSync(path.join(vault,'Think/data.json'));
 const valid=run();assert.equal(valid.code,0);assert(!valid.raw.includes('DO_NOT_PRINT_SENTINEL'));assert.equal(fs.readFileSync(path.join(vault,'Think/data.json'),'utf8'),original);assert.equal(fs.statSync(path.join(vault,'Think/data.json')).mtimeMs,stat.mtimeMs);assert.deepEqual(fs.readdirSync(path.join(vault,'Think')),['data.json']);passed++;
 put('Think/data.json','{"bad":');const broken=run();assert.equal(broken.code,2);assert.equal(fs.readFileSync(path.join(vault,'Think/data.json'),'utf8'),'{"bad":');passed++;
 console.log(JSON.stringify({total:passed,passed,scope:'只读诊断的缺失、有效/脱敏、不合法文件保护；仅临时测试目录'},null,2));
}finally{fs.rmSync(vault,{recursive:true,force:true})}
