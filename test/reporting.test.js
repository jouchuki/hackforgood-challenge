import test from 'node:test';import assert from 'node:assert/strict';import{COUNTERS}from'../core/model.js';import{makeReport}from'../server/reports.js';
const counts=overrides=>({...Object.fromEntries(COUNTERS.map(k=>[k,0])),...overrides});
const bucket=(armId,c)=>({siteId:'demo',studyRevision:'study@1',armId,day:'2026-11-07',source:'simulation',counts:c});
test('unused zero buckets do not erase reportable aggregate populations',()=>{
 const state={sites:{},studies:{},buckets:{empty:bucket('unused',counts({})),a:bucket('A',counts({shown:100,help_selected:20}))}};
 const report=makeReport(state);assert.equal(report.totals.counts.shown,100);assert.equal(report.totals.counts.help_selected,20);assert.equal(report.rows.length,1);
});
test('a small nonzero group still hides complementary total and rate',()=>{
 const state={sites:{},studies:{},buckets:{a:bucket('A',counts({shown:100,help_selected:20})),b:bucket('B',counts({shown:100,help_selected:9}))}};
 const report=makeReport(state);assert.equal(report.totals.counts.help_selected,null);assert.equal(report.totals.rates.help_rate,null);
});
