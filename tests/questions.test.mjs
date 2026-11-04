import test from 'node:test';
import assert from 'node:assert/strict';
import {isAnswered,gradeAnswer} from '../src/lib/questions.ts';
const lines=[['Asha','Meet me at nine.'],['Ravi','Please bring two tickets.'],['Asha','Use the north entrance.'],['Ravi','I will arrive early.']];
const buildQuestions=(source)=>[
 {kind:'mcq',prompt:'Why do they choose the bus?',options:['Lower cost','Weather','Distance','Timing'],answer:'Lower cost'},
 {kind:'cloze',prompt:'Bring two _____.',answer:'tickets'},
 {kind:'truefalse',prompt:'They meet at the south entrance.',options:['True','False'],answer:'False'},
 {kind:'matching',prompt:'Match the tasks to the people responsible.',items:[{id:'a',label:'Bring tickets'},{id:'b',label:'Check entrance'}],options:['Asha','Ravi'],answer:source[2][0]+'|'+source.at(-1)[0]},
 {kind:'short',prompt:'Which entrance will they use?',answer:'North'},
 {kind:'ordering',prompt:'Order the planning decisions.',items:[{id:'3',label:'Confirm arrival'},{id:'1',label:'Set meeting time'},{id:'2',label:'Assign tickets'}],answer:'1|2|3'},
];
test('live answer sheets cover six distinct response types',()=>{const qs=buildQuestions(lines);assert.equal(new Set(qs.map(q=>q.kind)).size,6);assert.ok(qs.every(q=>!isAnswered(q,'')));assert.ok(qs.every(q=>gradeAnswer(q,q.answer)))});
test('partial and repeated turn selections do not qualify as complete',()=>{const q=buildQuestions(lines).find(q=>q.kind==='ordering');assert.equal(isAnswered(q,'1||3'),false);assert.equal(isAnswered(q,'1|1|3'),false);assert.equal(gradeAnswer(q,'3|2|1'),false);assert.equal(gradeAnswer(q,'1|2|3'),true)});
test('matching permits a repeated speaker but requires every row',()=>{const q=buildQuestions([lines[0],lines[1],lines[2],lines[0]]).find(q=>q.kind==='matching');assert.equal(isAnswered(q,'Asha|'),false);assert.equal(gradeAnswer(q,'Asha|Asha'),true)});
test('short answers accept harmless case and punctuation differences',()=>{const q=buildQuestions(lines).find(q=>q.kind==='short');assert.equal(gradeAnswer(q,' NORTH. '),true);assert.equal(gradeAnswer(q,'South'),false)});
test('Telugu cloze words retain combining marks',()=>{const q={kind:'cloze',prompt:'టికెట్లు _____.',answer:'తీసుకురా'};assert.equal(gradeAnswer(q,'తీసుకురా.'),true)});
