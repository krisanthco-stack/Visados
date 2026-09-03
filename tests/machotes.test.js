const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('definitive DOCX templates are the newly supplied machotes', () => {
  assert.equal(sha256(path.join(__dirname, '../assets/templates/MACHOTE_APROBACION_DEFINITIVO.docx')),
    '0a598478b0a9585cd0a2327f0205a1ff8fabb098d86fcd7a8f76b2c989b9ac7a');
  assert.equal(sha256(path.join(__dirname, '../assets/templates/MACHOTE_RECHAZO_DEFINITIVO.docx')),
    '7be4b0a3e129826e103ca6f8e3f0f80142d10a82d1379786b364f71b00e07e82');
});

test('rejection renderer has separate faithful first, continuation, and receipt backgrounds', () => {
  for (const name of ['OFICIAL_RECHAZO_FONDO.png', 'OFICIAL_RECHAZO_CONTINUACION.png', 'OFICIAL_RECHAZO_RECIBO.png']) {
    const p = path.join(__dirname, '../assets/templates', name);
    assert.ok(fs.existsSync(p), `${name} missing`);
    assert.ok(fs.statSync(p).size > 100000, `${name} unexpectedly small`);
  }
});
