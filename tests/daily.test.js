const test=require('node:test');
const assert=require('node:assert/strict');
const daily=require('../js/daily.js');

const cases=[
 {id:1,creadoEn:'2026-09-02T10:00:00-06:00',resolucionConcluida:true,fechaResolucionConcluida:'2026-09-02T14:00:00-06:00',dictamen:'APROBADO'},
 {id:2,creadoEn:'2026-09-02T11:00:00-06:00',resolucionConcluida:true,gestionFecha:'2026-09-02T15:00:00-06:00',dictamen:'RECHAZADO'},
 {id:3,creadoEn:'2026-09-01T11:00:00-06:00',resolucionConcluida:false,dictamen:'PENDIENTE'}
];

test('daily grouping counts created and managed by requested local date key',()=>{
 const s=daily.dailyStats(cases,'2026-09-02');
 assert.deepEqual(s,{created:2,managed:2,approved:1,rejected:1});
 assert.deepEqual(daily.managedOn(cases,'2026-09-02').map(x=>x.id),[1,2]);
});

test('dateKey is nullable-safe',()=>{
 assert.equal(daily.dateKey(null),'');
 assert.equal(daily.dateKey('2026-09-02T01:02:03-06:00'),'2026-09-02');
});
