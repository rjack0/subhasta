const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
const collectionNames = ['people', 'organizations', 'properties', 'units', 'events', 'incidents', 'workOrders', 'vendors', 'telemetry', 'notices', 'extractedText', 'authorities', 'propositions', 'legalClaims', 'legalElements', 'elementRequirements', 'evidenceLinks', 'propositionLinks', 'contradictions', 'evidenceGaps', 'proceduralEvents', 'courtFilings', 'docketEntries', 'deadlines', 'paragraphProvenance', 'judgeProfiles', 'opponentProfiles', 'agentJobs', 'facts', 'evidence', 'law', 'claims', 'elements', 'procedure', 'drafts', 'context', 'audit']

function normalize(data) {
  const normalized = { ...data, version: Math.max(Number(data.version || 0), 2) }
  for (const name of collectionNames) if (!Array.isArray(normalized[name])) normalized[name] = []
  normalized.audit = normalized.audit || []
  return normalized
}

function findObject(data, type, objectId) {
  const collection = { fact: 'facts', evidence: 'evidence', law: 'law', claim: 'claims', element: 'elements', procedure: 'procedure', draft: 'drafts', proposition: 'propositions', deadline: 'deadlines', person: 'people', event: 'events' }[type]
  return collection ? data[collection].find((item) => item.id === objectId) : null
}

function readSqlite(filePath) {
  const result = spawnSync('sqlite3', [filePath, 'SELECT payload FROM case_state WHERE id = 1;'], { encoding: 'utf8' })
  if (result.status !== 0 || !result.stdout.trim()) return null
  return JSON.parse(result.stdout.trim())
}

