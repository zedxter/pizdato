import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,utimes,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {composeRubric,validateProfile,slotNames,TEMPLATES} from '../compose-rubric.mjs';
import channel from '../profiles/pizdato-channel.mjs';
import neutral from './profiles/neutral.mjs';
import column from './profiles/example-column.mjs';
const config=re=>e=>e.code==='EDITORIAL_CONFIG'&&re.test(e.message);
const withSlots=(profile,change)=>({...profile,slots:change({...profile.slots})});
test('every shipped and test profile validates and composes all four rubrics',()=>{
 for(const p of [channel,neutral,column]){const rubrics=validateProfile(p);assert.deepEqual(Object.keys(rubrics),TEMPLATES);for(const r of Object.values(rubrics))assert.doesNotMatch(r,/\{\{/);}
});
test('a slot used by a template but missing from the profile is named',()=>{
 const broken=withSlots(neutral,s=>{delete s.editorRole;return s;});
 assert.throws(()=>validateProfile(broken),config(/editorRole/));
 assert.throws(()=>composeRubric('editor',broken),config(/editorRole/));
});
test('a slot that no template uses is named',()=>{
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,orphanSlot:'Text.'}))),config(/orphanSlot/));
});
test('a placeholder left by slot text fails composition',()=>{
 const leaking=withSlots(neutral,s=>({...s,editorRole:'You are an editor for {{publication}}.'}));
 assert.throws(()=>composeRubric('editor',leaking),config(/placeholder/i));
 assert.throws(()=>validateProfile(leaking),config(/placeholder/i));
});
test('slot text is inserted literally, never as a replacement pattern',()=>{
 assert.match(composeRubric('editor',withSlots(neutral,s=>({...s,editorRole:'Price $& and $1 stay as written.'}))),/Price \$& and \$1 stay as written\./);
});
test('id, language, size and structure are validated',()=>{
 assert.throws(()=>validateProfile(undefined),config(/profile is required/i));
 assert.throws(()=>validateProfile({...neutral,id:undefined}),config(/id/));
 assert.throws(()=>validateProfile({...neutral,language:'en'}),config(/language/));
 assert.throws(()=>validateProfile({...neutral,maxChars:4097}),config(/maxChars/));
 assert.throws(()=>validateProfile({...neutral,fields:['candidate']}),config(/field/));
 assert.throws(()=>validateProfile({...neutral,unique:null}),config(/unique/));
 assert.throws(()=>validateProfile({...neutral,suggestions:['spelling']}),config(/suggestion/));
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,editorRole:42}))),config(/editorRole/));
});
test('a persona ground in the prose of a profile without a persona fails',()=>{
 const g=neutral.slots.groundList.replace('`taste`','`persona-opinion`, `taste`');
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,groundList:g}))),config(/persona-opinion/));
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,personaAttributionGround:'`persona-opinion` (the narrator) '}))),config(/persona-opinion/));
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,personaCalibration:'- The narrator is a fictional persona.\n'}))),config(/persona/i));
});
test('ground prose must list exactly the ground enum',()=>{
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,groundList:s.groundList.replace('`taste` or','`taste`, `vibes` or')}))),config(/vibes/));
 assert.throws(()=>validateProfile(withSlots(neutral,s=>({...s,groundList:s.groundList.replace(', `taste`','')}))),config(/taste/));
 assert.throws(()=>validateProfile({...channel,verdictLines:false}),config(/verdict-contrast/));
 assert.throws(()=>validateProfile({...channel,categories:null}),config(/loose-category|category/));
});
test('suggestion and content-type prose must match their enums',()=>{
 assert.throws(()=>validateProfile({...neutral,suggestions:['headline']}),config(/headline/));
 assert.throws(()=>validateProfile(withSlots(column,s=>({...s,extraSuggestions:''}))),config(/headline/));
 assert.throws(()=>validateProfile({...neutral,contentTypes:{withSource:'sourced-text',withoutSource:'other-text'}}),config(/other-text|unsourced-text/));
});
test('a persona profile must name its persona',()=>{
 assert.throws(()=>validateProfile({...column,persona:{name:'Somebody Else'}}),config(/Somebody Else/));
});
test('templates are read once and re-read when a file changes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rubric-templates-'));
 try{
  for(const n of TEMPLATES)await cp(fileURLToPath(new URL(`../${n}.template.md`,import.meta.url)),join(dir,`${n}.template.md`));
  const before=composeRubric('writer',neutral,dir);
  const path=join(dir,'writer.template.md');await writeFile(path,(await readFile(path,'utf8')).replace('Apply to the complete draft','Apply to every complete draft'));
  await utimes(path,new Date(),new Date(Date.now()+5000));
  const after=composeRubric('writer',neutral,dir);
  assert.notEqual(before,after);assert.match(after,/Apply to every complete draft/);
  assert.ok(slotNames('writer',dir).includes('writerScope'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
