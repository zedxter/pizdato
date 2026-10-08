import {recentWisdoms} from './history.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const dimensions=['grammar','meaning','freshness','voice','grounding'];
export const editorOptions = {
  title:'pizdato-editor', temperature:0, maxTokens:6000,
  reasoning:{effort:'low',exclude:true},
  responseFormat:{type:'json_schema',json_schema:{name:'editorial_verdict',strict:true,schema:{
    type:'object',additionalProperties:false,required:['decision',...dimensions,'issues'],
    properties:{decision:{type:'string',enum:['approve','revise']},...Object.fromEntries(dimensions.map(k=>[k,{type:'boolean'}])),issues:{type:'array',items:{type:'string'}}}
  }}}
};
const hash=text=>createHash('sha256').update(text).digest('hex');
const approvals=new WeakMap();
export function assertApproved(text, approval) {
  if(!approval || approvals.get(approval)!==hash(text)) throw new Error('Valid approval for this exact payload required');
}
export function createGate({request, history, record=async()=>{}}) {
  let attempts=0;
  const rejectedCandidates=[];
  return {async review({text,wisdom,source=null}) {
    if(++attempts>3) throw new Error('Editorial candidate budget exhausted');
    try {
    const rubric=await readFile(new URL('./editor.md',import.meta.url),'utf8');
    const answer=await request([{role:'system',content:rubric},{role:'user',content:JSON.stringify({candidate:text,wisdom,history,source,rejectedCandidates})}]);
    if(answer.tool_calls?.length) throw new Error('Editorial review must not call tools');
    const verdict=JSON.parse(answer.content);
    const keys=['decision',...dimensions,'issues'].sort();
    if(!verdict || Object.keys(verdict).sort().join()!==keys.join() || !['approve','revise'].includes(verdict.decision) || dimensions.some(k=>typeof verdict[k]!=='boolean') || !Array.isArray(verdict.issues) || verdict.issues.some(i=>typeof i!=='string'||!i.trim())) throw new Error('Malformed editorial verdict');
    let passed=dimensions.every(k=>verdict[k]) && verdict.issues.length===0;
    if((verdict.decision==='approve')!==passed || (verdict.decision==='revise' && (dimensions.every(k=>verdict[k]) || !verdict.issues.length))) throw new Error('Contradictory editorial verdict');
    const normalize=s=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    if(recentWisdoms(history).some(previous=>normalize(previous)===normalize(wisdom))) {
      verdict.decision='revise';verdict.freshness=false;verdict.issues.push('Wisdom repeats a confirmed publication; choose a different subject.');passed=false;
    }
    await record({attempt:attempts,text,sha256:hash(text),verdict});
    if(!passed) rejectedCandidates.push({text,wisdom,issues:verdict.issues});
    const result={...verdict};
    if(passed) approvals.set(result,hash(text));
    return result;
    } catch(error) {
      await record({attempt:attempts,text,sha256:hash(text),error:'Editorial review unavailable or invalid'});
      throw error;
    }
  }};
}