function writeSqlite(filePath, data) {
  const payload = JSON.stringify(data).replaceAll("'", "''")
  const sql = `CREATE TABLE IF NOT EXISTS case_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL); INSERT OR REPLACE INTO case_state (id, payload) VALUES (1, '${payload}');`
  const result = spawnSync('sqlite3', [filePath], { input: sql, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || 'SQLite persistence failed')
}

const seed = () => ({
  version: 2,
  matter: { id: 'matter-001', name: 'Northstar Housing Matter', subtitle: 'Los Angeles · active working set', status: 'ACTIVE' },
  people: [], organizations: [], properties: [], units: [], events: [], incidents: [], workOrders: [], vendors: [], telemetry: [], notices: [], extractedText: [], authorities: [], propositions: [], legalClaims: [], legalElements: [], elementRequirements: [], evidenceLinks: [], propositionLinks: [], contradictions: [], evidenceGaps: [], proceduralEvents: [], courtFilings: [], docketEntries: [], deadlines: [], paragraphProvenance: [], judgeProfiles: [], opponentProfiles: [], agentJobs: [],
  facts: [
    { id: 'fact-001', title: 'Recurring water intrusion', detail: 'Reported across three winter seasons.', status: 'FACT', source: 'Incident log / 2024-02-11' },
    { id: 'fact-002', title: 'Notice reached owner', detail: 'Written notice is linked to a dated work order.', status: 'VERIFIED', source: 'Email export / 2024-04-02' },
    { id: 'fact-003', title: 'Inspection record missing', detail: 'No signed inspection report in the current working set.', status: 'HYPOTHESIS', source: 'Gap analysis' }
  ],
  evidence: [
    { id: 'ev-001', name: 'Winter incident chronology.pdf', type: 'PDF', hash: 'sha256:seed-001', source: 'Seeded fixture', status: 'VERIFIED', links: ['fact-001', 'element-001'], createdAt: now() },
    { id: 'ev-002', name: 'Owner notice email.eml', type: 'EMAIL', hash: 'sha256:seed-002', source: 'Seeded fixture', status: 'VERIFIED', links: ['fact-002', 'element-002'], createdAt: now() },
    { id: 'ev-003', name: 'LAHD inspection record', type: 'MISSING', hash: null, source: 'Gap', status: 'HYPOTHESIS', links: ['element-003'], createdAt: now() }
  ],
  law: [
    { id: 'law-001', title: 'Civil Code §1942.4', jurisdiction: 'CALIFORNIA', status: 'VERIFIED', text: 'A landlord may not collect rent or issue certain notices while specified conditions remain unresolved.', proposition: 'Unresolved statutory conditions can affect rent collection and notice remedies.', links: ['element-002'] },
    { id: 'law-002', title: 'Local housing code', jurisdiction: 'LOS ANGELES', status: 'HYPOTHESIS', text: 'Local inspection and notice requirements remain to be confirmed from the controlling source.', proposition: null, links: ['element-003'] }
  ],
  claims: [{ id: 'claim-001', title: 'Habitability / notice theory', status: 'INCOMPLETE', proof: 66, elements: ['element-001', 'element-002', 'element-003'] }],
  elements: [
    { id: 'element-001', title: 'Condition existed', status: 'COMPLETE', proof: 100, missing: null, links: ['fact-001', 'ev-001'] },
    { id: 'element-002', title: 'Required notice', status: 'COMPLETE', proof: 100, missing: null, links: ['fact-002', 'ev-002', 'law-001'] },
    { id: 'element-003', title: 'Required inspection / remedy path', status: 'INCOMPLETE', proof: 33, missing: 'Obtain signed inspection record', links: ['ev-003', 'law-002'] }
  ],
  procedure: [
    { id: 'proc-001', date: '2026-08-20', title: 'Service deadline', type: 'DEADLINE', status: 'PENDING', source: 'Procedure rule fixture' },
    { id: 'proc-002', date: '2026-09-01', title: 'Responsive filing window', type: 'DEADLINE', status: 'PENDING', source: 'Derived from service deadline' }
  ],
  drafts: [{ id: 'draft-001', title: 'Verified demand section', status: 'DRAFT', paragraphs: [{ id: 'para-001', text: 'The record supports a recurring condition and documented notice.', provenance: ['fact-001', 'fact-002', 'ev-001', 'ev-002'], status: 'SUPPORTED' }] }],
  strategy: { judge: { confidence: 0.62, sourceUniverse: 'Local procedural fixture', observations: ['Procedure-sensitive review', 'Evidence gaps reduce certainty'] }, opponent: { confidence: 0.48, sourceUniverse: 'Pleadings and notice fixture', observations: ['Likely challenge: missing inspection record'] } },
  context: [],
  audit: [{ id: id('audit'), at: now(), action: 'SEEDED MATTER', object: 'matter-001' }]
})

async function createStore(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const sqlite = filePath.endsWith('.sqlite3')
  let data
  try {
    const persisted = sqlite ? readSqlite(filePath) : JSON.parse(await fs.readFile(filePath, 'utf8'))
    data = normalize(persisted)
    if (sqlite) writeSqlite(filePath, data); else await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  } catch {
    data = seed()
    if (sqlite) writeSqlite(filePath, data); else await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  }
  return {
    snapshot: () => data,
    async persist() { if (sqlite) writeSqlite(filePath, data); else await fs.writeFile(filePath, JSON.stringify(data, null, 2)) },
    async update(patch) { data = { ...data, ...patch }; data.audit.push({ id: id('audit'), at: now(), action: 'UPDATE', object: 'matter-001' }); await this.persist(); return data },
    async applyAction(action, payload = {}) {
      if (action === 'create-proposition') {
        const authorityId = payload.authorityId || data.law[0]?.id
        const proposition = { id: id('prop'), title: payload.title || 'Statutory condition proposition', text: payload.text || data.law[0]?.proposition || 'Proposition requires source verification.', authorityId, status: 'PENDING', source: 'Local authority fixture', createdAt: now() }
        data.propositions.push(proposition)
        data.law = data.law.map((item) => item.id === authorityId ? { ...item, proposition: proposition.text, propositionId: proposition.id } : item)
        data.audit.push({ id: id('audit'), at: now(), action: 'CREATE PROPOSITION', object: proposition.id })
      } else if (action === 'verify-source') {
        const authority = data.law.find((item) => item.id === payload.authorityId) || data.law[0]
        if (authority) authority.status = 'VERIFIED'
        data.audit.push({ id: id('audit'), at: now(), action: 'VERIFY SOURCE', object: authority?.id || 'none' })
      } else if (action === 'link-element') {
        const authority = data.law.find((item) => item.id === payload.authorityId) || data.law[0]
        const element = data.elements.find((item) => item.id === payload.elementId) || data.elements[0]
        if (!authority || !element) throw new Error('Law element link target does not exist')
        const link = { id: id('prop-link'), propositionId: authority.propositionId || authority.id, elementId: element.id, createdAt: now() }
        data.propositionLinks.push(link)
        authority.links = Array.from(new Set([...(authority.links || []), element.id]))
        element.links = Array.from(new Set([...(element.links || []), authority.id]))
        data.audit.push({ id: id('audit'), at: now(), action: 'LINK ELEMENT', object: link.id })
      } else if (action === 'build-section') {
        const draft = data.drafts[0]
        if (draft) {
          draft.paragraphs.push({ id: id('para'), text: 'The current record connects the verified condition, notice, and governing authority.', provenance: ['fact-001', 'fact-002', 'ev-001', 'ev-002', 'law-001'], status: 'SUPPORTED', createdAt: now() })
          draft.status = 'BUILT'
          data.paragraphProvenance.push({ id: id('prov'), paragraphId: draft.paragraphs.at(-1).id, sources: draft.paragraphs.at(-1).provenance, createdAt: now() })
        }
        data.audit.push({ id: id('audit'), at: now(), action: 'BUILD SECTION', object: data.drafts[0]?.id || 'none' })
      } else if (action === 'verify-citations') {
        if (data.drafts[0]) data.drafts[0].citationStatus = 'VERIFIED'
        data.audit.push({ id: id('audit'), at: now(), action: 'VERIFY CITATIONS', object: data.drafts[0]?.id || 'none' })
      } else if (action === 'validate-filing') {
        const complete = data.elements.every((item) => item.status === 'COMPLETE')
        if (data.drafts[0]) data.drafts[0].validation = complete ? 'PASSED' : 'FAILED'
        data.audit.push({ id: id('audit'), at: now(), action: complete ? 'VALIDATE FILING' : 'VALIDATE FILING FAILED', object: data.drafts[0]?.id || 'none' })
      } else if (action === 'export-filing') {
        if (data.drafts[0]?.validation !== 'PASSED') throw new Error('Filing validation has not passed')
        data.drafts[0].exportedAt = now()
        data.audit.push({ id: id('audit'), at: now(), action: 'EXPORT FILING', object: data.drafts[0].id })
      } else if (action === 'open-action') {
        const target = data.evidence.find((item) => item.id === payload.id)
        if (target) target.status = target.status === 'HYPOTHESIS' ? 'PENDING' : target.status
        data.audit.push({ id: id('audit'), at: now(), action: 'OPEN ACTION', object: payload.id || 'none' })
      } else {
        throw new Error(`Unknown case action: ${action}`)
      }
      await this.persist()
      return data
    },
    search(query) {
      const needle = String(query || '').trim().toLowerCase()
      if (!needle) return []
      const groups = { LAW: 'law', CLAIMS: 'claims', EVIDENCE: 'evidence', DRAFTS: 'drafts', PEOPLE: 'people', EVENTS: 'events', FILINGS: 'courtFilings', DEADLINES: 'deadlines' }
      return Object.entries(groups).flatMap(([type, collection]) => data[collection].filter((item) => JSON.stringify(item).toLowerCase().includes(needle)).slice(0, 20).map((item) => ({ id: item.id, type, name: item.title || item.name || item.filename || item.id, status: item.status || 'ACTIVE', source: item.source || item.provenance || 'Matter store', matterId: data.matter.id })))
    },
    async linkEvidence(evidenceId, targetType, targetId) {
      const evidence = data.evidence.find((item) => item.id === evidenceId)
      if (!evidence || !findObject(data, targetType, targetId)) throw new Error('Evidence link target does not exist')
      const link = { id: id('link'), evidenceId, targetType, targetId, createdAt: now() }
      if (!data.evidenceLinks.some((item) => item.evidenceId === evidenceId && item.targetType === targetType && item.targetId === targetId)) data.evidenceLinks.push(link)
      evidence.links = Array.from(new Set([...(evidence.links || []), targetId]))
      evidence.linkedElements = targetType === 'element' ? Array.from(new Set([...(evidence.linkedElements || []), targetId])) : evidence.linkedElements || []
      data.audit.push({ id: id('audit'), at: now(), action: 'LINK EVIDENCE', object: link.id })
      await this.persist()
      return data
    },
    async deriveDeadlines() {
      const derived = data.procedure.filter((item) => item.type === 'DEADLINE').map((item) => ({ id: `deadline-${item.id}`, title: item.title, date: item.date, status: item.status, source: item.source, procedureId: item.id, consequence: item.title.toLowerCase().includes('service') ? 'HIGH' : 'MEDIUM', createdAt: item.createdAt || null }))
      if (JSON.stringify(data.deadlines) === JSON.stringify(derived)) return data
      data.deadlines = derived
      data.audit.push({ id: id('audit'), at: now(), action: 'DERIVE DEADLINES', object: data.deadlines.map((item) => item.id).join(',') })
      await this.persist()
      return data
    },
    async stageEvidence(filePathToRead) {
      const bytes = await fs.readFile(filePathToRead)
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.html', '.xml'])
      const extractedText = textExtensions.has(path.extname(filePathToRead).toLowerCase()) ? bytes.toString('utf8') : null
      return { id: id('stage'), name: path.basename(filePathToRead), originalPath: filePathToRead, bytes: bytes.length, hash: `sha256:${hash}`, type: path.extname(filePathToRead).slice(1).toUpperCase() || 'FILE', source: 'Local import', status: 'STAGED', extractedText, custodian: null, originalTimestamps: null }
    },
    stageTextEvidence(text) {
      const bytes = Buffer.from(text, 'utf8')
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      return { id: id('stage'), name: 'Clipboard text', originalPath: null, bytes: bytes.length, hash: `sha256:${hash}`, type: 'TEXT', source: 'Clipboard import', status: 'STAGED', extractedText: text, custodian: null, originalTimestamps: null }
    },
    async commitEvidence(staged) {
      const committed = staged.filter((item) => !data.evidence.some((existing) => existing.hash && existing.hash === item.hash)).map((item) => ({ ...item, id: id('ev'), status: 'VERIFIED', links: [], linkedEvents: [], linkedPeople: [], linkedSystems: [], linkedElements: [], corroboration: 'UNREVIEWED', contradiction: null, importedAt: now(), createdAt: now() }))
      const duplicates = staged.filter((item) => data.evidence.some((existing) => existing.hash && existing.hash === item.hash)).map((item) => ({ ...item, status: 'DUPLICATE' }))
      data.extractedText.push(...committed.filter((item) => item.extractedText).map((item) => ({ id: id('text'), evidenceId: item.id, text: item.extractedText, createdAt: now() })))
      data.evidence.push(...committed); data.audit.push({ id: id('audit'), at: now(), action: duplicates.length ? 'COMMIT EVIDENCE / DUPLICATE DETECTED' : 'COMMIT EVIDENCE', object: committed.map((item) => item.id).join(', ') || duplicates.map((item) => item.hash).join(', ') }); await this.persist(); return data
    },
    async addContext(record) { data.context.push({ ...record, id: id('ctx'), createdAt: now(), status: 'CONTEXT_ONLY' }); await this.persist(); return data }
  }
}

module.exports = { createStore }
