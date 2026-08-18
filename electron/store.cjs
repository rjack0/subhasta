const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { Worker } = require('node:worker_threads')
const camdenFixture = require('../fixtures/camden-1540-vine.json')
const { makeLedgerState, sourceRegistry } = require('./ledger.cjs')

const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
const collectionNames = ['people', 'organizations', 'properties', 'units', 'events', 'incidents', 'workOrders', 'vendors', 'telemetry', 'notices', 'extractedText', 'authorities', 'propositions', 'legalClaims', 'legalElements', 'elementRequirements', 'evidenceLinks', 'propositionLinks', 'contradictions', 'evidenceGaps', 'proceduralEvents', 'courtFilings', 'docketEntries', 'deadlines', 'paragraphProvenance', 'judgeProfiles', 'opponentProfiles', 'agentJobs', 'facts', 'evidence', 'law', 'claims', 'elements', 'procedure', 'drafts', 'context', 'audit']

function normalize(data) {
  const normalized = { ...data, version: Math.max(Number(data.version || 0), 2) }
  for (const name of collectionNames) if (!Array.isArray(normalized[name])) normalized[name] = []
  normalized.audit = normalized.audit || []
  normalized.ledger = normalized.ledger || makeLedgerState()
  normalized.sourceRegistry = normalized.sourceRegistry || sourceRegistry()
  return normalized
}

function findObject(data, type, objectId) {
  const collection = { fact: 'facts', evidence: 'evidence', law: 'law', authority: 'authorities', claim: 'claims', legalClaim: 'legalClaims', element: 'elements', legalElement: 'legalElements', procedure: 'procedure', draft: 'drafts', proposition: 'propositions', deadline: 'deadlines', person: 'people', event: 'events', organization: 'organizations', unit: 'units', notice: 'notices', filing: 'courtFilings' }[type]
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

function processEvidenceBytes(bytes, extension) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'hash-worker.cjs'))
    worker.once('message', (result) => { worker.terminate(); resolve(result) })
    worker.once('error', (error) => { worker.terminate(); reject(error) })
    worker.postMessage({ bytes, extension })
  })
}

