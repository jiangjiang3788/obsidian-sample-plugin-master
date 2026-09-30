// Reproduce the supplied ORIGINAL sources, with only DI decorators mocked.
const fs=require('node:fs'),path=require('node:path');
const {createLoader}=require('./source-loader.cjs');
const root=path.resolve(process.argv[2]);
const loader=createLoader(root,{tsyringe:{singleton:()=>()=>{},inject:()=>()=>{}},immer:{produce:()=>{throw new Error('not used')}}});
const {VaultFileStorage}=loader.load('@/core/services/StorageService');
const {VaultSettingsPersistence}=loader.load('@/core/services/SettingsPersistence');
const {SettingsRepository}=loader.load('@/core/services/SettingsRepository');
const main='Think/data.json';
const seed={groups:[],viewInstances:[],layouts:[],goalSettings:{goals:[{path:'SYNTHETIC',status:'active'}],goalTemplates:[]}};
(async()=>{
 const files=new Map([[main,'{"goalSettings":']]);const writes=[];
 const vault={readFile:async p=>files.get(p)??null,writeFile:async(p,t)=>{writes.push(p);files.set(p,t)},deleteFile:async p=>files.delete(p)};
 const repo=new SettingsRepository(new VaultSettingsPersistence(new VaultFileStorage(vault)));
 const rawBefore=files.get(main);const restored=await repo.load();
 const corruptOverwrite={before:rawBefore,afterGoals:restored.goalSettings.goals.length,writes,overwritten:files.get(main)!==rawBefore};
 const failing=new SettingsRepository({load:async()=>seed,save:async()=>{throw new Error('SYNTHETIC_SAVE_FAILURE')}});
 await failing.load();const before=failing.getSnapshot();let rejected=false;
 try{await failing.save({...before,floatingTimerEnabled:!before.floatingTimerEnabled})}catch{rejected=true}
 const prematurePublish={saveRejected:rejected,memoryChangedDespiteFailure:failing.getSnapshot()!==before};
 let disk=seed;const race=new SettingsRepository({load:async()=>disk,save:async value=>{if(value.recentGoalPaths?.[0]==='A')await new Promise(r=>setTimeout(r,12));disk=value}});
 await race.load();const snap=race.getSnapshot();
 await Promise.all([race.save({...snap,recentGoalPaths:['A']}),race.save({...snap,recentGoalPaths:['B']})]);
 const reorderedWrite={runtime:race.getSnapshot().recentGoalPaths,restarted:(await new SettingsRepository({load:async()=>disk,save:async()=>{}}).load()).recentGoalPaths};
 console.log(JSON.stringify({sourceRoot:root,syntheticFixturesOnly:true,corruptOverwrite,prematurePublish,reorderedWrite},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
