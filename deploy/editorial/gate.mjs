import {createHash} from 'node:crypto';
import {composeRubric,validateProfile,configError} from './compose-rubric.mjs';
import {BLOCKERS,LANGUAGE,suggestionsFor,groundsFor,attributionDismissalFor} from './enums.mjs';
import channel from './profiles/pizdato-channel.mjs';
export {BLOCKERS};
const dimensions=['grammar','meaning','freshness','voice','grounding'];
// Blockers are objective defects; suggestions improve taste but never stop a post.
const REPLACE=['repetition','unusable-source'];
const DIMENSION={spelling:'grammar',grammar:'grammar',punctuation:'grammar','wrong-phrase':'grammar',meaning:'meaning','unsupported-claim':'grounding',misattribution:'grounding','unusable-source':'grounding',repetition:'freshness','ai-slop':'voice'};
// Request titles are infrastructure labels: agent.mjs routes reviewer reasoning effort by them.
const TITLES={editor:'pizdato-editor',proofreader:'pizdato-proofreader',verifier:'pizdato-verifier'};
const reviewerOptions=(title,categories)=>({
  title, temperature:0, maxTokens:16000,
  // OpenRouter providers may spend the whole token budget on "low" reasoning and return no content.
  reasoning:{enabled:false,exclude:true},
  responseFormat:{type:'json_schema',json_schema:{name:'editorial_verdict',strict:true,schema:{
    type:'object',additionalProperties:false,required:['issues'],
    properties:{issues:{type:'array',items:{type:'object',additionalProperties:false,required:['category','quote','problem','fix'],properties:{
      category:{type:'string',enum:categories},quote:{type:'string'},problem:{type:'string'},fix:{type:'string'}
    }}}}
  }}}
});
const verifierSchema=grounds=>({title:TITLES.verifier,temperature:0,maxTokens:8000,reasoning:{enabled:false,exclude:true},responseFormat:{type:'json_schema',json_schema:{name:'defect_verification',strict:true,schema:{
  type:'object',additionalProperties:false,required:['verdicts'],
  properties:{verdicts:{type:'array',items:{type:'object',additionalProperties:false,required:['id','real','category','ground','reason'],properties:{id:{type:'integer'},real:{type:'boolean'},category:{type:'string',enum:BLOCKERS},ground:{type:'string',enum:grounds},reason:{type:'string'}}}}}
}}}});
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.values(o).forEach(freeze);}return o;};
const memo=new WeakMap();
// One frozen set per profile, so callers and tests can route requests by option identity.
export function reviewOptions(profile) {
  if(!memo.has(profile)) validateProfile(profile), memo.set(profile,freeze({
    editor:reviewerOptions(TITLES.editor,[...BLOCKERS,...suggestionsFor(profile)]),
    // A narrow second reader sees only the text, so language errors are not lost in source and history context.
    proofreader:reviewerOptions(TITLES.proofreader,LANGUAGE),
    // Open-ended critics over-report; a narrow yes/no check of each claimed blocker filters their false positives.
    // A dismissal must name its ground; language claims stand unless the text is correct as written.
    verifier:verifierSchema(groundsFor(profile))
  }));
  return memo.get(profile);
}
// A broken channel profile must not crash importers: createGate and every --check raise EDITORIAL_CONFIG where callers record it.
export let editorOptions,proofreaderOptions,verifierOptions;
try{({editor:editorOptions,proofreader:proofreaderOptions,verifier:verifierOptions}=reviewOptions(channel));}catch(error){if(error.code!=='EDITORIAL_CONFIG')throw error;}
const LANGUAGE_DISMISSAL=['correct-as-written','misread'];
function parseVerdicts(content,grounds) {
  if(typeof content!=='string') throw new Error('Malformed verification');
  const parsed=JSON.parse(content);
  if(!parsed||Object.keys(parsed).join()!=='verdicts'||!Array.isArray(parsed.verdicts)||parsed.verdicts.some(v=>!v||!Number.isInteger(v.id)||typeof v.real!=='boolean'||!BLOCKERS.includes(v.category)||!grounds.includes(v.ground)||typeof v.reason!=='string')) throw new Error('Malformed verification');
  if(new Set(parsed.verdicts.map(v=>v.id)).size!==parsed.verdicts.length) throw new Error('Malformed verification: duplicate claim ids');
  return parsed.verdicts;
}
const hash=text=>createHash('sha256').update(text).digest('hex');
const approvals=new WeakMap();
export const formatIssue=i=>typeof i==='string'?i:`${i.category}: ${i.quote?`«${i.quote}» — `:''}${i.problem}${i.fix?` Fix: ${i.fix}`:''}`;
export function assertApproved(text, approval) {
  if(!approval || approvals.get(approval)!==hash(text)) throw new Error('Valid approval for this exact payload required');
}
function parseVerdict(content,categories) {
  if(typeof content!=='string') throw new Error('Malformed editorial verdict');
  const verdict=JSON.parse(content);
  if(!verdict || typeof verdict!=='object' || Object.keys(verdict).join()!=='issues' || !Array.isArray(verdict.issues)) throw new Error('Malformed editorial verdict');
  for(const i of verdict.issues) {
    if(!i || typeof i!=='object' || Object.keys(i).sort().join()!=='category,fix,problem,quote' || !categories.includes(i.category) || ['quote','problem','fix'].some(k=>typeof i[k]!=='string') || !i.problem.trim()) throw new Error('Malformed editorial issue');
  }
  return verdict.issues;
}
// Publication inputs arrive only as declared profile fields; a missing or foreign one is a caller bug, not a review.
function checkInput(profile,text,fields) {
  if(!fields||typeof fields!=='object') throw configError('review fields must be an object');
  const undeclared=Object.keys(fields).filter(k=>!profile.fields.includes(k)),missing=profile.fields.filter(k=>!(k in fields)||fields[k]===undefined);
  if(undeclared.length) throw configError(`profile ${profile.id} does not declare field ${undeclared.join(', ')}`);
  if(missing.length) throw configError(`profile ${profile.id} needs field ${missing.join(', ')}`);
  if(typeof text==='string'&&[...text].length>profile.maxChars) throw configError(`text of ${[...text].length} characters exceeds the ${profile.maxChars}-character limit of profile ${profile.id}`);
}
export function createGate({profile, request, history, record=async()=>{},policy='bounded',initial=null}) {
  validateProfile(profile);
  const options=reviewOptions(profile),SUGGESTIONS=suggestionsFor(profile),GROUNDS=groundsFor(profile),ATTRIBUTION_DISMISSAL=attributionDismissalFor(profile);
  const persistent=policy==='persistent-evening';
  // Evening keeps working until its deadline but must not polish one story forever.
  const maxRepairs=persistent?4:2;
  let attempts=initial?.attempts||0, story=initial?.story||1, revision=initial?.revision||0, done=false;
  const abandoned=initial?.abandoned?.slice(-6)||[];
  const ensureOpen=()=>{if(done) throw new Error('Editorial budget is terminal');};
  const advance=(decision,text)=>{
    if(decision==='approve') {done=true;return 'publish';}
    if(decision==='replace'||revision>=maxRepairs) {
      abandoned.push({story,text});
      if(!persistent&&story===3) {done=true;return 'stop';}
      story++;revision=0;return 'replace';
    }
    revision++;return 'repair';
  };
  return {
    options,
    get state() {return {story,revision,done};},
    snapshot() {return {attempts,story,revision,abandoned:abandoned.slice(-6)};},
    async review({text,fields={},source=null,changedSections=null,hostText=[]}) {
      ensureOpen();
      // Configuration errors surface before any request and leave the budget and the story untouched.
      checkInput(profile,text,fields);
      const rubric=composeRubric('editor',profile),proofRubric=composeRubric('proofreader',profile),verifyRubric=composeRubric('verifier',profile);
      const current={attempt:++attempts,story,revision};
      let errorKind='Reviewer transport failed';
      try {
        // Each revision is judged fresh: earlier drafts and findings of this story anchor the editor into repeating them.
        // One immediate retry absorbs an empty or malformed answer from a single provider.
        // One retry absorbs a transport hiccup or an empty/malformed answer; a budget yield is never retried.
        const ask=async(messages,options,parse)=>{
          for(let attempt=0;;attempt++) {
            let answer;
            try {answer=await request(messages,options);} catch(error) {if(attempt||error.code==='YIELD') throw error;continue;}
            if(answer.tool_calls?.length) throw new Error('Editorial review must not call tools');
            try {return parse(answer.content);} catch(error) {
              errorKind='Reviewer returned invalid or malformed JSON';if(attempt) throw error;
              messages=[...messages,{role:'user',content:'Your previous answer was empty or invalid. Return only valid JSON matching the schema and report each defect once.'}];
            }
          }
        };
        const contentType=source===null?profile.contentTypes.withoutSource:profile.contentTypes.withSource;
        const [proofIssues,editorIssues]=await Promise.all([
          ask([{role:'system',content:proofRubric},{role:'user',content:JSON.stringify({candidate:text})}],options.proofreader,c=>parseVerdict(c,LANGUAGE)),
          ask([{role:'system',content:rubric},{role:'user',content:JSON.stringify({contentType,candidate:text,...Object.fromEntries(profile.fields.map(k=>[k,fields[k]])),history,source,current,...(changedSections&&{changedSections}),abandonedStories:abandoned.slice(-6)})}],options.editor,c=>parseVerdict(c,[...BLOCKERS,...SUGGESTIONS]))
        ]);
        const norm=s=>String(s??'').toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
        const key=i=>`${i.category}|${norm(i.quote)||i.problem}`,merged=new Map();
        // A defect both readers found independently is corroborated and is not sent for dismissal.
        for(const i of [...proofIssues.map(i=>({...i,by:'proofreader'})),...editorIssues.map(i=>({...i,by:'editor'}))]){
          const seen=merged.get(key(i));
          if(!seen) merged.set(key(i),i); else if(seen.by!==i.by) merged.set(key(i),{...seen,by:'proofreader+editor'});
        }
        const issues=[...merged.values()],dismissed=[];
        // Only a quote that occurs nowhere but in host-printed lines is host formatting.
        const ownText=norm(hostText.reduce((t,h)=>t.split(h).join(' \n '),text));
        const hostOwned=i=>{const q=norm(i.quote);return !!q&&norm(text).includes(q)&&!` ${ownText} `.includes(` ${q} `);};
        let claimed=issues.filter(i=>BLOCKERS.includes(i.category)).filter(i=>{if(!hostOwned(i))return true;dismissed.push({...i,dismissal:'Host formatting the writer cannot change',ground:'host-formatting'});return false;});
        // Without evidence there is no speaker to check against; an invented quote of a real person is still caught
        // as unsupported-claim by the editor and verifier rules.
        if(source===null) claimed=claimed.filter(i=>{if(i.category!=='misattribution')return true;dismissed.push({...i,dismissal:'No evidence to attribute against',ground:'no-evidence'});return false;});
        const corroborated=claimed.filter(i=>i.by==='proofreader+editor');claimed=claimed.filter(i=>i.by!=='proofreader+editor');
        if(claimed.length) {
          const verdicts=await ask([{role:'system',content:verifyRubric},{role:'user',content:JSON.stringify({contentType,candidate:text,source,history,claims:claimed.map(({category,quote,problem},id)=>({id,category,quote,problem}))})}],options.verifier,c=>parseVerdicts(c,GROUNDS));
          // A claim the verifier does not answer keeps blocking: only an explicit dismissal clears it.
          const answers=new Map(verdicts.map(v=>[v.id,v])),kept=[];
          claimed.forEach((issue,id)=>{
            const v=answers.get(id);
            const allowed=LANGUAGE.includes(issue.category)?LANGUAGE_DISMISSAL:issue.category==='misattribution'?ATTRIBUTION_DISMISSAL:null;
            if(v?.real===false&&(!allowed||allowed.includes(v.ground))) {dismissed.push({...issue,dismissal:v.reason,ground:v.ground});return;}
            // The verifier may fix routing (an internal repeat is meaning, not repetition) but never escalate a repair into a replacement.
            const escalates=v&&REPLACE.includes(v.category)&&!REPLACE.includes(issue.category);
            kept.push(v&&v.real&&v.category!==issue.category&&!escalates?{...issue,category:v.category,claimed:issue.category}:issue);
          });
          claimed=kept;
        }
        claimed=[...corroborated,...claimed];
        // The profile's repetition check turns a field that repeats confirmed history into a host blocker.
        for(const f of profile.unique(fields,history)) claimed.push({category:'repetition',quote:f.quote,problem:f.problem,fix:f.fix,by:'host'});
        const blockers=claimed,suggestions=issues.filter(i=>SUGGESTIONS.includes(i.category));
        const decision=blockers.some(i=>REPLACE.includes(i.category))?'replace':blockers.length?'revise':'approve';
        const verdict={decision,...Object.fromEntries(dimensions.map(k=>[k,!blockers.some(i=>DIMENSION[i.category]===k)])),issues:blockers.map(formatIssue),blockers,suggestions,dismissed};
        const nextAction=advance(decision,text);
        await record({...current,kind:'editorial',text,sha256:hash(text),verdict,nextAction});
        const result={...verdict,nextAction};
        if(decision==='approve') approvals.set(result,hash(text));
        return result;
      } catch(error) {
        done=true;
        await record({...current,kind:'editorial',text,sha256:hash(text),error:'Editorial review unavailable or invalid',errorKind,nextAction:'stop'});
        throw error;
      }
    },
    async reject({text,issues,replace=false}) {
      ensureOpen();
      const current={attempt:++attempts,story,revision};
      const nextAction=advance(replace?'replace':'revise',text);
      try {await record({...current,kind:'validation',text,sha256:hash(text),issues,nextAction});}
      catch(error) {done=true;throw error;}
      return {issues,blockers:issues.map(problem=>({category:'format',quote:'',problem,fix:''})),suggestions:[],nextAction};
    }
  };
}
