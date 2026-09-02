const test=require('node:test');
const assert=require('node:assert/strict');
const attachments=require('../js/attachments.js');

test('attachment keys are deterministic enough and nullable-safe',()=>{
 const k=attachments.makeKey(7,'Plano A.pdf','2026-09-02T10:00:00.000Z');
 assert.equal(k,'7|2026-09-02T10:00:00.000Z|Plano A.pdf');
 assert.equal(attachments.makeKey(null,'',''),'0||archivo');
});
