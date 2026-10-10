// Rubrics are core templates with whole-sentence {{slot}} placeholders that a publication profile fills.
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BLOCKERS,suggestionsFor,groundsFor,attributionDismissalFor,OPTIONAL_GROUNDS} from './enums.mjs';
export const TEMPLATES=['editor','proofreader','verifier','writer'];
const HERE=fileURLToPath(new URL('.',import.meta.url)),SLOT=/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;
// A configuration error is never a reviewer failure: callers stop before any request and keep the story.
export const configError=message=>Object.assign(new Error(`EDITORIAL_CONFIG: ${message}`),{code:'EDITORIAL_CONFIG'});
const cache=new Map();
// Read once and re-read when the file changes, so a long-lived process composes from the installed files.
function template(name,dir=HERE){
 if(!TEMPLATES.includes(name))throw configError(`unknown rubric ${name}`);
 const path=join(dir,`${name}.template.md`);let stat;
 try{stat=statSync(path);}catch(error){throw configError(`rubric template ${name}.template.md unreadable (${error.code||error.message})`);}
 const hit=cache.get(path);
 if(hit?.mtimeMs===stat.mtimeMs&&hit.size===stat.size)return hit.text;
 const text=readFileSync(path,'utf8');cache.set(path,{mtimeMs:stat.mtimeMs,size:stat.size,text});return text;
}
export const slotNames=(name,dir)=>[...template(name,dir).matchAll(SLOT)].map(m=>m[1]);
export function composeRubric(name,profile,dir){
 const slots=profile?.slots;
 if(!slots||typeof slots!=='object')throw configError(`profile ${profile?.id} has no slots`);
 const missing=[...new Set(slotNames(name,dir))].filter(s=>!Object.hasOwn(slots,s));
 if(missing.length)throw configError(`profile ${profile.id} lacks slot ${missing.join(', ')} used by ${name}.template.md`);
 const text=template(name,dir).replace(SLOT,(_,slot)=>{if(typeof slots[slot]!=='string')throw configError(`slot ${slot} of profile ${profile.id} is not text`);return slots[slot];});
 if(text.includes('{{'))throw configError(`placeholder left in the composed ${name} rubric of profile ${profile.id}`);
 return text;
}
const TOKEN=/^[a-z][a-z-]*$/,FIELD=/^[a-z][A-Za-z0-9]*$/;
// Keys the gate itself sends to the editor; a field must never shadow them.
const RESERVED=['contentType','candidate','history','source','current','changedSections','abandonedStories'];
function same(found,expected,what){
 const extra=[...new Set(found)].filter(x=>!expected.includes(x)),absent=expected.filter(x=>!found.includes(x));
 if(extra.length||absent.length)throw configError(`${what} disagree with the enum${extra.length?`; not in the enum: ${extra.join(', ')}`:''}${absent.length?`; missing from the prose: ${absent.join(', ')}`:''}`);
}
// The prose a model reads must offer exactly the categories and grounds the host accepts.
function agreement(p,rubrics){
 const suggestions=rubrics.editor.split(/^## Suggestions.*$/m)[1]?.split(/^## /m)[0];
 if(suggestions===undefined)throw configError('the editor rubric has no Suggestions section');
 same([...suggestions.matchAll(/^- `([a-z-]+)`:/gm)].map(m=>m[1]),suggestionsFor(p),`suggestion categories of profile ${p.id}`);
 same([...rubrics.editor.matchAll(/`contentType` ([a-z][a-z-]*)/g)].map(m=>m[1]),[p.contentTypes.withSource,p.contentTypes.withoutSource],`content types of profile ${p.id}`);
 const real=rubrics.verifier.match(/A real claim uses ground `([a-z-]+)`/)?.[1],list=rubrics.verifier.match(/names why: (.*?)\.(?:\s|$)/s)?.[1];
 if(!real||list===undefined)throw configError('the verifier rubric does not list its dismissal grounds');
 const grounds=groundsFor(p);
 same([real,...[...list.matchAll(/`([a-z-]+)`/g)].map(m=>m[1])],grounds,`dismissal grounds of profile ${p.id}`);
 for(const [name,text] of Object.entries(rubrics))for(const g of OPTIONAL_GROUNDS.filter(g=>!grounds.includes(g)))if(text.includes(`\`${g}\``))throw configError(`the ${name} rubric of profile ${p.id} names ground ${g}, which the profile does not offer`);
 const attribution=rubrics.verifier.match(/A `misattribution` claim may be dismissed only as (.*?)\.(?:\s|$)/s)?.[1];
 if(attribution===undefined)throw configError('the verifier rubric does not list its misattribution dismissal grounds');
 same([...attribution.matchAll(/`([a-z-]+)`/g)].map(m=>m[1]),attributionDismissalFor(p),`misattribution dismissal grounds of profile ${p.id}`);
 // Names cannot be told apart from other words, but a persona or fictional speaker is always introduced as one.
 if(!p.persona){for(const [name,text] of Object.entries(rubrics))if(/persona|fictional|персонаж|вымышлен/i.test(text))throw configError(`the ${name} rubric of profile ${p.id} names a persona or fictional speaker, but the profile has none`);}
 else for(const name of ['editor','verifier'])if(!rubrics[name].includes(p.persona.name))throw configError(`the ${name} rubric of profile ${p.id} never names its persona ${p.persona.name}`);
}
export function validateProfile(p,dir){
 if(!p||typeof p!=='object')throw configError('a publication profile is required');
 if(typeof p.id!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(p.id))throw configError('profile id missing or invalid');
 const bad=what=>configError(`profile ${p.id}: ${what}`);
 if(p.language!=='ru')throw bad(`language must be ru, not ${p.language}`);
 if(p.persona!==null&&!(typeof p.persona?.name==='string'&&p.persona.name.trim()))throw bad('persona must be null or {name}');
 if(typeof p.verdictLines!=='boolean')throw bad('verdictLines must be a boolean');
 if(p.categories!==null&&!(typeof p.categories==='string'&&p.categories.trim()))throw bad('categories must be null or a description');
 if(!Array.isArray(p.suggestions)||p.suggestions.some(s=>!TOKEN.test(s)||[...BLOCKERS,'humor','style','category'].includes(s))||new Set(p.suggestions).size!==p.suggestions.length)throw bad('suggestion categories must be new lower-case tokens');
 const {withSource,withoutSource}=p.contentTypes||{};
 if(!TOKEN.test(withSource||'')||!TOKEN.test(withoutSource||'')||withSource===withoutSource)throw bad('contentTypes needs two distinct names');
 if(!Number.isInteger(p.maxChars)||p.maxChars<1||p.maxChars>4096)throw bad('maxChars must be an integer up to 4096');
 if(!Array.isArray(p.fields)||p.fields.some(f=>!FIELD.test(f)||RESERVED.includes(f))||new Set(p.fields).size!==p.fields.length)throw bad('fields must be distinct identifiers that do not shadow gate inputs');
 if(typeof p.unique!=='function')throw bad('unique(fields, history) is required');
 if(p.hostLines!==undefined&&!(Array.isArray(p.hostLines)&&p.hostLines.every(h=>typeof h==='string'&&h)))throw bad('hostLines must be a list of strings');
 // A profile may tighten the release bar, never loosen it below 90% of objective trials.
 if(p.releaseBar!==undefined&&!(typeof p.releaseBar?.objective==='number'&&p.releaseBar.objective>=0.9&&p.releaseBar.objective<=1))throw bad('releaseBar.objective must be between 0.9 and 1');
 if(!p.slots||typeof p.slots!=='object')throw bad('slots are required');
 for(const [k,v] of Object.entries(p.slots))if(typeof v!=='string')throw bad(`slot ${k} is not text`);
 const used=new Set(TEMPLATES.flatMap(n=>slotNames(n,dir)));
 const missing=[...used].filter(s=>!Object.hasOwn(p.slots,s)),unused=Object.keys(p.slots).filter(s=>!used.has(s));
 if(missing.length)throw bad(`missing slot ${missing.join(', ')}`);
 if(unused.length)throw bad(`slot ${unused.join(', ')} is used by no template`);
 const rubrics=Object.fromEntries(TEMPLATES.map(n=>[n,composeRubric(n,p,dir)]));
 agreement(p,rubrics);
 return rubrics;
}
