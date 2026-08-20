const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const zlib = require('node:zlib')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { Worker } = require('node:worker_threads')
const camdenFixture = require('../fixtures/camden-1540-vine.json')
let machineFixture = { schemaVersion: 1, sourceFile: null, sourceWorkbook: null, researchState: null, handlingRule: 'Optional local property-specific fixture.', sheets: {} }
try { machineFixture = require('../fixtures/camden-1540-vine-machine.json') } catch {}
const { makeLedgerState, sourceRegistry } = require('./ledger.cjs')

const now = () => new Date().toISOString()
const id = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
const normalizeAddress = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
function classifyCamdenAddress(value) {
  const address = normalizeAddress(value)
  if (/\b1600\b/.test(address) && address.includes('vine')) return 'UNRELATED_ADDRESS'
  if (/\b1540\b/.test(address) && address.includes('vine')) return 'EXACT_PROPERTY'
  if (address.includes('vine')) return 'AMBIGUOUS_ADDRESS'
  return 'NON_MATCH'
}
const collectionNames = ['people', 'organizations', 'organizationProfiles', 'properties', 'propertyRecords', 'units', 'incidents', 'workOrders', 'vendors', 'telemetry', 'notices', 'extractedText', 'authorities', 'propositions', 'legalClaims', 'legalElements', 'elementRequirements', 'evidenceLinks', 'propositionLinks', 'contradictions', 'evidenceGaps', 'proceduralEvents', 'courtFilings', 'docketEntries', 'serviceRecords', 'deadlines', 'paragraphProvenance', 'judgeProfiles', 'opponentProfiles', 'strategyRecords', 'agentJobs', 'facts', 'evidence', 'law', 'claims', 'elements', 'procedure', 'drafts', 'context', 'audit', 'events', 'moderateReviews', 'machineFronts', 'unitMatrixDetailed', 'machineAuthorities', 'evidenceHolds', 'activationSequence', 'damagesModel', 'sourceCatalog', 'caseInputs', 'machineLinks', 'machineActions', 'trialPhases', 'trialWitnesses', 'trialExhibits', 'trialMotions', 'trialObjections', 'trialExaminations', 'juryInstructions', 'trialTasks', 'trialRulings', 'trialEvents', 'trialArguments', 'trialAppealIssues', 'trialActions', 'trialControls', 'trialJudgments', 'trialCosts', 'trialEnforcement', 'trialAppeals']

function normalize(data) {
  const normalized = { ...data, version: Math.max(Number(data.version || 0), 2) }
  for (const name of collectionNames) if (!Array.isArray(normalized[name])) normalized[name] = []
  normalized.audit = normalized.audit || []
  normalized.trial = normalized.trial || { currentPhaseId: null, posture: 'PRETRIAL', readiness: 'INCOMPLETE', warning: 'Verify controlling court sources.', matterId: normalized.matter?.id || null, updatedAt: now() }
  normalized.ledger = normalized.ledger || makeLedgerState()
  normalized.sourceRegistry = normalized.sourceRegistry || sourceRegistry()
  return normalized
}

function findObject(data, type, objectId) {
  const collection = { fact: 'facts', evidence: 'evidence', law: 'law', authority: 'authorities', machineAuthority: 'machineAuthorities', claim: 'claims', legalClaim: 'legalClaims', machineFront: 'machineFronts', element: 'elements', legalElement: 'legalElements', procedure: 'procedure', draft: 'drafts', proposition: 'propositions', deadline: 'deadlines', person: 'people', event: 'events', organization: 'organizations', organizationProfile: 'organizationProfiles', propertyRecord: 'propertyRecords', unit: 'units', machineUnit: 'unitMatrixDetailed', notice: 'notices', filing: 'courtFilings', service: 'serviceRecords', docket: 'docketEntries', moderateReview: 'moderateReviews', evidenceHold: 'evidenceHolds', activation: 'activationSequence', damage: 'damagesModel', source: 'sourceCatalog', strategyRecord: 'strategyRecords', trialPhase: 'trialPhases', trialWitness: 'trialWitnesses', trialExhibit: 'trialExhibits', trialMotion: 'trialMotions', trialObjection: 'trialObjections', trialTask: 'trialTasks', trialControl: 'trialControls', trialRuling: 'trialRulings', trialEvent: 'trialEvents', trialArgument: 'trialArguments', trialAppealIssue: 'trialAppealIssues', trialJudgment: 'trialJudgments', trialCost: 'trialCosts', trialEnforcement: 'trialEnforcement', trialAppeal: 'trialAppeals' }[type]
  return collection ? data[collection].find((item) => item.id === objectId) : null
}

function readSqlite(filePath) {
  const result = spawnSync('sqlite3', [filePath, 'SELECT payload FROM case_state WHERE id = 1;'], { encoding: 'utf8' })
  if (result.status !== 0 || !result.stdout.trim()) return null
  const payload = result.stdout.trim()
  if (payload.startsWith('gz:')) return JSON.parse(zlib.inflateSync(Buffer.from(payload.slice(3), 'base64')).toString('utf8'))
  return JSON.parse(payload)
}

