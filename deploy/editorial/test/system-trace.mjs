// Loaded after fake-network.mjs: records the system prompt of every writer request (reviewer prompts excluded by their headings).
import {appendFile} from 'node:fs/promises';
const inner=globalThis.fetch;
const REVIEWER=/^# (Russian proofreading|Defect verification|Public message editorial review)/;
globalThis.fetch=async(url,opts={})=>{
 if(String(url).startsWith('https://inference-api.nousresearch.com/')&&process.env.TEST_SYSTEM){const system=JSON.parse(opts.body).messages[0].content;if(!REVIEWER.test(system))await appendFile(process.env.TEST_SYSTEM,JSON.stringify(system)+'\n');}
 return inner(url,opts);
};
