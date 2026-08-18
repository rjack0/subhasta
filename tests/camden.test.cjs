const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const fixture = require('../fixtures/camden-1540-vine.json')
const { createStore } = require('../electron/store.cjs')

async function main() {
  assert.equal(fixture.sheets['Unit Matrix'].rows.length, 287)
  assert.equal(fixture.sheets['Legal Fronts'].rows.length, 41)
  assert.equal(fixture.sheets['Evidence Registry'].rows.length, 32)
  assert.equal(fixture.sheets['Critical Clocks'].rows.length, 13)
  const storePath = path.join(os.tmpdir(), `clo-camden-fixture-${Date.now()}.json`)
  try {
    const store = await createStore(storePath)
    const data = store.snapshot()
    assert.equal(data.matter.name, '1540 N. Vine / Vinyl Hollywood')
    assert.equal(data.units.length, 287)
    assert.equal(data.legalClaims.length, 41)
    assert.equal(data.legalElements.length > 0, true)
    assert.equal(data.elementRequirements.length, 41)
    assert.equal(data.authorities.length, data.law.length)
    if (data.machine?.sourceWorkbook) {
      assert.equal(data.unitMatrixDetailed.length, 287)
      assert.equal(data.machineFronts.length, 12)
      assert.equal(data.machineAuthorities.length, 39)
      assert.equal(data.evidenceHolds.length, 15)
      assert.equal(data.activationSequence.length, 13)
      assert.equal(data.damagesModel.length, 9)
      assert.equal(data.sourceCatalog.length, 32)
      assert.equal(data.caseInputs.length, 13)
    }
    assert.ok(data.context.some((item) => item.type === 'WAR_ROOM_WORKBOOK'))
    assert.ok(data.evidence.some((item) => item.id === 'EV-001' && item.status === 'MISSING'))
    assert.ok(data.procedure.some((item) => item.id === 'CL-003' && item.status.includes('ACTIVE')))
    console.log('CLO Camden fixture test passed')
  } finally { await fs.rm(storePath, { force: true }) }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
