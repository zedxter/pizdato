import {recentWisdoms} from './history.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const dimensions=['grammar','meaning','freshness','voice','grounding'];
export const editorOptions = {
  title:'pizdato-editor', temperature:0, maxTokens:12000,
  reasoning:{effort:'low',exclude:true},
  responseFormat:{type:'json_schema',json_schema:{name:'editorial_verdict',strict:true,schema:{
    type:'object',additionalProperties:false,required:['decision',...dimensions,'issues'],
    properties:{decision:{type:'string',enum:['approve','revise','replace']},...Object.fromEntries(dimensions.map(k=>[k,{type:'boolean'}])),issues:{type:'array',items:{type:'string'}}}
  }}}
};
const hash=text=>createHash('sha256').update(text).digest('hex');
const approvals=new WeakMap();
export function assertApproved(text, approval) {
  if(!approval || approvals.get(approval)!==hash(text)) throw new Error('Valid approval for this exact payload required');
}
export function createGate({request, history, record=async()=>{},policy='bounded',initial=null}) {
  const persistent=policy==='persistent-evening';
  let attempts=initial?.attempts||0, story=initial?.story||1, revision=initial?.revision||0, done=false;
  const rejectedCandidates=initial?.rejectedCandidates?.slice(-6)||[];
  const ensureOpen=()=>{if(done) throw new Error('Editorial budget is terminal');};
  const advance=decision=>{
    if(decision==='approve') {done=true;return 'publish';}
    if(decision==='replace'||(!persistent&&revision===2)) {
      if(!persistent&&story===3) {done=true;return 'stop';}
      story++;revision=0;return 'replace';
    }
    revision++;return 'repair';
  };
  return {
    get state() {return {story,revision,done};},
    snapshot() {return {attempts,story,revision,rejectedCandidates:rejectedCandidates.slice(-6)};},
    async review({text,wisdom,source=null}) {
      ensureOpen();
      const current={attempt:++attempts,story,revision};
      let errorKind='Editor transport failed';
      try {
        const rubric=await readFile(new URL('./editor.md',import.meta.url),'utf8');
        const answer=await request([{role:'system',content:rubric},{role:'user',content:JSON.stringify({contentType:source===null?'everyday-observation':'source-based-post',candidate:text,wisdom,history,source,current,rejectedCandidates})}]);
        if(answer.tool_calls?.length) throw new Error('Editorial review must not call tools');
        errorKind='Editor returned invalid JSON';
        const verdict=JSON.parse(answer.content);
        errorKind='Editor returned malformed or contradictory verdict';
        const keys=['decision',...dimensions,'issues'].sort();
        if(!verdict || Object.keys(verdict).sort().join()!==keys.join() || !['approve','revise','replace'].includes(verdict.decision) || dimensions.some(k=>typeof verdict[k]!=='boolean') || !Array.isArray(verdict.issues) || verdict.issues.some(i=>typeof i!=='string'||!i.trim())) throw new Error('Malformed editorial verdict');
        const passed=dimensions.every(k=>verdict[k]) && verdict.issues.length===0;
        if((verdict.decision==='approve')!==passed || (verdict.decision!=='approve' && (dimensions.every(k=>verdict[k]) || !verdict.issues.length)) || (verdict.decision==='replace'&&verdict.freshness&&verdict.grounding)) throw new Error('Contradictory editorial verdict');
        const normalize=s=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
        if(recentWisdoms(history).some(previous=>normalize(previous)===normalize(wisdom))) {
          verdict.decision='replace';verdict.freshness=false;verdict.issues.push('Wisdom repeats a confirmed publication; choose a different subject.');
        }
        if(!verdict.freshness) verdict.decision='replace';
        const nextAction=advance(verdict.decision);
        await record({...current,kind:'editorial',text,sha256:hash(text),verdict,nextAction});
        if(verdict.decision!=='approve') rejectedCandidates.push({story:current.story,text,wisdom,issues:verdict.issues});
        const result={...verdict,nextAction};
        if(verdict.decision==='approve') approvals.set(result,hash(text));
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
      const nextAction=advance(replace?'replace':'revise');
      try {
        await record({...current,kind:'validation',text,sha256:hash(text),issues,nextAction});
        rejectedCandidates.push({story:current.story,text,issues});
      } catch(error) {done=true;throw error;}
      return {issues,nextAction};
    }
  };
}
