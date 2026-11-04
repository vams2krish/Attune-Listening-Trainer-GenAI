import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuestions,isAnswered,gradeAnswer} from '../src/lib/questions.ts';
const lines=[['Asha','Meet me at nine.'],['Ravi','Please bring two tickets.'],['Asha','Use the north entrance.'],['Ravi','I will arrive early.']];
test('live answer sheets cover six distinct response types',()=>{const qs=buildQuestions(lines);assert.equal(new Set(qs.map(q=>q.kind)).size,6);assert.ok(qs.every(q=>!isAnswered(q,'')));assert.ok(qs.every(q=>gradeAnswer(q,q.answer)))});
test('partial and repeated turn selections do not qualify as complete',()=>{const q=buildQuestions(lines).find(q=>q.kind==='ordering');assert.equal(isAnswered(q,'1||3'),false);assert.equal(isAnswered(q,'1|1|3'),false);assert.equal(gradeAnswer(q,'3|2|1'),false);assert.equal(gradeAnswer(q,'1|2|3'),true)});
test('matching permits a repeated speaker but requires every row',()=>{const q=buildQuestions([lines[0],lines[1],lines[2],lines[0]]).find(q=>q.kind==='matching');assert.equal(isAnswered(q,'Asha|'),false);assert.equal(gradeAnswer(q,'Asha|Asha'),true)});
test('short answers accept harmless case and punctuation differences',()=>{const q=buildQuestions(lines).find(q=>q.kind==='short');assert.equal(gradeAnswer(q,' ASHA. '),true);assert.equal(gradeAnswer(q,'Ravi'),false)});
test('Telugu cloze words retain combining marks',()=>{const qs=buildQuestions([['రవి','రేపు కలుద్దాం.'],['సీత','టికెట్లు తీసుకురా.'],['రవి','ఉదయం రండి.'],['సీత','సరే వస్తాను.']]);const q=qs.find(q=>q.kind==='cloze');assert.equal(q.answer,'తీసుకురా');assert.equal(gradeAnswer(q,'తీసుకురా.'),true)});
