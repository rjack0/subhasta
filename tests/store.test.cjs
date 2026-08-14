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
    const sourcePath = path.join(os.tmpdir(), `clo-source-${Date.now()}.txt`)
    await fs.writeFile(sourcePath, 'worker extraction')
    const stagedFile = await store.stageEvidence(sourcePath)
    assert.equal(stagedFile.extractedText, 'worker extraction')
    assert.ok(stagedFile.originalTimestamps.mtime)
    await fs.rm(sourcePath, { force: true })

    await store.commitEvidence([staged])
    assert.equal(store.snapshot().evidence.at(-1).status, 'VERIFIED')
    assert.equal(store.health().completedJobs, 1)
    assert.equal(store.snapshot().extractedText.at(-1).evidenceId, store.snapshot().evidence.at(-1).id)
    const evidenceId = store.snapshot().evidence.at(-1).id
    await store.linkEvidence(evidenceId, 'fact', 'fact-001')
    assert.ok(store.snapshot().evidenceLinks.some((item) => item.evidenceId === evidenceId && item.targetId === 'fact-001'))
    await store.commitEvidence([staged])
    assert.equal(store.snapshot().evidence.filter((item) => item.hash === staged.hash).length, 1)
    assert.equal((await store.search('CLO store test'))[0].type, 'EVIDENCE')
    await store.deriveDeadlines()
    assert.equal(store.snapshot().deadlines.length, 2)

    await store.applyAction('create-proposition')
    await store.applyAction('verify-source')
    await store.applyAction('link-element')
    assert.equal(store.snapshot().law[0].status, 'VERIFIED')
    assert.ok(store.snapshot().propositionLinks.length >= 1)
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
    assert.ok(reopened.snapshot().audit.length >= 11)

    const sqlitePath = path.join(os.tmpdir(), `clo-store-${Date.now()}.sqlite3`)
    try {
      const sqliteStore = await createStore(sqlitePath)
      await sqliteStore.commitEvidence([sqliteStore.stageTextEvidence('sqlite persistence')])
      const sqliteReopened = await createStore(sqlitePath)
      assert.equal(sqliteReopened.snapshot().evidence.length, 4)
    } finally {
      await fs.rm(sqlitePath, { force: true })
    }
    console.log('CLO store test passed')
  } finally {
    await fs.rm(filePath, { force: true })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