function writeSqlite(filePath, data) {
  const payload = `gz:${zlib.deflateSync(Buffer.from(JSON.stringify(data), 'utf8')).toString('base64')}`.replaceAll("'", "''")
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

function recalculateCompleteness(data) {
  data.elements = data.elements.map((element) => {
    const linkedEvidence = data.evidenceLinks.some((link) => link.targetType === 'element' && link.targetId === element.id) || (element.links || []).some((link) => String(link).toLowerCase().startsWith('ev-'))
    const linkedFact = (element.links || []).some((link) => String(link).toLowerCase().startsWith('fact-') || String(link).toLowerCase().startsWith('pf-'))
    const linkedAuthority = (element.links || []).some((link) => String(link).toLowerCase().startsWith('law-') || String(link).toLowerCase().startsWith('authority-')) || data.propositionLinks.some((link) => link.elementId === element.id)
    const sourceFixtureComplete = element.status === 'COMPLETE' && linkedEvidence && linkedFact
    const complete = sourceFixtureComplete || (linkedEvidence && linkedFact && linkedAuthority)
    return { ...element, proof: complete ? 100 : Math.min(99, Math.round(([linkedEvidence, linkedFact, linkedAuthority].filter(Boolean).length / 3) * 100)), status: complete ? 'COMPLETE' : 'INCOMPLETE', missing: complete ? null : [!linkedEvidence && 'evidence', !linkedFact && 'fact', !linkedAuthority && 'authority'].filter(Boolean).join(', ') }
  })
  data.claims = data.claims.map((claim) => {
    const claimElements = data.elements.filter((element) => (claim.elements || []).includes(element.id))
    const proof = claimElements.length ? Math.round(claimElements.reduce((sum, element) => sum + Number(element.proof || 0), 0) / claimElements.length) : 0
    return { ...claim, proof, status: claimElements.every((element) => element.status === 'COMPLETE') ? 'COMPLETE' : 'INCOMPLETE' }
  })
  return data
}

const seed = () => {
  const data = ({
  version: 2,
  matter: { id: 'matter-001', name: 'Northstar Housing Matter', subtitle: 'Los Angeles · active working set', status: 'ACTIVE' },
  people: [], organizations: [], organizationProfiles: [], properties: [], propertyRecords: [], units: [], events: [], incidents: [], workOrders: [], vendors: [], telemetry: [], notices: [], extractedText: [], authorities: [], propositions: [], legalClaims: [], legalElements: [], elementRequirements: [], evidenceLinks: [], propositionLinks: [], contradictions: [], evidenceGaps: [], proceduralEvents: [], courtFilings: [], docketEntries: [], serviceRecords: [], deadlines: [], paragraphProvenance: [], judgeProfiles: [], opponentProfiles: [], agentJobs: [], trialControls: [],
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
    { id: 'law-001', title: 'Civil Code §1942.4', jurisdiction: 'CALIFORNIA', status: 'VERIFIED', text: 'A landlord may not collect rent or issue certain notices while specified conditions remain unresolved.', proposition: 'Unresolved statutory conditions can affect rent collection and notice remedies.', source: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1942.4', links: ['element-002'] },
    { id: 'law-002', title: 'Local housing code', jurisdiction: 'LOS ANGELES', status: 'HYPOTHESIS', text: 'Local inspection and notice requirements remain to be confirmed from the controlling source.', proposition: null, source: 'https://housing.lacity.gov/', links: ['element-003'] }
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
  strategyRecords: [
    { id: 'strategy-judge-001', role: 'JUDGE', observation: 'Procedure-sensitive review', sourceUniverse: 'Local procedural fixture', confidence: 62, uncertainty: 'Local practice and controlling orders require verification.', inference: true, linkedObjects: ['proc-001'], source: 'Procedure rule fixture', status: 'INFERENCE', matterId: 'matter-001', createdAt: now(), updatedAt: now() },
    { id: 'strategy-opponent-001', role: 'OPPONENT', observation: 'Likely challenge: missing inspection record', sourceUniverse: 'Pleadings and notice fixture', confidence: 48, uncertainty: 'Opponent position is not established until a filed response or statement exists.', inference: true, linkedObjects: ['fact-003'], source: 'Gap analysis', status: 'INFERENCE', matterId: 'matter-001', createdAt: now(), updatedAt: now() }
  ],
  context: [],
  audit: [{ id: id('audit'), at: now(), action: 'SEEDED MATTER', object: 'matter-001' }]
  })
  data.ledger = makeLedgerState()
  data.sourceRegistry = sourceRegistry()
  const rows = (sheet) => camdenFixture.sheets[sheet]?.rows || []
  const source = camdenFixture.sourceFile
  const parseLinks = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
  data.matter = { id: 'matter-camden-vine', name: '1540 N. Vine / Vinyl Hollywood', subtitle: 'Camden transition · Los Angeles · controlled war room', status: 'ACTIVE', address: '1540 N. Vine Street, Los Angeles, CA' }
  data.strategyRecords = data.strategyRecords.map((record) => ({ ...record, matterId: data.matter.id }))
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
  const machineRows = (sheet) => machineFixture.sheets[sheet]?.rows || []
  data.machine = { schemaVersion: machineFixture.schemaVersion, sourceFile: machineFixture.sourceFile, sourceWorkbook: machineFixture.sourceWorkbook, researchState: machineFixture.researchState, handlingRule: machineFixture.handlingRule, sheetCounts: Object.fromEntries(Object.entries(machineFixture.sheets).map(([key, value]) => [key, value.rows.length])), importedAt: now() }
  data.unitMatrixDetailed = machineRows('287 Unit Matrix').map((row) => ({ id: row.Record_ID, unit: row.Unit, status: row.Unit_ID_Status, floor: row.Floor_Inferred, floorConfidence: row.Floor_Confidence, floorplan: row.Floorplan, bedrooms: row.Beds, bathrooms: row.Baths, squareFeet: row.SqFt, baseRent: row.Current_Base_Rent, sourceStatus: row.Source_Status, confidence: row.Confidence, fastestFill: row.Fastest_Fill, custodian: row.Primary_Custodian, publicRecord: row, sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.machineFronts = machineRows('12 Fronts').map((row) => ({ id: `MF-${row.Front}`, title: row['Independent legal/administrative theory'], trigger: row['Exact trigger / elements'], presentState: row['1540 N Vine present state'], defense: row['Principal defense'], proofNeeded: row['Plaintiff-side counter / proof'], remedy: row['Primary remedy / effect'], status: row.Status, sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.machineAuthorities = machineRows('Law & Precedent').map((row) => ({ id: `MP-${row.sourceRow}`, authority: row.Authority, type: row.Type, operativePoint: row['Exact operative point'], caseUse: row['1540-specific use'], status: row['Status / limit'], source: row['Source URL'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.evidenceHolds = machineRows('Evidence Hold').map((row) => ({ id: `EH-${row.sourceRow}`, priority: row.Priority, custodian: row['Custodian / system'], nativeForm: row['Preserve in native form'], purpose: row['Why it matters to 1540'], defenseTarget: row['Failure / defense it defeats'], acquisitionPath: row['Lawful acquisition path'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.activationSequence = machineRows('Activation Sequence').map((row) => ({ id: `AS-${row.Order}`, order: row.Order, trigger: row['Trigger / clock'], action: row.Action, output: row['Exact output'], fronts: row['Fronts unlocked'], distinction: row['Do not confuse with'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.damagesModel = machineRows('Damages Model').map((row) => ({ id: `DM-${row.sourceRow}`, bucket: row.Bucket, formula: row['Base formula / proof'], stacking: row['Can stack?'], antiDoubleCounting: row['Anti-double-counting rule'], inputNeeded: row['1540-specific input needed'], sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.sourceCatalog = machineRows('Sources').map((row) => ({ id: `SC-${row.sourceRow}`, category: row.Category, name: row.Source, url: row.URL, use: row.Use, status: 'LEAD_UNTIL_VERIFIED', sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.caseInputs = machineRows('Inputs').map((row) => ({ id: `IN-${row.sourceRow}`, key: row.Key, value: row.Value, asOf: row['As of'], source: row.Source, status: 'CONTEXT_ONLY', sourceRow: row.sourceRow, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.context.push({ id: 'ctx-1540-machine-workbook', type: 'PROPERTY_SPECIFIC_LITIGATION_MACHINE', status: 'CONTEXT_ONLY', source: machineFixture.sourceFile, sourceWorkbook: machineFixture.sourceWorkbook, sheetCounts: data.machine.sheetCounts, researchState: machineFixture.researchState, handlingRule: machineFixture.handlingRule, createdAt: now(), updatedAt: now(), matterId: data.matter.id })
  data.machineLinks = []
  data.machineActions = []
  data.trial = { currentPhaseId: 'TP-01', posture: 'PRETRIAL', readiness: 'INCOMPLETE', warning: 'Not legal advice; verify every rule, deadline, and local procedure against the controlling court source.', matterId: data.matter.id, updatedAt: now() }
  data.trialPhases = [
    ['TP-01', 'Pleadings and service', 'Confirm operative pleadings, service, jurisdiction, venue, and response dates.', 'OPEN'],
    ['TP-02', 'Case management', 'Track scheduling orders, required conferences, disclosures, and court-specific forms.', 'PENDING'],
    ['TP-03', 'Discovery', 'Track requests, responses, privilege logs, subpoenas, inspections, and preservation.', 'PENDING'],
    ['TP-04', 'Motions', 'Build motions, oppositions, replies, declarations, exhibits, and hearing logistics.', 'PENDING'],
    ['TP-05', 'Pretrial exchange', 'Finalize witness list, exhibit list, objections, proposed instructions, and trial brief.', 'PENDING'],
    ['TP-06', 'Voir dire', 'Track juror questions, cause challenges, peremptory use, and preserved objections.', 'PENDING'],
    ['TP-07', 'Opening statement', 'Prepare a fact-bounded opening tied to admissible proof and requested relief.', 'PENDING'],
    ['TP-08', 'Plaintiff evidence', 'Organize foundation, direct examination, exhibits, and admission rulings.', 'PENDING'],
    ['TP-09', 'Defense evidence', 'Organize cross examination, defense witnesses, impeachment, and rebuttal.', 'PENDING'],
    ['TP-10', 'Closing and instructions', 'Track admitted proof, legal elements, proposed instructions, and closing limits.', 'PENDING'],
    ['TP-11', 'Verdict and judgment', 'Record verdict, judgment, cost deadlines, post-trial motions, and enforcement posture.', 'PENDING'],
    ['TP-12', 'Appeal preservation', 'Record notices, deadlines, rulings, offers of proof, objections, and appeal issues.', 'PENDING']
  ].map(([id, title, purpose, status], index) => ({ id, title, purpose, status, order: index + 1, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialWitnesses = [
    { id: 'TW-01', name: 'Resident fact witness A', role: 'FACT', side: 'PLAINTIFF', status: 'LEAD', foundation: ['Personal knowledge', 'Dated communications'], directTopics: ['Condition timeline', 'Notice', 'Impact'], crossRisks: ['Memory sequence', 'Unit-specific scope'], impeachmentSources: ['EV-001', 'EV-002'], protectedData: 'ANONYMOUS_ID_ONLY' },
    { id: 'TW-02', name: 'Maintenance custodian', role: 'CUSTODIAN', side: 'NEUTRAL', status: 'UNCONFIRMED', foundation: ['Business-record foundation', 'System familiarity'], directTopics: ['Work orders', 'Close codes', 'Reopen history'], crossRisks: ['Personal knowledge limits'], impeachmentSources: [], protectedData: 'MINIMUM_NECESSARY' },
    { id: 'TW-03', name: 'Property manager representative', role: 'ADVERSE', side: 'DEFENSE', status: 'IDENTIFIED', foundation: ['Role and authority'], directTopics: ['Policies', 'Notice routing', 'Successor records'], crossRisks: ['Corporate knowledge boundary'], impeachmentSources: ['EV-002'], protectedData: 'PUBLIC_ROLE_ONLY' },
    { id: 'TW-04', name: 'Qualified engineering witness', role: 'EXPERT', side: 'PLAINTIFF', status: 'NEEDS_QUALIFICATION', foundation: ['Qualifications', 'Methodology', 'Reliability'], directTopics: ['Hot-water causality', 'System versus unit scope'], crossRisks: ['Assumptions', 'Alternative causes'], impeachmentSources: [], protectedData: 'PUBLIC_CREDENTIALS_ONLY' }
  ].map((item) => ({ ...item, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialExhibits = [
    { id: 'TX-01', label: 'PX-001', title: 'Recurring condition chronology', category: 'DOCUMENT', sourceEvidenceId: 'ev-001', custodianId: 'TW-01', foundation: 'Personal knowledge plus dated record', status: 'NOT_MOVED', objections: ['HEARSAY', 'AUTHENTICATION'], admissionResult: null },
    { id: 'TX-02', label: 'PX-002', title: 'Owner notice communication', category: 'COMMUNICATION', sourceEvidenceId: 'ev-002', custodianId: 'TW-01', foundation: 'Sender/recipient and business transmission', status: 'NOT_MOVED', objections: ['AUTHENTICATION', 'COMPLETENESS'], admissionResult: null },
    { id: 'TX-03', label: 'PX-003', title: 'Maintenance work-order export', category: 'BUSINESS_RECORD', sourceEvidenceId: null, custodianId: 'TW-02', foundation: 'System custodian and regular practice', status: 'FOUNDATION_NEEDED', objections: ['HEARSAY', 'BEST_EVIDENCE'], admissionResult: null },
    { id: 'TX-04', label: 'PX-004', title: 'Official inspection or agency record', category: 'PUBLIC_RECORD', sourceEvidenceId: 'ev-003', custodianId: null, foundation: 'Official source certification', status: 'MISSING', objections: ['FOUNDATION', 'RELEVANCE'], admissionResult: null },
    { id: 'DX-01', label: 'DX-001', title: 'Defense repair completion record', category: 'DEFENSE_DOCUMENT', sourceEvidenceId: null, custodianId: 'TW-03', foundation: 'Defense custodian or stipulation', status: 'REQUESTED', objections: ['COMPLETENESS', 'TIMING'], admissionResult: null }
  ].map((item) => ({ ...item, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialMotions = [
    { id: 'TM-01', title: 'Motion in limine: exclude unsupported unrelated address evidence', type: 'LIMINE', side: 'PLAINTIFF', status: 'DRAFT', ruleSource: 'COURT_RULE_REQUIRED', relief: 'Exclude or limit unrelated property evidence', oppositionNeeded: true, hearingDate: null },
    { id: 'TM-02', title: 'Motion to compel preserved maintenance records', type: 'DISCOVERY', side: 'PLAINTIFF', status: 'PENDING', ruleSource: 'DISCOVERY_RULE_REQUIRED', relief: 'Order production or privilege log', oppositionNeeded: true, hearingDate: null },
    { id: 'TM-03', title: 'Opposition to dispositive motion', type: 'DISPOSITIVE', side: 'PLAINTIFF', status: 'NOT_STARTED', ruleSource: 'CONTROLLING_RULE_REQUIRED', relief: 'Deny judgment against supported elements', oppositionNeeded: false, hearingDate: null }
  ].map((item) => ({ ...item, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialObjections = ['HEARSAY', 'AUTHENTICATION', 'RELEVANCE', 'PREJUDICE', 'SPECULATION', 'FOUNDATION', 'BEST_EVIDENCE', 'LEADING', 'NONRESPONSIVE', 'ARGUMENTATIVE', 'CUMULATIVE', 'LACK_OF_PERSONAL_KNOWLEDGE'].map((ground, index) => ({ id: `TO-${String(index + 1).padStart(2, '0')}`, ground, target: null, phaseId: null, status: 'AVAILABLE', response: null, ruling: null, preserved: false, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialExaminations = data.trialWitnesses.map((witness, index) => ({ id: `TE-${String(index + 1).padStart(2, '0')}`, witnessId: witness.id, mode: index === 0 ? 'DIRECT' : 'CROSS', topics: witness.directTopics, foundationChecklist: witness.foundation, notes: '', status: 'NOT_STARTED', matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.juryInstructions = ['Elements of each claim', 'Burden and standard of proof', 'Credibility and impeachment', 'Damages and no-double-recovery rule', 'Caution against unrelated-address evidence'].map((title, index) => ({ id: `JI-${String(index + 1).padStart(2, '0')}`, title, source: 'CONTROLLING INSTRUCTION SOURCE REQUIRED', status: 'DRAFT', objections: [], matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialTasks = [
    ['TT-01', 'Obtain operative scheduling order', 'TP-02', 'COURT_RECORD'], ['TT-02', 'Serve or respond to outstanding discovery', 'TP-03', 'PROCEDURE'], ['TT-03', 'Build witness foundation packets', 'TP-05', 'WITNESS'], ['TT-04', 'Complete exhibit authentication map', 'TP-05', 'EXHIBIT'], ['TT-05', 'File motion or opposition by controlling deadline', 'TP-04', 'MOTION'], ['TT-06', 'Draft proposed jury instructions', 'TP-10', 'LAW'], ['TT-07', 'Prepare direct examination outline', 'TP-08', 'EXAMINATION'], ['TT-08', 'Prepare cross examination outline', 'TP-09', 'EXAMINATION'], ['TT-09', 'Record every objection and ruling', 'TP-08', 'PRESERVATION'], ['TT-10', 'Calendar judgment and appeal deadlines', 'TP-11', 'DEADLINE'], ['TT-11', 'Create post-trial motion decision tree', 'TP-11', 'POST_TRIAL'], ['TT-12', 'Prepare notice-of-appeal issue list', 'TP-12', 'APPEAL']
  ].map(([id, title, phaseId, category]) => ({ id, title, phaseId, category, status: 'OPEN', dueDate: null, source: 'Trial operating checklist', matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialControls = [
    ['TC-CTRL-01', 'Operative pleadings and service', 'TP-01'], ['TC-CTRL-02', 'Jurisdiction and venue', 'TP-01'], ['TC-CTRL-03', 'Discovery requests and responses', 'TP-03'], ['TC-CTRL-04', 'Privilege log and preservation', 'TP-03'], ['TC-CTRL-05', 'Motions and hearing record', 'TP-04'], ['TC-CTRL-06', 'Witness and exhibit exchange', 'TP-05'], ['TC-CTRL-07', 'Voir dire and jury challenges', 'TP-06'], ['TC-CTRL-08', 'Opening and order of proof', 'TP-07'], ['TC-CTRL-09', 'Foundation and examination', 'TP-08'], ['TC-CTRL-10', 'Objections and rulings', 'TP-08'], ['TC-CTRL-11', 'Instructions and closing', 'TP-10'], ['TC-CTRL-12', 'Judgment, enforcement, and appeal', 'TP-11']
  ].map(([id, title, phaseId]) => ({ id, title, phaseId, owner: null, nextAction: 'Assign owner and next action', source: 'Source record or explicit gap required', ruleSource: 'Controlling rule required', date: null, status: 'OPEN', linkedObjects: [], defense: null, contradiction: null, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialRulings = []
  data.trialEvents = []
  data.trialArguments = []
  data.trialAppealIssues = []
  data.trialActions = []
  data.trialJudgments = [{ id: 'TJ-01', verdictStatus: 'NOT_ENTERED', verdict: null, judgmentStatus: 'NOT_ENTERED', entryDate: null, serviceDate: null, appealDeadline: null, relief: null, source: 'Court judgment record required', matterId: data.matter.id, createdAt: now(), updatedAt: now() }]
  data.trialCosts = ['Filing fees', 'Service and subpoena costs', 'Expert and record costs', 'Recoverable costs request'].map((category, index) => ({ id: `TC-${String(index + 1).padStart(2, '0')}`, category, amount: null, status: 'NOT_RECORDED', source: 'Receipts or court cost record required', matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialEnforcement = [
    ['TEF-01', 'Demand or comply with judgment', 'NOT_STARTED'], ['TEF-02', 'Record satisfaction or partial satisfaction', 'NOT_STARTED'], ['TEF-03', 'Request or oppose stay', 'NOT_STARTED'], ['TEF-04', 'Enforcement mechanism selection', 'NOT_STARTED'], ['TEF-05', 'Post-judgment accounting', 'NOT_STARTED']
  ].map(([id, title, status]) => ({ id, title, status, source: 'Judgment and controlling procedure source required', recordLocation: null, matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.trialAppeals = [
    ['TA-01', 'Notice of appeal', 'DATE_REQUIRED'], ['TA-02', 'Appellate jurisdiction and appealability check', 'SOURCE_REQUIRED'], ['TA-03', 'Record designation', 'NOT_STARTED'], ['TA-04', 'Reporter transcript request', 'NOT_STARTED'], ['TA-05', 'Opening brief issue map', 'NOT_STARTED'], ['TA-06', 'Responding or reply brief calendar', 'NOT_STARTED'], ['TA-07', 'Record correction or augmentation request', 'NOT_STARTED'], ['TA-08', 'Disposition and remand tracking', 'NOT_STARTED']
  ].map(([id, title, status]) => ({ id, title, status, dueDate: null, recordLocation: null, source: 'Appellate court rule or docket required', matterId: data.matter.id, createdAt: now(), updatedAt: now() }))
  data.moderateReviews = [
    { id: 'MR-01', label: 'Review A', viewpointIntensity: null, acceptanceWidth: null, confidence: null, status: 'PENDING', reason: null, source: 'Source record required', lawfulPurpose: 'Trust-and-safety review only', protectedTraitTargeting: false, associationGraph: false, matterId: data.matter.id, createdAt: now(), updatedAt: now() },
    { id: 'MR-02', label: 'Review B', viewpointIntensity: null, acceptanceWidth: null, confidence: null, status: 'PENDING', reason: null, source: 'Source record required', lawfulPurpose: 'Trust-and-safety review only', protectedTraitTargeting: false, associationGraph: false, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
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
      if (action === 'record-property-record') {
        const address = String(payload.address || '').trim()
        const source = String(payload.source || '').trim()
        if (!address || !source) throw new Error('Property record requires an address and source')
        const addressIdentity = classifyCamdenAddress(address)
        const record = { id: id('property-record'), address, addressIdentity, recordType: payload.recordType || 'PUBLIC_RECORD', source, sourceRow: payload.sourceRow || null, status: addressIdentity === 'EXACT_PROPERTY' ? 'LEAD' : addressIdentity === 'UNRELATED_ADDRESS' ? 'UNRELATED' : 'AMBIGUOUS', linkedToMatter: addressIdentity === 'EXACT_PROPERTY', matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.propertyRecords.push(record)
        data.audit.push({ id: id('audit'), at: now(), action: addressIdentity === 'EXACT_PROPERTY' ? 'RECORD EXACT PROPERTY SOURCE' : 'REJECT PROPERTY IDENTITY LINK', object: record.id })
      } else if (action === 'record-contradiction') {
        const left = findObject(data, payload.leftType, payload.leftId)
        const right = findObject(data, payload.rightType, payload.rightId)
        const leftStatement = String(payload.leftStatement || '').trim()
        const rightStatement = String(payload.rightStatement || '').trim()
        const source = String(payload.source || '').trim()
        if (!left || !right) throw new Error('Contradiction endpoints do not exist')
        if (!leftStatement || !rightStatement || !source) throw new Error('Contradiction requires two statements and a source')
        const contradiction = { id: id('contradiction'), leftType: payload.leftType, leftId: payload.leftId, rightType: payload.rightType, rightId: payload.rightId, leftStatement, rightStatement, source, status: 'CONTRADICTION', resolution: 'OPEN', matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.contradictions.push(contradiction)
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD CONTRADICTION', object: contradiction.id })
      } else if (action === 'record-evidence-gap') {
        const title = String(payload.title || '').trim()
        const requirement = String(payload.requirement || '').trim()
        const nextAction = String(payload.nextAction || '').trim()
        const source = String(payload.source || '').trim()
        if (!title || !requirement || !nextAction || !source) throw new Error('Evidence gap requires title, requirement, next action, and source')
        const gap = { id: id('gap'), title, requirement, nextAction, source, priority: payload.priority || 'MEDIUM', status: 'OPEN', linkedObjects: Array.isArray(payload.linkedObjects) ? payload.linkedObjects : [], matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.evidenceGaps.push(gap)
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD EVIDENCE GAP', object: gap.id })
      } else if (action === 'create-proposition') {
        const authorityId = payload.authorityId || data.law[0]?.id
        const authority = data.law.find((item) => item.id === authorityId)
        const proposition = { id: id('prop'), title: payload.title || 'Statutory condition proposition', text: payload.text || authority?.proposition || 'Proposition requires source verification.', authorityId, status: 'PENDING', source: authority?.source || 'Authority source required', createdAt: now() }
        data.propositions.push(proposition)
        data.law = data.law.map((item) => item.id === authorityId ? { ...item, proposition: proposition.text, propositionId: proposition.id } : item)
        data.audit.push({ id: id('audit'), at: now(), action: 'CREATE PROPOSITION', object: proposition.id })
      } else if (action === 'verify-source') {
        const authority = data.law.find((item) => item.id === payload.authorityId) || data.law[0]
        if (!authority || !/^https?:\/\//.test(String(authority.source || ''))) throw new Error('Authority requires an HTTP(S) source URL before verification')
        if (authority) authority.status = 'VERIFIED'
        authority.verifiedAt = now()
        authority.retrievedAt = authority.verifiedAt
        authority.sourceFreshness = 'CURRENT_REVIEW'
        data.audit.push({ id: id('audit'), at: now(), action: 'VERIFY SOURCE', object: authority?.id || 'none' })
      } else if (action === 'flag-stale-authority') {
        const authority = data.law.find((item) => item.id === payload.authorityId)
        const reason = String(payload.reason || '').trim()
        if (!authority) throw new Error('Authority does not exist')
        if (!reason) throw new Error('Stale authority requires a reason')
        authority.status = 'STALE'
        authority.sourceFreshness = 'STALE'
        authority.staleReason = reason
        authority.updatedAt = now()
        data.audit.push({ id: id('audit'), at: now(), action: 'FLAG STALE AUTHORITY', object: authority.id })
      } else if (action === 'review-authority-source') {
        const authority = data.law.find((item) => item.id === payload.authorityId)
        if (!authority) throw new Error('Authority does not exist')
        const excerpt = String(payload.excerpt || authority.text || '').trim()
        const sourcePage = String(payload.sourcePage || '').trim()
        const sourceVersion = String(payload.sourceVersion || '').trim()
        const effectiveDate = String(payload.effectiveDate || '').trim()
        const jurisdiction = String(payload.jurisdiction || authority.jurisdiction || '').trim()
        const limitations = String(payload.limitations || authority.limitation || '').trim()
        if (!/^https?:\/\//.test(String(authority.source || ''))) throw new Error('Authority review requires an HTTP(S) source URL')
        if (!excerpt || !sourcePage || !sourceVersion || !effectiveDate || !jurisdiction || !limitations) throw new Error('Authority review requires excerpt, source page, version, effective date, jurisdiction, and limitations')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error('Authority effective date requires YYYY-MM-DD')
        authority.text = excerpt
        authority.excerpt = excerpt
        authority.sourcePage = sourcePage
        authority.sourceVersion = sourceVersion
        authority.effectiveDate = effectiveDate
        authority.jurisdiction = jurisdiction
        authority.limitation = limitations
        authority.status = 'VERIFIED'
        authority.reviewedAt = now()
        data.audit.push({ id: id('audit'), at: now(), action: 'REVIEW AUTHORITY SOURCE', object: authority.id })
      } else if (action === 'link-element') {
        const authority = data.law.find((item) => item.id === payload.authorityId) || data.law[0]
        const element = data.elements.find((item) => item.id === payload.elementId) || data.elements[0]
        if (!authority || !element) throw new Error('Law element link target does not exist')
        if (authority.status !== 'VERIFIED') throw new Error('Authority must be verified before linking an element')
        const link = { id: id('prop-link'), propositionId: authority.propositionId || authority.id, elementId: element.id, createdAt: now() }
        data.propositionLinks.push(link)
        authority.links = Array.from(new Set([...(authority.links || []), element.id]))
        element.links = Array.from(new Set([...(element.links || []), authority.id]))
        recalculateCompleteness(data)
        data.audit.push({ id: id('audit'), at: now(), action: 'LINK ELEMENT', object: link.id })
      } else if (action === 'recalculate-completeness') {
        recalculateCompleteness(data)
        data.audit.push({ id: id('audit'), at: now(), action: 'RECALCULATE COMPLETENESS', object: data.claims.map((claim) => claim.id).join(',') })
      } else if (action === 'link-element-fact') {
        const element = data.elements.find((item) => item.id === payload.elementId)
        const fact = data.facts.find((item) => item.id === payload.factId)
        if (!element || !fact) throw new Error('Element fact link target does not exist')
        element.links = Array.from(new Set([...(element.links || []), fact.id]))
        recalculateCompleteness(data)
        data.audit.push({ id: id('audit'), at: now(), action: 'LINK ELEMENT FACT', object: element.id })
      } else if (action === 'build-section') {
        const draft = data.drafts[0]
        if (draft) {
          draft.paragraphs.push({ id: id('para'), text: 'The current record connects the verified condition, notice, and governing authority.', provenance: ['fact-001', 'fact-002', 'ev-001', 'ev-002', 'law-001'], status: 'SUPPORTED', createdAt: now() })
          draft.status = 'BUILT'
          data.paragraphProvenance.push({ id: id('prov'), paragraphId: draft.paragraphs.at(-1).id, sources: draft.paragraphs.at(-1).provenance, createdAt: now() })
        }
        data.audit.push({ id: id('audit'), at: now(), action: 'BUILD SECTION', object: data.drafts[0]?.id || 'none' })
      } else if (action === 'verify-citations') {
        const draft = data.drafts[0]
        const validObjects = [...data.facts, ...data.evidence, ...data.law, ...data.propositions, ...data.events, ...data.people, ...data.organizations]
        const issues = (draft?.paragraphs || []).flatMap((paragraph) => (paragraph.provenance || []).filter((sourceId) => {
          const sourceObject = validObjects.find((item) => item.id === sourceId)
          return !sourceObject || sourceObject.status === 'STALE'
        }).map((sourceId) => ({ paragraphId: paragraph.id, sourceId })))
        if (draft) {
          draft.citationStatus = issues.length ? 'FAILED' : 'VERIFIED'
          draft.citationIssues = issues
          draft.paragraphs = draft.paragraphs.map((paragraph) => ({ ...paragraph, citationStatus: issues.some((issue) => issue.paragraphId === paragraph.id) ? 'FAILED' : 'VERIFIED' }))
        }
        data.audit.push({ id: id('audit'), at: now(), action: issues.length ? 'VERIFY CITATIONS FAILED' : 'VERIFY CITATIONS', object: draft?.id || 'none' })
      } else if (action === 'validate-filing') {
        const draft = data.drafts[0]
        const checks = {
          elements: data.elements.every((item) => item.status === 'COMPLETE'),
          citations: draft?.citationStatus === 'VERIFIED',
          paragraphProvenance: Boolean(draft?.paragraphs?.length) && draft.paragraphs.every((paragraph) => Array.isArray(paragraph.provenance) && paragraph.provenance.length > 0),
          noBrokenSupport: !draft?.paragraphs?.some((paragraph) => ['FAILED', 'CONTRADICTION'].includes(paragraph.status))
        }
        const complete = Object.values(checks).every(Boolean)
        if (draft) { draft.validation = complete ? 'PASSED' : 'FAILED'; draft.validationChecks = checks; draft.validationIssues = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key); draft.validatedAt = now() }
        data.audit.push({ id: id('audit'), at: now(), action: complete ? 'VALIDATE FILING' : 'VALIDATE FILING FAILED', object: draft?.id || 'none' })
      } else if (action === 'export-filing') {
        if (data.drafts[0]?.validation !== 'PASSED') throw new Error('Filing validation has not passed')
        data.drafts[0].exportedAt = now()
        data.audit.push({ id: id('audit'), at: now(), action: 'EXPORT FILING', object: data.drafts[0].id })
      } else if (action === 'open-action') {
        const target = data.evidence.find((item) => item.id === payload.id)
        if (target) target.status = target.status === 'HYPOTHESIS' ? 'PENDING' : target.status
        data.audit.push({ id: id('audit'), at: now(), action: 'OPEN ACTION', object: payload.id || 'none' })
      } else if (action === 'link-machine-front') {
        const front = data.machineFronts.find((item) => item.id === payload.frontId)
        if (!front || !findObject(data, payload.targetType, payload.targetId)) throw new Error('Machine link target does not exist')
        const link = { id: id('machine-link'), frontId: front.id, targetType: payload.targetType, targetId: payload.targetId, relation: payload.relation || 'PROOF', createdAt: now(), updatedAt: now(), matterId: data.matter.id }
        if (!data.machineLinks.some((item) => item.frontId === link.frontId && item.targetType === link.targetType && item.targetId === link.targetId)) data.machineLinks.push(link)
        data.audit.push({ id: id('audit'), at: now(), action: 'LINK MACHINE FRONT', object: link.id })
      } else if (action === 'link-machine-unit') {
        const unit = data.unitMatrixDetailed.find((item) => item.id === payload.unitId)
        if (!unit || !findObject(data, payload.targetType, payload.targetId)) throw new Error('Machine unit link target does not exist')
        const link = { id: id('machine-link'), unitId: unit.id, targetType: payload.targetType, targetId: payload.targetId, relation: payload.relation || 'PROOF', createdAt: now(), updatedAt: now(), matterId: data.matter.id }
        if (!data.machineLinks.some((item) => item.unitId === link.unitId && item.targetType === link.targetType && item.targetId === link.targetId)) data.machineLinks.push(link)
        data.audit.push({ id: id('audit'), at: now(), action: 'LINK MACHINE UNIT', object: link.id })
      } else if (action === 'review-machine-source') {
        const source = data.sourceCatalog.find((item) => item.id === payload.sourceId)
        if (!source) throw new Error('Machine source does not exist')
        source.reviewStatus = payload.reviewStatus || 'REVIEWED_UNVERIFIED'
        source.reviewedAt = now()
        source.reviewNote = payload.note || 'Reviewed as a lead; primary record still required.'
        data.machineActions.push({ id: id('machine-action'), type: 'SOURCE_REVIEW', sourceId: source.id, status: source.reviewStatus, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'REVIEW MACHINE SOURCE', object: source.id })
      } else if (action === 'create-machine-deadline') {
        const title = String(payload.title || '').trim()
        const date = String(payload.date || '').trim()
        if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Machine deadline requires a title and YYYY-MM-DD date')
        const deadline = { id: id('machine-deadline'), title, date, status: 'PENDING', source: payload.source || 'Machine activation record', consequence: payload.consequence || 'MEDIUM', claimDependencies: Array.isArray(payload.claimDependencies) ? payload.claimDependencies : [], evidenceDependencies: Array.isArray(payload.evidenceDependencies) ? payload.evidenceDependencies : [], strategyDependencies: Array.isArray(payload.strategyDependencies) ? payload.strategyDependencies : [], draftDependencies: Array.isArray(payload.draftDependencies) ? payload.draftDependencies : [], machineActionId: payload.machineActionId || null, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.deadlines.push(deadline)
        data.machineActions.push({ id: id('machine-action'), type: 'DEADLINE', deadlineId: deadline.id, status: 'CREATED', createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'CREATE MACHINE DEADLINE', object: deadline.id })
      } else if (action === 'create-preservation-hold') {
        const hold = data.evidenceHolds.find((item) => item.id === payload.holdId)
        if (!hold) throw new Error('Preservation hold does not exist')
        const gap = { id: id('gap'), title: `Preserve ${hold.custodian}`, detail: hold.nativeForm, status: 'OPEN', source: hold.acquisitionPath, evidenceHoldId: hold.id, priority: hold.priority, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        if (!data.evidenceGaps.some((item) => item.evidenceHoldId === hold.id)) data.evidenceGaps.push(gap)
        if (!data.machineActions.some((item) => item.type === 'PRESERVATION_HOLD' && item.holdId === hold.id)) data.machineActions.push({ id: id('machine-action'), type: 'PRESERVATION_HOLD', holdId: hold.id, output: gap.id, status: 'OPEN', createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'CREATE PRESERVATION HOLD', object: gap.id })
      } else if (action === 'record-activation') {
        const activation = data.activationSequence.find((item) => item.id === payload.activationId)
        if (!activation) throw new Error('Activation step does not exist')
        const event = { id: id('machine-action'), type: 'ACTIVATION', activationId: activation.id, output: payload.output || activation.output, status: 'RECORDED', recordedAt: now(), createdAt: now(), matterId: data.matter.id }
        if (!data.machineActions.some((item) => item.type === 'ACTIVATION' && item.activationId === activation.id)) data.machineActions.push(event)
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD ACTIVATION', object: event.id })
      } else if (action === 'record-moderation-review') {
        const review = data.moderateReviews.find((item) => item.id === payload.reviewId)
        if (!review) throw new Error('Moderation review does not exist')
        const intensity = Number(payload.viewpointIntensity)
        const acceptance = Number(payload.acceptanceWidth)
        const confidence = Number(payload.confidence)
        if (![intensity, acceptance, confidence].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error('Moderation scores must be between 0 and 100')
        if (!String(payload.reason || '').trim() || !String(payload.source || '').trim()) throw new Error('Moderation review requires a reason and source')
        review.viewpointIntensity = intensity
        review.acceptanceWidth = acceptance
        review.confidence = confidence
        review.reason = payload.reason
        review.source = payload.source
        review.status = 'REVIEWED'
        review.updatedAt = now()
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD MODERATION REVIEW', object: review.id })
      } else if (action === 'record-strategy-observation') {
        const role = String(payload.role || '').trim().toUpperCase()
        const observation = String(payload.observation || '').trim()
        const source = String(payload.source || '').trim()
        const sourceUniverse = String(payload.sourceUniverse || '').trim()
        const uncertainty = String(payload.uncertainty || '').trim()
        const confidence = Number(payload.confidence)
        if (!['JUDGE', 'OPPONENT'].includes(role)) throw new Error('Strategy role must be JUDGE or OPPONENT')
        if (!observation || !source || !sourceUniverse || !uncertainty) throw new Error('Strategy observation requires observation, source universe, source, and uncertainty')
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) throw new Error('Strategy confidence must be between 0 and 100')
        const record = { id: id('strategy'), role, observation, sourceUniverse, confidence, uncertainty, inference: true, linkedObjects: Array.isArray(payload.linkedObjects) ? payload.linkedObjects : [], source, status: 'INFERENCE', matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.strategyRecords.push(record)
        const key = role === 'JUDGE' ? 'judge' : 'opponent'
        data.strategy[key] = { ...data.strategy[key], confidence: confidence / 100, sourceUniverse, observations: [...(data.strategy[key]?.observations || []), observation] }
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD STRATEGY OBSERVATION', object: record.id })
      } else if (action === 'record-filing') {
        const title = String(payload.title || '').trim()
        const date = String(payload.date || '').trim()
        const source = String(payload.source || '').trim()
        if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !source) throw new Error('Filing requires a title, YYYY-MM-DD date, and source')
        const filing = { id: id('filing'), title, filingType: payload.filingType || 'COURT_FILING', date, court: payload.court || null, docketNumber: payload.docketNumber || null, status: payload.status || 'RECORDED', source, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.courtFilings.push(filing)
        data.docketEntries.push({ id: id('docket'), title, date, docketNumber: filing.docketNumber, filingId: filing.id, status: filing.status, source, matterId: data.matter.id, createdAt: now(), updatedAt: now() })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD FILING', object: filing.id })
      } else if (action === 'record-service') {
        const servedParty = String(payload.servedParty || '').trim()
        const method = String(payload.method || '').trim()
        const date = String(payload.date || '').trim()
        const source = String(payload.source || '').trim()
        if (!servedParty || !method || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !source) throw new Error('Service requires party, method, YYYY-MM-DD date, and source')
        const service = { id: id('service'), filingId: payload.filingId || null, servedParty, method, date, status: payload.status || 'RECORDED', source, proof: payload.proof || null, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.serviceRecords.push(service)
        data.procedure.push({ id: `procedure-${service.id}`, title: `Service on ${servedParty}`, date, type: 'SERVICE', status: service.status, source, serviceId: service.id, matterId: data.matter.id, createdAt: now(), updatedAt: now() })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD SERVICE', object: service.id })
      } else if (action === 'record-docket-entry') {
        const title = String(payload.title || '').trim()
        const date = String(payload.date || '').trim()
        const source = String(payload.source || '').trim()
        if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !source) throw new Error('Docket entry requires a title, YYYY-MM-DD date, and source')
        const entry = { id: id('docket'), title, date, docketNumber: payload.docketNumber || null, status: payload.status || 'RECORDED', source, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.docketEntries.push(entry)
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD DOCKET ENTRY', object: entry.id })
      } else if (action === 'update-procedure-event') {
        const event = data.procedure.find((item) => item.id === payload.eventId)
        if (!event) throw new Error('Procedural event does not exist')
        event.status = payload.status || 'RECORDED'
        event.date = payload.date || event.date
        event.source = payload.source || event.source
        event.recordLocation = payload.recordLocation || event.recordLocation || null
        event.updatedAt = now()
        data.audit.push({ id: id('audit'), at: now(), action: 'UPDATE PROCEDURAL EVENT', object: event.id })
      } else if (action === 'record-procedural-event') {
        const title = String(payload.title || '').trim()
        const date = String(payload.date || '').trim()
        if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Procedural event requires a title and YYYY-MM-DD date')
        const event = { id: id('procedure-event'), title, date, type: payload.type || 'COURT_EVENT', status: payload.status || 'RECORDED', source: payload.source || 'Docket, filing, service, or court record required', recordLocation: payload.recordLocation || null, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.procedure.push(event)
        data.proceduralEvents.push(event)
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD PROCEDURAL EVENT', object: event.id })
      } else if (action === 'record-trial-control') {
        const control = data.trialControls.find((item) => item.id === payload.controlId)
        if (!control) throw new Error('Trial control does not exist')
        const owner = String(payload.owner || '').trim()
        const nextAction = String(payload.nextAction || '').trim()
        const source = String(payload.source || '').trim()
        const ruleSource = String(payload.ruleSource || '').trim()
        if (!owner || !nextAction || !source || !ruleSource) throw new Error('Trial control requires owner, next action, source, and controlling rule')
        if (payload.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date))) throw new Error('Trial control date requires YYYY-MM-DD')
        control.owner = owner
        control.nextAction = nextAction
        control.source = source
        control.ruleSource = ruleSource
        control.date = payload.date || control.date
        control.status = payload.status || 'RECORDED'
        control.linkedObjects = Array.isArray(payload.linkedObjects) ? payload.linkedObjects : control.linkedObjects
        control.defense = payload.defense || control.defense
        control.contradiction = payload.contradiction || control.contradiction
        control.updatedAt = now()
        data.trialActions.push({ id: id('trial-action'), type: 'TRIAL_CONTROL', controlId: control.id, status: control.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL CONTROL', object: control.id })
      } else if (action === 'advance-trial-phase') {
        const phase = data.trialPhases.find((item) => item.id === payload.phaseId)
        if (!phase) throw new Error('Trial phase does not exist')
        const current = data.trialPhases.find((item) => item.id === data.trial.currentPhaseId)
        if (current && phase.order < current.order) throw new Error('Trial phase cannot move backward')
        if (current) current.status = 'COMPLETE'
        phase.status = 'ACTIVE'
        data.trial.currentPhaseId = phase.id
        data.trial.posture = phase.title.toUpperCase()
        data.trial.readiness = data.trialTasks.filter((item) => item.phaseId === phase.id && item.status !== 'COMPLETE').length ? 'INCOMPLETE' : 'READY_FOR_REVIEW'
        data.trialActions.push({ id: id('trial-action'), type: 'PHASE_ADVANCE', phaseId: phase.id, status: 'RECORDED', createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'ADVANCE TRIAL PHASE', object: phase.id })
      } else if (action === 'record-trial-task') {
        const task = data.trialTasks.find((item) => item.id === payload.taskId)
        if (!task) throw new Error('Trial task does not exist')
        task.status = payload.status || 'COMPLETE'
        task.completedAt = task.status === 'COMPLETE' ? now() : null
        if (payload.dueDate) task.dueDate = payload.dueDate
        data.trialActions.push({ id: id('trial-action'), type: 'TASK_UPDATE', taskId: task.id, status: task.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'UPDATE TRIAL TASK', object: task.id })
      } else if (action === 'mark-exhibit-foundation') {
        const exhibit = data.trialExhibits.find((item) => item.id === payload.exhibitId)
        if (!exhibit) throw new Error('Trial exhibit does not exist')
        const witness = payload.witnessId ? data.trialWitnesses.find((item) => item.id === payload.witnessId) : null
        if (payload.witnessId && !witness) throw new Error('Foundation witness does not exist')
        exhibit.custodianId = payload.witnessId || exhibit.custodianId
        exhibit.foundationStatus = payload.status || 'READY_FOR_FOUNDATION'
        exhibit.foundationNote = payload.note || (witness ? `Foundation assigned to ${witness.name}` : 'Foundation witness still required')
        data.trialActions.push({ id: id('trial-action'), type: 'EXHIBIT_FOUNDATION', exhibitId: exhibit.id, witnessId: exhibit.custodianId, status: exhibit.foundationStatus, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'MARK EXHIBIT FOUNDATION', object: exhibit.id })
      } else if (action === 'record-trial-objection') {
        const ground = String(payload.ground || '').trim().toUpperCase()
        if (!ground || !data.trialObjections.some((item) => item.ground === ground)) throw new Error('Objection ground is not in the controlled list')
        const objection = { id: id('trial-objection'), ground, target: payload.target || 'Unspecified testimony or exhibit', phaseId: payload.phaseId || data.trial.currentPhaseId, response: payload.response || null, ruling: payload.ruling || 'PENDING', preserved: Boolean(payload.preserved), createdAt: now(), updatedAt: now(), matterId: data.matter.id }
        data.trialObjections.push(objection)
        data.trialActions.push({ id: id('trial-action'), type: 'OBJECTION', objectionId: objection.id, status: objection.ruling, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL OBJECTION', object: objection.id })
      } else if (action === 'record-trial-ruling') {
        const reasoning = String(payload.reasoning || '').trim()
        const source = String(payload.source || '').trim()
        if (!reasoning || !source || source === 'Court record location required') throw new Error('Ruling requires reasoning and a record location')
        const ruling = { id: id('trial-ruling'), targetType: payload.targetType || 'UNKNOWN', targetId: payload.targetId || null, result: payload.result || 'PENDING', reasoning, preserved: Boolean(payload.preserved), source, createdAt: now(), updatedAt: now(), matterId: data.matter.id }
        data.trialRulings.push(ruling)
        data.trialActions.push({ id: id('trial-action'), type: 'RULING', rulingId: ruling.id, status: ruling.result, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL RULING', object: ruling.id })
      } else if (action === 'record-examination') {
        const examination = data.trialExaminations.find((item) => item.id === payload.examinationId)
        if (!examination) throw new Error('Trial examination does not exist')
        examination.status = payload.status || 'READY'
        examination.notes = payload.notes || examination.notes
        examination.completedAt = examination.status === 'COMPLETE' ? now() : null
        data.trialActions.push({ id: id('trial-action'), type: 'EXAMINATION', examinationId: examination.id, status: examination.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD EXAMINATION', object: examination.id })
      } else if (action === 'record-trial-motion') {
        const motion = data.trialMotions.find((item) => item.id === payload.motionId)
        if (!motion) throw new Error('Trial motion does not exist')
        if (!String(payload.source || motion.ruleSource || '').trim() || String(payload.source || motion.ruleSource).includes('required')) throw new Error('Trial motion requires a controlling-rule source')
        motion.status = payload.status || 'READY_FOR_REVIEW'
        motion.hearingDate = payload.hearingDate || motion.hearingDate || null
        motion.ruleSource = payload.source || motion.ruleSource
        data.trialActions.push({ id: id('trial-action'), type: 'MOTION', motionId: motion.id, status: motion.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL MOTION', object: motion.id })
      } else if (action === 'record-jury-instruction') {
        const instruction = data.juryInstructions.find((item) => item.id === payload.instructionId)
        if (!instruction) throw new Error('Jury instruction does not exist')
        if (!String(payload.source || instruction.source || '').trim() || String(payload.source || instruction.source).includes('required')) throw new Error('Jury instruction requires a controlling source')
        instruction.status = payload.status || 'READY_FOR_REVIEW'
        instruction.source = payload.source || instruction.source
        data.trialActions.push({ id: id('trial-action'), type: 'JURY_INSTRUCTION', instructionId: instruction.id, status: instruction.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD JURY INSTRUCTION', object: instruction.id })
      } else if (action === 'record-witness-foundation') {
        const witness = data.trialWitnesses.find((item) => item.id === payload.witnessId)
        if (!witness) throw new Error('Trial witness does not exist')
        witness.status = payload.status || 'FOUNDATION_RECORDED'
        witness.foundationNote = payload.note || witness.foundationNote || 'Foundation record requires transcript or exhibit source.'
        data.trialActions.push({ id: id('trial-action'), type: 'WITNESS_FOUNDATION', witnessId: witness.id, status: witness.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD WITNESS FOUNDATION', object: witness.id })
      } else if (action === 'record-exhibit-admission') {
        const exhibit = data.trialExhibits.find((item) => item.id === payload.exhibitId)
        if (!exhibit) throw new Error('Trial exhibit does not exist')
        const result = String(payload.result || '').trim().toUpperCase()
        if (!['ADMITTED', 'EXCLUDED', 'LIMITED', 'PENDING'].includes(result)) throw new Error('Exhibit admission result is invalid')
        exhibit.admissionResult = result
        exhibit.status = result === 'ADMITTED' ? 'ADMITTED' : result === 'EXCLUDED' ? 'EXCLUDED' : result === 'LIMITED' ? 'LIMITED' : 'FOUNDATION_NEEDED'
        exhibit.admissionSource = payload.source || 'Court record or stipulation required'
        data.trialActions.push({ id: id('trial-action'), type: 'EXHIBIT_ADMISSION', exhibitId: exhibit.id, status: result, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD EXHIBIT ADMISSION', object: exhibit.id })
      } else if (action === 'record-trial-event') {
        const title = String(payload.title || '').trim()
        const source = String(payload.source || '').trim()
        if (!title) throw new Error('Trial event requires a title')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ''))) throw new Error('Trial event date requires YYYY-MM-DD')
        if (!source || source.includes('required')) throw new Error('Trial event requires a transcript, docket, or court record source')
        const event = { id: id('trial-event'), title, date: payload.date, type: payload.type || 'COURTROOM', source, status: payload.status || 'RECORDED', phaseId: payload.phaseId || data.trial.currentPhaseId, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.trialEvents.push(event)
        data.trialActions.push({ id: id('trial-action'), type: 'TRIAL_EVENT', eventId: event.id, status: event.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL EVENT', object: event.id })
      } else if (action === 'record-trial-argument') {
        const text = String(payload.text || '').trim()
        const source = String(payload.source || '').trim()
        if (!text) throw new Error('Trial argument requires text')
        if (!source || source.includes('required')) throw new Error('Trial argument requires an admitted record or notes source')
        const argument = { id: id('trial-argument'), side: payload.side || 'PLAINTIFF', segment: payload.segment || 'OPENING', text, source, status: payload.status || 'DRAFT', phaseId: payload.phaseId || data.trial.currentPhaseId, matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.trialArguments.push(argument)
        data.trialActions.push({ id: id('trial-action'), type: 'TRIAL_ARGUMENT', argumentId: argument.id, status: argument.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL ARGUMENT', object: argument.id })
      } else if (action === 'record-appeal-issue') {
        const issue = String(payload.issue || '').trim()
        if (!issue) throw new Error('Appeal issue requires text')
        const appealIssue = { id: id('appeal-issue'), issue, rulingId: payload.rulingId || null, preservation: payload.preservation || 'NOT_REVIEWED', recordLocation: payload.recordLocation || null, status: 'OPEN', createdAt: now(), updatedAt: now(), matterId: data.matter.id }
        data.trialAppealIssues.push(appealIssue)
        data.trialActions.push({ id: id('trial-action'), type: 'APPEAL_ISSUE', issueId: appealIssue.id, status: appealIssue.preservation, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD APPEAL ISSUE', object: appealIssue.id })
      } else if (action === 'record-verdict') {
        const judgment = data.trialJudgments[0]
        if (!judgment) throw new Error('Judgment record does not exist')
        const verdict = String(payload.verdict || '').trim()
        if (!verdict) throw new Error('Verdict requires a recorded result')
        judgment.verdict = verdict
        judgment.verdictStatus = 'RECORDED'
        judgment.verdictSource = payload.source || 'Verdict form or clerk record required'
        data.trialActions.push({ id: id('trial-action'), type: 'VERDICT', judgmentId: judgment.id, status: 'RECORDED', createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD VERDICT', object: judgment.id })
      } else if (action === 'record-judgment') {
        const judgment = data.trialJudgments[0]
        if (!judgment) throw new Error('Judgment record does not exist')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.entryDate || ''))) throw new Error('Judgment entry date requires YYYY-MM-DD')
        if (payload.serviceDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(payload.serviceDate))) throw new Error('Judgment service date requires YYYY-MM-DD')
        const source = String(payload.source || '').trim()
        if (!source || source.includes('required')) throw new Error('Judgment requires a court record source')
        judgment.judgmentStatus = 'ENTERED'
        judgment.entryDate = payload.entryDate
        judgment.serviceDate = payload.serviceDate || null
        judgment.appealDeadline = payload.appealDeadline || null
        judgment.relief = payload.relief || null
        judgment.source = source
        if (judgment.appealDeadline && /^\d{4}-\d{2}-\d{2}$/.test(judgment.appealDeadline)) {
          const deadline = { id: `deadline-appeal-${judgment.id}`, title: 'Notice of appeal deadline', date: judgment.appealDeadline, status: 'PENDING', source, consequence: 'HIGH', dependency: judgment.id, createdAt: now(), updatedAt: now() }
          data.deadlines = data.deadlines.filter((item) => item.id !== deadline.id).concat(deadline)
        }
        data.trialActions.push({ id: id('trial-action'), type: 'JUDGMENT', judgmentId: judgment.id, status: 'ENTERED', createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD JUDGMENT', object: judgment.id })
      } else if (action === 'record-trial-cost') {
        const cost = data.trialCosts.find((item) => item.id === payload.costId)
        if (!cost) throw new Error('Trial cost record does not exist')
        if (payload.amount !== null && payload.amount !== undefined && (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) < 0)) throw new Error('Trial cost amount must be a non-negative number')
        const source = String(payload.source || '').trim()
        if (!source || source.includes('required')) throw new Error('Trial cost requires a receipt or court record source')
        cost.amount = payload.amount ?? cost.amount
        cost.status = payload.status || 'RECORDED'
        cost.source = source
        data.trialActions.push({ id: id('trial-action'), type: 'COST', costId: cost.id, status: cost.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD TRIAL COST', object: cost.id })
      } else if (action === 'record-enforcement-step') {
        const step = data.trialEnforcement.find((item) => item.id === payload.stepId)
        if (!step) throw new Error('Enforcement step does not exist')
        if (data.trialJudgments[0]?.judgmentStatus !== 'ENTERED') throw new Error('Enforcement requires an entered judgment')
        const recordLocation = String(payload.recordLocation || '').trim()
        if (!recordLocation || recordLocation.includes('required')) throw new Error('Enforcement requires a record location')
        step.status = payload.status || 'RECORDED'
        step.recordLocation = recordLocation
        data.trialActions.push({ id: id('trial-action'), type: 'ENFORCEMENT', stepId: step.id, status: step.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD ENFORCEMENT STEP', object: step.id })
      } else if (action === 'record-appellate-step') {
        const step = data.trialAppeals.find((item) => item.id === payload.stepId)
        if (!step) throw new Error('Appellate step does not exist')
        if (payload.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(payload.dueDate))) throw new Error('Appellate due date requires YYYY-MM-DD')
        const recordLocation = String(payload.recordLocation || '').trim()
        if (!recordLocation || recordLocation.includes('required')) throw new Error('Appellate step requires a docket or record source')
        step.status = payload.status || 'RECORDED'
        step.dueDate = payload.dueDate || step.dueDate
        step.recordLocation = recordLocation
        data.trialActions.push({ id: id('trial-action'), type: 'APPEAL_STEP', stepId: step.id, status: step.status, createdAt: now(), matterId: data.matter.id })
        data.audit.push({ id: id('audit'), at: now(), action: 'RECORD APPELLATE STEP', object: step.id })
      } else {
        throw new Error(`Unknown case action: ${action}`)
      }
      await this.persist()
      return data
    },
    search(query) {
      const needle = String(query || '').trim().toLowerCase()
      if (!needle) return []
      const groups = { LAW: 'law', CLAIMS: 'claims', EVIDENCE: 'evidence', GAPS: 'evidenceGaps', CONTRADICTIONS: 'contradictions', DRAFTS: 'drafts', PEOPLE: 'people', EVENTS: 'events', FILINGS: 'courtFilings', SERVICE: 'serviceRecords', DOCKET: 'docketEntries', PROCEDURE: 'procedure', DEADLINES: 'deadlines', MODERATE: 'moderateReviews', STRATEGY: 'strategyRecords', ORGANIZATIONS: 'organizationProfiles', 'PROPERTY RECORDS': 'propertyRecords', 'TRIAL CONTROLS': 'trialControls', 'MACHINE FRONTS': 'machineFronts', 'MACHINE UNITS': 'unitMatrixDetailed', 'EVIDENCE HOLDS': 'evidenceHolds', SOURCES: 'sourceCatalog', WITNESSES: 'trialWitnesses', EXHIBITS: 'trialExhibits', MOTIONS: 'trialMotions', 'TRIAL TASKS': 'trialTasks', 'TRIAL EVENTS': 'trialEvents', ARGUMENTS: 'trialArguments', 'APPEAL ISSUES': 'trialAppealIssues', JUDGMENTS: 'trialJudgments', COSTS: 'trialCosts', ENFORCEMENT: 'trialEnforcement', APPEALS: 'trialAppeals' }
      return Object.entries(groups).flatMap(([type, collection]) => data[collection].filter((item) => JSON.stringify(item).toLowerCase().includes(needle)).slice(0, 20).map((item) => ({ id: item.id, type, name: item.title || item.name || item.filename || item.id, status: item.status || 'ACTIVE', source: item.source || item.provenance || 'Matter store', matterId: data.matter.id })))
    },
    async linkEvidence(evidenceId, targetType, targetId) {
      const evidence = data.evidence.find((item) => item.id === evidenceId)
      if (!evidence || !findObject(data, targetType, targetId)) throw new Error('Evidence link target does not exist')
      const link = { id: id('link'), evidenceId, targetType, targetId, createdAt: now() }
      if (!data.evidenceLinks.some((item) => item.evidenceId === evidenceId && item.targetType === targetType && item.targetId === targetId)) data.evidenceLinks.push(link)
      evidence.links = Array.from(new Set([...(evidence.links || []), targetId]))
      evidence.linkedElements = targetType === 'element' ? Array.from(new Set([...(evidence.linkedElements || []), targetId])) : evidence.linkedElements || []
      evidence.linkedEvents = targetType === 'event' ? Array.from(new Set([...(evidence.linkedEvents || []), targetId])) : evidence.linkedEvents || []
      evidence.linkedPeople = targetType === 'person' ? Array.from(new Set([...(evidence.linkedPeople || []), targetId])) : evidence.linkedPeople || []
      evidence.linkedSystems = ['organization', 'system'].includes(targetType) ? Array.from(new Set([...(evidence.linkedSystems || []), targetId])) : evidence.linkedSystems || []
      if (targetType === 'element') recalculateCompleteness(data)
      data.audit.push({ id: id('audit'), at: now(), action: 'LINK EVIDENCE', object: link.id })
      await this.persist()
      return data
    },
    async deriveDeadlines() {
      const derived = data.procedure.filter((item) => item.type === 'DEADLINE').map((item) => ({ id: `deadline-${item.id}`, title: item.title, date: item.date, status: item.status, source: item.source, procedureId: item.id, claimDependencies: item.claimDependencies || [], evidenceDependencies: item.evidenceDependencies || [], strategyDependencies: item.strategyDependencies || [], draftDependencies: item.draftDependencies || [], consequence: item.title.toLowerCase().includes('service') ? 'HIGH' : 'MEDIUM', createdAt: item.createdAt || null, updatedAt: now() }))
      const manual = data.deadlines.filter((item) => !item.procedureId)
      const next = [...derived, ...manual]
      if (JSON.stringify(data.deadlines) === JSON.stringify(next)) return data
      data.deadlines = next
      data.audit.push({ id: id('audit'), at: now(), action: 'DERIVE DEADLINES', object: data.deadlines.map((item) => item.id).join(',') })
      await this.persist()
      return data
    },
    async stageEvidence(filePathToRead) {
      const bytes = await fs.readFile(filePathToRead)
      const fileStat = await fs.stat(filePathToRead)
      const extension = path.extname(filePathToRead).toLowerCase()
      const processed = await processEvidenceBytes(bytes, extension)
      return { id: id('stage'), name: path.basename(filePathToRead), originalPath: filePathToRead, bytes: bytes.length, hash: `sha256:${processed.hash}`, type: extension.slice(1).toUpperCase() || 'FILE', source: 'Local import', status: 'STAGED', extractedText: processed.extractedText, extractionMethod: processed.extractionMethod, extractionConfidence: processed.extractionConfidence, custodian: null, originalTimestamps: { birthtime: fileStat.birthtime.toISOString(), mtime: fileStat.mtime.toISOString() } }
    },
    stageTextEvidence(text) {
      const bytes = Buffer.from(text, 'utf8')
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      return { id: id('stage'), name: 'Clipboard text', originalPath: null, bytes: bytes.length, hash: `sha256:${hash}`, type: 'TEXT', source: 'Clipboard import', status: 'STAGED', extractedText: text, extractionMethod: 'DIRECT', extractionConfidence: 1, custodian: null, originalTimestamps: null }
    },
    async commitEvidence(staged) {
      if (!Array.isArray(staged) || staged.some((item) => !item || item.status !== 'STAGED' || !/^sha256:[a-f0-9]{64}$/.test(item.hash))) throw new Error('Evidence must be staged with a valid SHA-256 hash')
      if (staged.some((item) => !String(item.source || '').trim() || !String(item.custodian || '').trim())) throw new Error('Evidence commitment requires a source and custodian')
      for (const item of staged) {
        if (item.originalPath) {
          const bytes = await fs.readFile(item.originalPath)
          const digest = crypto.createHash('sha256').update(bytes).digest('hex')
          if (item.hash !== `sha256:${digest}`) throw new Error(`Evidence hash mismatch for ${item.name || item.originalPath}`)
        } else if (!item.originalPath && item.extractedText !== undefined) {
          const digest = crypto.createHash('sha256').update(String(item.originalExtractedText ?? item.extractedText ?? ''), 'utf8').digest('hex')
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
        data.extractedText.push(...committed.filter((item) => item.extractedText).map((item) => ({ id: id('text'), evidenceId: item.id, text: item.extractedText, originalText: item.originalExtractedText || item.extractedText, correction: item.extractionCorrection || null, extractionMethod: item.extractionMethod || 'UNKNOWN', extractionConfidence: item.extractionConfidence ?? null, createdAt: now() })))
      data.evidence.push(...committed)
      data.agentJobs.push({ id: id('job'), type: 'HASH_EXTRACT_INDEX', status: 'COMPLETE', records: committed.length, startedAt: now(), finishedAt: now() })
      data.audit.push({ id: id('audit'), at: now(), action: duplicates.length ? 'COMMIT EVIDENCE / DUPLICATE DETECTED' : 'COMMIT EVIDENCE', object: committed.map((item) => item.id).join(', ') || duplicates.map((item) => item.hash).join(', ') }); await this.persist(); return data
    },
    health() {
      const active = data.agentJobs.filter((job) => job.status === 'RUNNING').length
      return { db: 'VERIFIED', index: 'READY', agents: active, jobs: data.agentJobs.filter((job) => job.status !== 'COMPLETE').length, completedJobs: data.agentJobs.filter((job) => job.status === 'COMPLETE').length }
    },
    evidenceManifest() {
      return { version: 1, generatedAt: now(), matter: { id: data.matter.id, name: data.matter.name, address: data.matter.address }, evidence: data.evidence.map((item) => ({ id: item.id, name: item.name, originalPath: item.originalPath || null, storedPath: item.storedPath || null, hash: item.hash, source: item.source || null, custodian: item.custodian || null, originalTimestamps: item.originalTimestamps || null, importedAt: item.importedAt || null, extractionMethod: item.extractionMethod || null, extractionConfidence: item.extractionConfidence ?? null, links: item.links || [], status: item.status })), audit: data.audit.filter((item) => ['COMMIT EVIDENCE', 'COMMIT EVIDENCE / DUPLICATE DETECTED'].includes(item.action)) }
    },
    backupSnapshot() {
      return { version: data.version, generatedAt: now(), matterId: data.matter.id, state: data }
    },
    async addContext(record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Context record must be an object')
      if (record.type === 'CICERO_ORGANIZATION_PROFILE' && !String(record.name || '').trim()) throw new Error('Organization profile requires a name')
      const contextRecord = { ...record, id: id('ctx'), createdAt: now(), updatedAt: now(), status: 'CONTEXT_ONLY', matterId: data.matter.id }
      data.context.push(contextRecord)
      if (record.type === 'CICERO_ORGANIZATION_PROFILE') {
        const profile = { id: id('org-profile'), organizationId: id('org-context'), name: record.name, employees: Number(record.employees) || 0, roles: Array.isArray(record.roles) ? record.roles : [], sourceNote: record.source || 'Source note required', assumptions: record.assumptions || 'Estimate; assumptions require review.', confidence: Number(record.confidence) || 0, status: 'ESTIMATE', contextId: contextRecord.id, linkedPeople: [], linkedEvents: [], matterId: data.matter.id, createdAt: now(), updatedAt: now() }
        data.organizationProfiles.push(profile)
        data.organizations.push({ id: profile.organizationId, name: profile.name, role: 'CICERO ORGANIZATION PROFILE', status: 'ESTIMATE_CONTEXT', source: profile.sourceNote, confidence: profile.confidence, profileId: profile.id, matterId: data.matter.id, createdAt: now(), updatedAt: now() })
        data.audit.push({ id: id('audit'), at: now(), action: 'IMPORT CICERO ORGANIZATION PROFILE', object: profile.id })
      }
      data.audit.push({ id: id('audit'), at: now(), action: 'IMPORT AS CONTEXT', object: contextRecord.id })
      await this.persist()
      return data
    },
    ledgerSummary() {
      const counts = data.ledger.requirements.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result }, {})
      return { total: data.ledger.requirements.length, counts, sourceCount: data.ledger.sourceCount, checksum: data.ledger.checksum }
    },
    ledgerRequirements(query = '', status = 'ALL', limit = 100) {
      const needle = String(query || '').trim().toLowerCase()
      const selectedStatus = String(status || 'ALL')
      return data.ledger.requirements.filter((item) => (selectedStatus === 'ALL' || item.status === selectedStatus) && (!needle || JSON.stringify(item).toLowerCase().includes(needle))).slice(0, Math.min(Math.max(Number(limit) || 100, 1), 500))
    }
  }
}

module.exports = { createStore }
