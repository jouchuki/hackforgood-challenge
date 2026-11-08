import test from 'node:test';
import assert from 'node:assert/strict';
import {rebalanceWeights,allocationPreset} from '../core/allocation.js';
import {interventionPreset,createStudyPreset,MESSAGE_PRESETS} from '../core/presets.js';

test('allocation remains an integer100% with every variant represented while dragging any arm',()=>{
 for(const n of [2,3,4])for(const index of Array.from({length:n},(_,i)=>i))for(const requested of [-100,0,1,17,33,50,65,99,100,500]){
  const original=allocationPreset(n,'equal');const result=rebalanceWeights(original,index,requested);
  assert.equal(result.reduce((sum,value)=>sum+value,0),100);assert.ok(result.every(value=>Number.isInteger(value)&&value>=1));
  assert.equal(result[index],Math.max(1,Math.min(101-n,Math.round(requested))));assert.deepEqual(original,allocationPreset(n,'equal'));
 }
 assert.deepEqual(rebalanceWeights([50,50],0,65),[65,35]);assert.deepEqual(rebalanceWeights([65,35],1,20),[80,20]);
 for(const n of [2,3,4])for(const preset of ['equal','70-30','90-10'])assert.equal(allocationPreset(n,preset).reduce((a,b)=>a+b),100);
});

test('message presets supply visible first-stagecopy in bothlanguages, not only skipped reflection fields',()=>{
 const legal=interventionPreset('consequences');assert.equal(legal.order[0],'education');assert.equal(legal.en.educationTitle,'Understand the legal consequences.');assert.equal(legal.nl.educationTitle,'Begrijp de juridische gevolgen.');assert.equal(legal.legal,true);
 const headlines=new Set();for(const preset of MESSAGE_PRESETS){const value=interventionPreset(preset.id);for(const language of ['en','nl']){assert.ok(value[language].body);assert.ok(value[language].educationBody);assert.ok(value[language].helpBody);}headlines.add(value.en[value.order[0]==='education'?'educationTitle':'title']);}assert.equal(headlines.size,MESSAGE_PRESETS.length);
 const a=interventionPreset('harm');a.en.title='changed';assert.notEqual(interventionPreset('harm').en.title,'changed');
});

test('study presets create complete editable comparisons with truthful variant weights',()=>{
 for(const id of ['reflection','tone','legal']){const study=createStudyPreset(id,'My study');assert.equal(study.name,'My study');assert.equal(study.arms.length,2);assert.equal(study.arms.reduce((sum,arm)=>sum+arm.weight,0),100);assert.deepEqual(study.languages,['en','nl']);}
 const tone=createStudyPreset('tone');assert.notEqual(tone.arms[0].intervention.en.title,tone.arms[1].intervention.en.title);
});

test('experience comparisons are visually and structurally distinct while preserving valid allocations',async()=>{
 const {experiencePreset,EXPERIENCE_PRESETS}=await import('../core/presets.js');const {intervention}=await import('../server/validation.js');
 const layouts=EXPERIENCE_PRESETS.map(p=>experiencePreset(p.id).layout);assert.deepEqual(layouts,['plain','reading','meaning']);
 for(const p of EXPERIENCE_PRESETS){const model=experiencePreset(p.id);assert.deepEqual(intervention(model),model);assert.ok(model.en.educationBody);assert.ok(model.nl.educationBody);}
 const study=createStudyPreset('experiences');assert.equal(study.arms.length,3);assert.deepEqual(study.arms.map(a=>a.weight),[34,33,33]);assert.deepEqual(study.arms.map(a=>a.intervention.layout),layouts);
 const plain=experiencePreset('plain');assert.deepEqual(plain.order,['education','support']);assert.equal(plain.motion.enabled,false);
 const invalid={...plain,order:['reflection','education','support']};assert.throws(()=>intervention(invalid));
});
