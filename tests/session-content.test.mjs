import test from 'node:test';
import assert from 'node:assert/strict';
import {SESSION_MINUTES,questionCount,chunkSpeech,introduceSpeakers,parseDialogue,formatDuration} from '../src/lib/session-content.ts';
import {validateAssessment} from '../src/lib/assessment-validation.ts';
test('all duration targets scale the question set',()=>{assert.deepEqual(SESSION_MINUTES,[2,5,10,15]);assert.deepEqual(SESSION_MINUTES.map(questionCount),[8,12,18,24]);assert.equal(formatDuration(59.8),'1:00')});
test('long dialogue is partitioned without losing turns or changing voice order',()=>{const inputs=Array.from({length:90},(_,i)=>({text:`Turn ${i} `+'meaningful detail '.repeat(25),voice_id:`voice-${i%3}`}));const chunks=chunkSpeech(inputs);assert.ok(chunks.length>10);assert.deepEqual(chunks.flat(),inputs);assert.ok(chunks.every(c=>c.reduce((n,i)=>n+i.text.length,0)<=1800&&c.length<=30))});
test('speakers identify themselves and the scenario is spoken once',()=>{const lines=[['మాయ','రేపు రండి.'],['రవి','సరే వస్తాను.'],['మాయ','పది గంటలకు.'],['రవి','అలాగే.']];const spoken=introduceSpeakers(lines,'te','ఒక సమావేశం.');assert.match(spoken[0][1],/మాయ/);assert.match(spoken[1][1],/రవి/);assert.equal(spoken[2][1],lines[2][1]);assert.equal(spoken[3][1],lines[3][1]);assert.match(spoken[0][1],/ఒక సమావేశం/)});
test('written long conversations are accepted but malformed turns are rejected',()=>{const dialogue=Array.from({length:100},(_,i)=>`${i%2?'Ravi':'Asha'}: We should compare the alternatives before deciding.`).join('\n');assert.equal(parseDialogue(dialogue).length,100);assert.throws(()=>parseDialogue('One line with no speaker.'));assert.throws(()=>chunkSpeech([{text:'x'.repeat(1801),voice_id:'voice'}]))});
const lines=[['Asha','The tickets cost twenty dollars.'],['Ravi','That exceeds our budget. Let us take the bus.'],['Asha','The bus leaves at ten.'],['Ravi','Meet at Central station at nine thirty.']];
const base={prompt:'Why do they change their travel plan?',answer:'Budget',options:[],category:'Reasoning',explanation:'Ravi says the train exceeds the budget.',items:[],acceptedAnswers:[],evidence:[1,2]};
const valid=[{...base,kind:'mcq',options:['Budget','Weather','Distance','Timing']},{...base,kind:'cloze',prompt:'Complete the cost: tickets cost ____ dollars.',answer:'twenty'},{...base,kind:'truefalse',options:['True','False'],answer:'True'},{...base,kind:'matching',items:[{id:'a',label:'Train'},{id:'b',label:'Bus'}],options:['Too expensive','Within budget'],answer:'Too expensive|Within budget'},{...base,kind:'short',answer:'Central station'},{...base,kind:'ordering',items:[{id:'c',label:'Agree where to meet'},{id:'a',label:'Discuss train price'},{id:'b',label:'Choose the bus'}],answer:'a|b|c'}];
test('semantic assessments require mixed types and transcript evidence',()=>{assert.equal(validateAssessment(valid,lines).length,6);assert.throws(()=>validateAssessment(valid.map(q=>({...q,evidence:[99]})),lines));assert.throws(()=>validateAssessment(valid.slice(0,5),lines));assert.throws(()=>validateAssessment(valid.map((q,i)=>i? q:{...q,prompt:'Who said the first sentence?'}),lines));assert.throws(()=>validateAssessment(valid.map((q,i)=>i? q:{...q,options:['Budget','Budget','Distance','Timing']}),lines))});


test('questions follow the point where all required evidence has been heard', async () => {
 const {orderQuestions}=await import('../src/lib/assessment-validation.ts');
 const questions=[{prompt:'Final inference',evidence:[2,12]},{prompt:'Earlier detail',evidence:[3]},{prompt:'Change of plan',evidence:[4,8]}];
 assert.deepEqual(orderQuestions(questions).map(q=>q.prompt),['Earlier detail','Change of plan','Final inference']);
 assert.equal(questions[0].prompt,'Final inference');
});

test('all six dialogue names receive distinct voices and keep explicit bindings after reordering', async () => {
 const {speakerNamesFromDialogue,resolveSpeakerVoices}=await import('../src/lib/session-content.ts');
 const names=speakerNamesFromDialogue('Asha: Hello\nRavi: Hi\nMeera: Welcome\nKabir: Thanks\nNila: Good morning\nDev: Ready\nAsha: Let us begin');
 assert.deepEqual(names,['Asha','Ravi','Meera','Kabir','Nila','Dev']);
 const available=['v1','v2','v3','v4','v5','v6'];
 const assigned=resolveSpeakerVoices(names,available,{Dev:'v2',Asha:'v6'});
 assert.equal(new Set(Object.values(assigned)).size,6);
 assert.equal(assigned.Dev,'v2');assert.equal(assigned.Asha,'v6');
 const reordered=resolveSpeakerVoices([...names].reverse(),available,assigned);
 for(const name of names)assert.equal(reordered[name],assigned[name]);
 assert.deepEqual(speakerNamesFromDialogue('Incomplete line\n  : text\nRavi: Hello'),['Ravi']);
});
