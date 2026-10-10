// Loaded after fake-network.mjs: records the system prompt of every writer request (reviewer titles excluded).
import {appendFile} from 'node:fs/promises';
const inner=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{
 if(String(url).includes('openrouter.ai')&&process.env.TEST_SYSTEM&&!/^pizdato-(editor|proofreader|verifier)$/.test(opts.headers?.['X-Title']))await appendFile(process.env.TEST_SYSTEM,JSON.stringify(JSON.parse(opts.body).messages[0].content)+'\n');
 return inner(url,opts);
};