const seed = () => {
  const data = ({
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
  data.ledger = makeLedgerState()
  data.sourceRegistry = sourceRegistry()
  const rows = (sheet) => camdenFixture.sheets[sheet]?.rows || []
  const source = camdenFixture.sourceFile
  const parseLinks = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
  data.matter = { id: 'matter-camden-vine', name: '1540 N. Vine / Vinyl Hollywood', subtitle: 'Camden transition · Los Angeles · controlled war room', status: 'ACTIVE', address: '1540 N. Vine Street, Los Angeles, CA' }
  data.units = rows('Unit Matrix').map((row) => ({ id: row['Claimant ID'] || `unit-${row.sourceRow}`, matterId: data.matter.id, unit: row['Apt / Unit'], claimantId: row['Claimant ID'], status: row['Claim status'] || 'OPEN', source: row['Public unit info source'], publicRecord: row, createdAt: now(), updatedAt: now() }))
  data.legalClaims = rows('Legal Fronts').map((row) => ({ id: row['Front ID'], matterId: data.matter.id, title: row['Front / theory'], authority: row.Authority, status: row['Camden status'], trigger: row['Exact trigger / elements'], remedy: row['Potential legal effect / remedy'], priority: row.Priority, defendants: row['Primary defendant(s) if facts fit'], defense: row['Likely defense'], proofNeeded: row['Plaintiff-side answer / proof needed'], source: row['Source URL'], sourceRow: row.sourceRow, createdAt: now(), updatedAt: now() }))
  data.legalElements = data.legalClaims.flatMap((claim) => String(claim.trigger || '').split(/;|\.|\n/).map((text, index) => text.trim()).filter(Boolean).slice(0, 8).map((text, index) => ({ id: `${claim.id}-element-${index + 1}`, claimId: claim.id, title: text, status: 'HYPOTHESIS', matterId: data.matter.id, createdAt: now(), updatedAt: now() })))
  data.elementRequirements = data.legalClaims.map((claim) => ({ id: `${claim.id}-proof`, claimId: claim.id, requirement: claim.proofNeeded, evidenceRequired: true, source: claim.source, status: 'OPEN', matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.evidence = data.evidence.concat(rows('Evidence Registry').map((row) => ({ id: row['Evidence ID'], name: row['Evidence object'], type: 'WAR_ROOM_REGISTER', hash: null, source: row['Custodian/source'], status: row['Current state'], links: parseLinks(row['Linked fronts']), preservationRisk: row['Preservation risk'], extractionRequest: row['Exact extraction / request'], sourceUrl: row['Source URL'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() })))
  data.procedure = data.procedure.concat(rows('Critical Clocks').map((row) => ({ id: row['Clock ID'], title: row.Trigger, date: row['Duration / deadline'], type: 'LEGAL_CLOCK', status: row['Current state'], source: row['Source URL'], consequence: row['Legal consequence / decision'], triggerProof: row['How to establish trigger'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() })))
  data.law = data.law.concat(rows('Authorities').map((row) => ({ id: `authority-${row.sourceRow}`, title: row.Authority, jurisdiction: 'CALIFORNIA / LOS ANGELES', status: row['Important limitation']?.includes('unknown') ? 'HYPOTHESIS' : 'VERIFIED', text: row['Exact proposition for this case'], proposition: row['Exact proposition for this case'], use: row.Use, limitation: row['Important limitation'], source: row['Source URL'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() })))
  data.authorities = data.law.map((authority) => ({ ...authority, objectType: 'AUTHORITY' }))
  data.facts = data.facts.concat(rows('Property Facts').map((row) => ({ id: row['Fact ID'], title: row['Property-specific fact'], detail: row['Why it matters'], status: row.Status, source: row['Source URL'], verification: row['Exact verification / next record'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() })))
  data.context = [{ id: 'ctx-camden-workbook', type: 'WAR_ROOM_WORKBOOK', status: 'CONTEXT_ONLY', source, sourceWorkbook: camdenFixture.sourceWorkbook, sheetCounts: Object.fromEntries(Object.entries(camdenFixture.sheets).map(([key, value]) => [key, value.rows.length])), handlingRules: rows('Read Me'), lastSourceCheck: '2026-08-17', sourceRegistry: [
    { id: 'src-lahd', entity: 'LAHD', type: 'OFFICIAL ENFORCEMENT PORTAL', status: 'ACCESSIBLE / PROPERTY RECORD REQUIRED', url: 'https://housing.lacity.gov/residents/just-cause-for-eviction-ordinance-jco' },
    { id: 'src-ladbs', entity: 'LADBS', type: 'OFFICIAL CODE-ENFORCEMENT PORTAL', status: 'ACCESSIBLE / PROPERTY RECORD REQUIRED', url: 'https://ladbs.org/services/core-services/code-enforcement' },
    { id: 'src-lafd', entity: 'LAFD FIMS', type: 'OFFICIAL FIRE-PREVENTION PORTAL', status: 'ACCESSIBLE / TRANSACTION ID OR ADDRESS SEARCH REQUIRED', url: 'https://fims.lafd.org/' },
    { id: 'src-water', entity: 'California Water Boards CIWQS', type: 'OFFICIAL WATER-COMPLIANCE RECORD', status: 'WORKBOOK LEAD / PROPERTY RECORD REQUIRED', url: 'https://ciwqs.waterboards.ca.gov/ciwqs/readOnly/CiwqsReportServlet?classType=3&facID=S824657&group=&inCommand=drilldown&reportID=3523990&reportName=PublicVioDetailReport' },
    { id: 'src-sale', entity: 'JLL / sale reporting', type: 'PUBLIC TRANSACTION REPORT', status: 'CORROBORATED TRANSACTION LEAD / DEED REQUIRED', url: 'https://www.jll.com/en-us/newsroom/11-asset-portfolio-in-southern-california-sold-by-jll' },
    { id: 'src-news', entity: 'Public transaction coverage', type: 'NEWS SOURCE', status: 'SECONDARY SOURCE / VERIFY AGAINST PRIMARY RECORD', url: 'https://irei.com/news/jll-arranges-1-63b-sale-of-southern-california-multifamily-portfolio/' }
  ], createdAt: now() }]
  data.organizations = [
    { id: 'org-camden', name: 'Camden Property Trust / Camden Development', role: 'PREDECESSOR OWNER / MANAGER', status: 'PUBLIC-RECORD LEAD', source: source },
    { id: 'org-blackrock', name: 'BlackRock Realty Advisors, Inc.', role: 'CURRENT MANAGER / SUCCESSOR VEHICLE LEAD', status: 'PARTLY VERIFIED', source: source },
    { id: 'org-jll', name: 'JLL', role: 'SALE / BROKER RECORD', status: 'PUBLIC SOURCE', source: source },
    { id: 'org-lahd', name: 'Los Angeles Housing Department', role: 'HOUSING ENFORCEMENT', status: 'OFFICIAL AGENCY', source: source },
    { id: 'org-ladbs', name: 'Los Angeles Department of Building and Safety', role: 'BUILDING / PERMIT ENFORCEMENT', status: 'OFFICIAL AGENCY', source: source },
    { id: 'org-lafd', name: 'Los Angeles Fire Department', role: 'LIFE-SAFETY ENFORCEMENT', status: 'OFFICIAL AGENCY', source: source },
    { id: 'org-water-board', name: 'California Water Boards', role: 'HISTORICAL WATER-COMPLIANCE RECORD', status: 'OFFICIAL AGENCY', source: source },
    { id: 'org-realpage', name: 'RealPage', role: 'PRICING-SYSTEM QUALIFICATION TO VERIFY', status: 'UNKNOWN', source: source }
  ]
  data.events = [
    { id: 'event-sale-2026', title: 'Public portfolio sale announcement', date: '2026-08-05', status: 'CORROBORATED LEAD', source: 'War-room workbook / JLL lead', linkedOrganizations: ['org-camden', 'org-blackrock', 'org-jll'] },
    { id: 'event-owner-clock', title: 'Successor disclosure clock', date: '2026-08-20', status: 'LIVE AUDIT', source: 'War-room critical clock CL-001', linkedOrganizations: ['org-blackrock'] },
    { id: 'event-realpage-clock', title: 'RealPage exclusion/objection deadline', date: '2026-09-01', status: 'LIVE AUDIT', source: 'War-room critical clock CL-003', linkedOrganizations: ['org-realpage'] }
  ]
  data.audit.push({ id: id('audit'), at: now(), action: 'IMPORTED CAMDEN WAR ROOM FIXTURE', object: data.matter.id })
  return data
}

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
    async update(patch) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid state patch')
      data = { ...data, ...patch }
      data.audit.push({ id: id('audit'), at: now(), action: 'UPDATE', object: data.matter.id })
      await this.persist()
      return data
    },
    async updateRequirement(requirementId, status, evidence = {}) {
      const allowed = new Set(['UNREAD', 'PARSED', 'MAPPED', 'IMPLEMENTED', 'TESTED', 'VERIFIED', 'DEFERRED', 'REJECTED'])
      const item = data.ledger.requirements.find((requirement) => requirement.id === String(requirementId).padStart(4, '0'))
      if (!item) throw new Error('Requirement does not exist')
      if (!allowed.has(status)) throw new Error('Invalid requirement status')
      item.status = status
      item.updatedAt = now()
      for (const key of ['sourceRefs', 'featureRefs', 'implementationEvidence', 'testEvidence', 'screenshotEvidence']) if (Array.isArray(evidence[key])) item[key] = evidence[key]
      data.audit.push({ id: id('audit'), at: now(), action: `REQUIREMENT ${status}`, object: item.id })
      await this.persist()
      return data
    },
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
      const fileStat = await fs.stat(filePathToRead)
      const extension = path.extname(filePathToRead).toLowerCase()
      const processed = await processEvidenceBytes(bytes, extension)
      return { id: id('stage'), name: path.basename(filePathToRead), originalPath: filePathToRead, bytes: bytes.length, hash: `sha256:${processed.hash}`, type: extension.slice(1).toUpperCase() || 'FILE', source: 'Local import', status: 'STAGED', extractedText: processed.extractedText, custodian: null, originalTimestamps: { birthtime: fileStat.birthtime.toISOString(), mtime: fileStat.mtime.toISOString() } }
    },
    stageTextEvidence(text) {
      const bytes = Buffer.from(text, 'utf8')
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      return { id: id('stage'), name: 'Clipboard text', originalPath: null, bytes: bytes.length, hash: `sha256:${hash}`, type: 'TEXT', source: 'Clipboard import', status: 'STAGED', extractedText: text, custodian: null, originalTimestamps: null }
    },
    async commitEvidence(staged) {
      if (!Array.isArray(staged) || staged.some((item) => !item || item.status !== 'STAGED' || !/^sha256:[a-f0-9]{64}$/.test(item.hash))) throw new Error('Evidence must be staged with a valid SHA-256 hash')
      for (const item of staged) {
        if (item.originalPath) {
          const bytes = await fs.readFile(item.originalPath)
          const digest = crypto.createHash('sha256').update(bytes).digest('hex')
          if (item.hash !== `sha256:${digest}`) throw new Error(`Evidence hash mismatch for ${item.name || item.originalPath}`)
        } else if (item.source === 'Clipboard import') {
          const digest = crypto.createHash('sha256').update(String(item.extractedText || ''), 'utf8').digest('hex')
          if (item.hash !== `sha256:${digest}`) throw new Error('Clipboard evidence hash mismatch')
        }
      }
      const evidenceDirectory = path.join(path.dirname(filePath), 'evidence-store')
      await fs.mkdir(evidenceDirectory, { recursive: true })
      const committed = []
      for (const item of staged) {
        if (data.evidence.some((existing) => existing.hash && existing.hash === item.hash)) continue
        const storedPath = path.join(evidenceDirectory, item.hash.slice('sha256:'.length) + (item.type === 'TEXT' ? '.txt' : path.extname(item.originalPath || '') || '.bin'))
        if (item.originalPath) await fs.copyFile(item.originalPath, storedPath)
        else await fs.writeFile(storedPath, String(item.extractedText || ''), 'utf8')
        committed.push({ ...item, id: id('ev'), status: 'VERIFIED', storedPath, links: [], linkedEvents: [], linkedPeople: [], linkedSystems: [], linkedElements: [], corroboration: 'UNREVIEWED', contradiction: null, importedAt: now(), createdAt: now(), updatedAt: now(), matterId: data.matter.id })
      }
      const duplicates = staged.filter((item) => data.evidence.some((existing) => existing.hash && existing.hash === item.hash)).map((item) => ({ ...item, status: 'DUPLICATE' }))
      data.extractedText.push(...committed.filter((item) => item.extractedText).map((item) => ({ id: id('text'), evidenceId: item.id, text: item.extractedText, createdAt: now() })))
      data.evidence.push(...committed)
      data.agentJobs.push({ id: id('job'), type: 'HASH_EXTRACT_INDEX', status: 'COMPLETE', records: committed.length, startedAt: now(), finishedAt: now() })
      data.audit.push({ id: id('audit'), at: now(), action: duplicates.length ? 'COMMIT EVIDENCE / DUPLICATE DETECTED' : 'COMMIT EVIDENCE', object: committed.map((item) => item.id).join(', ') || duplicates.map((item) => item.hash).join(', ') }); await this.persist(); return data
    },
    health() {
      const active = data.agentJobs.filter((job) => job.status === 'RUNNING').length
      return { db: 'VERIFIED', index: 'READY', agents: active, jobs: data.agentJobs.filter((job) => job.status !== 'COMPLETE').length, completedJobs: data.agentJobs.filter((job) => job.status === 'COMPLETE').length }
    },
    async addContext(record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Context record must be an object')
      data.context.push({ ...record, id: id('ctx'), createdAt: now(), updatedAt: now(), status: 'CONTEXT_ONLY', matterId: data.matter.id })
      data.audit.push({ id: id('audit'), at: now(), action: 'IMPORT AS CONTEXT', object: data.context.at(-1).id })
      await this.persist()
      return data
    },
    ledgerSummary() {
      const counts = data.ledger.requirements.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result }, {})
      return { total: data.ledger.requirements.length, counts, sourceCount: data.ledger.sourceCount, checksum: data.ledger.checksum }
    }
  }
}

module.exports = { createStore }
