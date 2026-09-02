const test=require('node:test');
const assert=require('node:assert/strict');

const server=require('../server/server.cjs');

test('backend scraper only accepts HTTPS Metro Sarapiquí URLs',()=>{
  assert.equal(server.isAllowedMetroUrl('https://metro.sarapiqui.go.cr/id/123'),true);
  assert.equal(server.isAllowedMetroUrl('http://metro.sarapiqui.go.cr/id/123'),false);
  assert.equal(server.isAllowedMetroUrl('https://evil.example/?u=metro.sarapiqui.go.cr'),false);
  assert.equal(server.isAllowedMetroUrl('not-a-url'),false);
});

test('htmlToText removes executable content but preserves record text',()=>{
  const text=server.htmlToText('<h1>Trámite VMSDC-2026-77</h1><script>alert(1)</script><p>Folio Real: 12345</p>');
  assert.match(text,/VMSDC-2026-77/);
  assert.match(text,/12345/);
  assert.doesNotMatch(text,/alert\(1\)/);
});

test('backend response helper enables cross-origin GET fallback for static frontends',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const src=fs.readFileSync(path.join(__dirname,'../server/server.cjs'),'utf8');
  assert.match(src,/access-control-allow-origin/i);
});

test('htmlToText preserves structural boundaries so labeled fields do not absorb neighbors',()=>{
  const html='<div>Solicitante: Juan Pérez</div><div>Folio Real: 4-00159830-000</div><table><tr><td>Plano:</td><td>A-1234567-2025</td></tr><tr><td>Distrito:</td><td>Horquetas</td></tr></table><div>Correo: juan@example.com</div>';
  const text=server.htmlToText(html);
  assert.match(text,/Solicitante: Juan Pérez\n+Folio Real:/);
  const record=require('../js/intake.js').extractCaseFields(text);
  assert.equal(record.solicitante,'Juan Pérez');
  assert.equal(record.folio,'4-00159830-000');
  assert.equal(record.plano,'A-1234567-2025');
  assert.equal(record.distrito,'Horquetas');
  assert.equal(record.correo,'juan@example.com');
});
