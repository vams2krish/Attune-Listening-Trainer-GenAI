import test from 'node:test';
import assert from 'node:assert/strict';
import {lowCostModelConfig,DEFAULT_OPENROUTER_MODEL} from '../lib/model-policy.ts';
test('expensive or unknown model overrides cannot bypass the low-cost default',()=>{
 for(const id of [undefined,'google/gemini-3.8-flash','openai/gpt-5','unlisted/model'])assert.equal(lowCostModelConfig(id).model,DEFAULT_OPENROUTER_MODEL);
 assert.equal(lowCostModelConfig('qwen/qwen3.8-flash').model,'qwen/qwen3.8-flash');
});
test('every routed request retains hard provider rate limits and strict parameter support',()=>{
 const {provider}=lowCostModelConfig();
 assert.equal(provider.sort,'price');assert.equal(provider.require_parameters,true);
 assert.ok(provider.max_price.prompt<=0.15);assert.ok(provider.max_price.completion<=0.60);
 provider.max_price.completion=99;
 assert.ok(lowCostModelConfig().provider.max_price.completion<=0.60);
});
