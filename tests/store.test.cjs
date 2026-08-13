const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { createStore } = require('../electron/store.cjs')

async function main() {
  const filePath = path.join(os.tmpdir(), `clo-store-${Date.now()}.json`)
  try {
    const store = await createStore(filePath)
    const initial = store.snapshot()
    assert.equal(initial.version, 2)
    for (const name of ['evidence', 'extractedText', 'propositions', 'paragraphProvenance', 'audit']) assert.ok(Array.isArray(initial[name]), `${name} collection missing`)

    const text = 'CLO store test'
    const staged = store.stageTextEvidence(text)
    const digest = crypto.createHash('sha256').update(text).digest('hex')
    assert.equal(staged.hash, `sha256:${digest}`)
    assert.equal(staged.status, 'STAGED')

    await store.commitEvidence([staged])
    assert.equal(store.snapshot().evidence.at(-1).status, 'VERIFIED')
    assert.equal(store.snapshot().extractedText.at(-1).evidenceId, store.snapshot().evidence.at(-1).id)

    await store.applyAction('create-proposition')
    await store.applyAction('build-section')
    await store.applyAction('verify-citations')
    await store.applyAction('validate-filing')
    assert.equal(store.snapshot().drafts[0].validation, 'FAILED')
    await assert.rejects(() => store.applyAction('export-filing'), /validation has not passed/)

    await store.update({ elements: store.snapshot().elements.map((element) => ({ ...element, status: 'COMPLETE', proof: 100, missing: null })) })
    await store.applyAction('validate-filing')
    assert.equal(store.snapshot().drafts[0].validation, 'PASSED')
    await store.applyAction('export-filing')
    assert.ok(store.snapshot().drafts[0].exportedAt)

    const reopened = await createStore(filePath)
    assert.equal(reopened.snapshot().evidence.at(-1).hash, staged.hash)
    assert.ok(reopened.snapshot().audit.length >= 8)
    console.log('CLO store test passed')
  } finally {
    await fs.rm(filePath, { force: true })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
