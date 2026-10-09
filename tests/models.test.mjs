// Every downloadable model is checked against its exact pinned size, so a wrong number in a catalog
// rejects every complete download. Needs the network: CHECK_MODEL_SOURCES=1 npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_CATALOG } from '../src/lib/modelCatalog.ts';
import { STT_MODELS, VAD_MODEL } from '../src/lib/voice/catalog.ts';

const files = [...MODEL_CATALOG.flatMap(m => [m, ...(m.projector ? [m.projector] : [])]), ...STT_MODELS, VAD_MODEL];

test('model downloads are pinned and declare a size', () => {
  for (const f of files) { assert.match(f.url, /\/resolve\/[0-9a-f]{40}\//, `${f.fileName} pinned revision`); assert.ok(Number.isInteger(f.bytes) && f.bytes > 0, f.fileName); }
});

test('declared sizes match the files on Hugging Face', { skip: !process.env.CHECK_MODEL_SOURCES }, async () => {
  for (const f of files) {
    const res = await fetch(f.url, { method: 'HEAD', redirect: 'manual' });
    assert.equal(Number(res.headers.get('x-linked-size')), f.bytes, f.fileName);
  }
});
