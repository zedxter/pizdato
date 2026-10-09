import {join,resolve} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {mkdtemp,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {EditionStore,localDay,dueAt,status,durableWrite} from './store.mjs';
import {loadEnv} from './agent.mjs';
import {tick} from './worker.mjs';
import {createServices} from './network.mjs';
import {reconcile,cancel} from './control.mjs';
export async function main(args=process.argv.slice(2)){
 const mode=args[0]||'tick',now=new Date();
 let root=process.env.PIZDATO_EVENING_STATE||join(homedir(),'.local/state/pizdato-evening');
 const vault=process.env.PIZDATO_EVENING_VAULT||'/home/danil/vault/pizdato';
 if(mode==='--dry-run'){
  if(args[1]){root=resolve(args[1]);const config=JSON.parse(await readFile(join(root,'scheduler.json'),'utf8'));if(config.dryRun!==true)throw new Error('Not isolated dry-run state');}
  else {root=await mkdtemp(join(tmpdir(),'pizdato-evening-dry-'));await durableWrite(join(root,'scheduler.json'),{version:1,activationDate:localDay(now),dryRun:true});}
  console.log(`DRY_STATE ${root}`);
 }
 const store=new EditionStore(root);
 if(mode==='--status'){console.log(JSON.stringify(await status(store,now),null,2));return;}
 if(mode==='--init'){await store.initialize(args[1]||localDay(now));console.log('INITIALIZED');return;}
 if(mode==='--reconcile'){console.log(JSON.stringify(await reconcile({store,vault,day:args[1],evidence:JSON.parse(await readFile(args[2],'utf8'))})));return;}
 if(mode==='--cancel'){await cancel({store,day:args[1],reason:args.slice(2).join(' ')});return;}
 if(!['tick','--dry-run','--check'].includes(mode))throw new Error('Usage: tick | --status | --init [date] | --dry-run | --check | --reconcile date evidence.json | --cancel date reason');
 await loadEnv(process.env.PIZDATO_CHANNEL_ENV||join(homedir(),'.config/pizdato-channel.env'));await loadEnv(process.env.PIZDATO_EVENING_ENV||join(homedir(),'.config/pizdato-evening.env'));
 const deps=createServices({store,vault,dryRun:mode==='--dry-run'});
 if(mode==='--check'){await deps.check();console.log('PREFLIGHT_OK');return;}
 if(mode==='--dry-run'){
  await store.initialize(localDay(now));await store.enqueue(new Date(Math.max(+now,dueAt(localDay(now)))));
  const e=await store.get(localDay(now));e.nextAttemptAt=+now;await store.save(e);
 }
 const e=await tick({store,vault,now,deps,dryRun:mode==='--dry-run'});
 for(const day of e.expired||[])console.log(`EXPIRED ${day}: evening deadline passed without an approved post`);
 console.log(JSON.stringify({at:now.toISOString(),edition:e.day,phase:e.phase,revision:e.revision,error:e.lastError,nextAttemptAt:e.nextAttemptAt}));
 if(e.dryRun){await durableWrite(join(root,'approved-draft.json'),e.draft);console.log('DRY_RUN_OK');}
 if(e.phase==='published')console.log(`PUBLISHED https://t.me/pizdato_net/${e.receipt.message_id}`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(`${new Date().toISOString()} ERROR: ${String(error?.safeMessage||error?.message||'evening state or dependency unavailable').slice(0,300)}; inspect --status and local state`);process.exitCode=1;});
