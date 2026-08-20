const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const root = path.join(__dirname, '..')
const attachmentRoot = '/Users/rjack/.codex/attachments'
const output = path.join(root, 'docs')
const familyLabels = ['USR', 'CLO', 'VIS', 'RNT', 'CIC', 'MOD', 'CAM', 'WRK', 'SPN', 'LAW', 'HSE', 'MAR', 'DJ', 'ADT', 'OPS']
const extracts = path.join(output, 'source-extracts')
const files = fs.existsSync(attachmentRoot) ? fs.readdirSync(attachmentRoot).sort().flatMap((id) => {
  const filename = path.join(attachmentRoot, id, 'pasted-text.txt')
  if (!fs.existsSync(filename)) return []
  const bytes = fs.readFileSync(filename)
  fs.mkdirSync(extracts, { recursive: true })
  fs.writeFileSync(path.join(extracts, `${id}.txt`), bytes)
  return [{ id, filename, textPath: `docs/source-extracts/${id}.txt`, bytes: bytes.length, lines: bytes.toString('utf8').split(/\r?\n/).length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), ingestedAt: new Date().toISOString() }]
}) : []

const registry = {
  version: 1,
  generatedAt: new Date().toISOString(),
  attachmentCount: files.length,
  sources: files.map(({ id, bytes, lines, sha256, ingestedAt }) => ({ id, bytes, lines, sha256, ingestedAt })),
  families: familyLabels,
  rules: { pastedClaims: 'LEAD_UNTIL_PRIMARY_SOURCE', residentReports: 'LEAD_UNTIL_CORROBORATED', addressIdentity: 'EXACT_PROPERTY_REQUIRED', contextImport: 'EXPLICIT_ACTION_REQUIRED' }
}

const requirements = Array.from({ length: 2820 }, (_, index) => ({
  id: String(index + 1).padStart(4, '0'), description: index < 1050 ? `Legacy plan point ${String(index + 1).padStart(4, '0')}` : index < 1300 ? `1540 N. Vine machine extension point ${String(index + 1).padStart(4, '0')}` : index < 1600 ? `CLO representation acceptance point ${String(index + 1).padStart(4, '0')}` : index < 2700 ? `Trial operating acceptance point ${String(index + 1).padStart(4, '0')}` : `Post-trial and appellate acceptance point ${String(index + 1).padStart(4, '0')}`, sourceRefs: index < 1050 ? ['CLO', 'OPS'] : index < 1300 ? ['CAM', 'WRK', 'CLO'] : index < 1600 ? ['CLO', 'VIS', 'CAM', 'WRK'] : ['CLO', 'LAW', 'CAM', 'VIS', 'OPS'], repeat: index < 1050 ? 'R1' : index < 1300 ? 'R2' : index < 1600 ? 'R3' : 'R4+', status: 'UNREAD', featureRefs: [], implementationEvidence: [], testEvidence: [], screenshotEvidence: [], updatedAt: null
}))
const machineTopics = [
  'Verify exact fee-title SPV identity from recorded deed', 'Verify successor manager and service agent disclosure', 'Verify Camden predecessor control period', 'Verify public sale date against deed date', 'Verify 287-unit asset identity', 'Verify 37 known public unit IDs', 'Track 250 unknown unit IDs', 'Store building certificate-of-occupancy year', 'Store current brand and legacy operator', 'Store public sale price as a lead',
  'Store buyer public description as a lead', 'Store title-SPV uncertainty', 'Store current manager public signal', 'Store other management-layer uncertainty', 'Store occupancy start', 'Store lease start', 'Store lease end', 'Store security deposit amount', 'Store transfer-notice state', 'Store successor-disclosure state',
  'Store JCO eligibility', 'Store FMR nonpayment threshold', 'Store arrears', 'Store UD notice date', 'Store LAHD filing date', 'Store RTC notice state', 'Store hot-water incident count', 'Store measured-temperature evidence', 'Store work-order IDs', 'Store neighbor matches',
  'Store BMS alarm link', 'Store Smart Water data link', 'Store vendor dispatch link', 'Store LAHD order state', 'Store urgent two-day order state', 'Store REAP state', 'Store Civil Code section 1942.4 clock state', 'Store elevator incidents', 'Store fire-door issues', 'Store amenity outage',
  'Store protected activity', 'Store retaliation 180-day window', 'Store TAHO written notice', 'Store accommodation request', 'Store RealPage property coverage', 'Store RMS activation period', 'Store pricing-log evidence', 'Store rent-abatement input', 'Store consequential cost', 'Store TAHO compensatory input',
  'Store deposit claim input', 'Store antitrust overcharge input', 'Store anti-double-counting notes', 'Store evidence-completion percentage', 'Store row source status', 'Store row confidence', 'Store fastest-fill action', 'Store primary custodian', 'Render unit-level epistemic state', 'Render unit-level proof percentage',
  'Render hot-water front trigger', 'Render hot-water present state', 'Render hot-water defense', 'Render hot-water proof counter', 'Render hot-water remedy', 'Render LAHD urgent-repair trigger', 'Render REAP gate state', 'Render Civil Code 1942.4 four-gate state', 'Render TAHO bad-faith state', 'Render JCO/FMR unit-specific state',
  'Render acquisition-transition 15-day clock', 'Render predecessor/successor allocation', 'Render deposit-transfer proof', 'Render rent-control exemption distinction', 'Render retaliation timing', 'Render fire-safety front', 'Render elevator front', 'Render balcony/SB721 front', 'Render pricing/RealPage front', 'Render applicant-screening front',
  'Render fee and RUBS front', 'Render towing and garage front', 'Render payment-platform front', 'Render immigration-retaliation front', 'Render tenant-organizing front', 'Render construction-paper-trail front', 'Render water-compliance front', 'Render permit-scope front', 'Render inspection-order front', 'Render enforcement-chain bottleneck',
  'Preserve current fee-owner transaction data', 'Preserve acquisition agreement', 'Preserve claims and complaint schedules', 'Preserve deferred-maintenance schedule', 'Preserve insurance loss runs', 'Preserve price adjustments', 'Preserve management agreements', 'Preserve delegation matrix', 'Preserve payroll and staff records', 'Preserve payee and service-agent notices',
  'Preserve resident-platform native records', 'Preserve ticket open timestamps', 'Preserve ticket close timestamps', 'Preserve ticket reopen timestamps', 'Preserve ticket comments', 'Preserve ticket attachments', 'Preserve resident IDs without dossiers', 'Preserve payment history', 'Preserve moderation/deleted-post logs', 'Preserve migration field crosswalk',
  'Preserve migration validation reports', 'Preserve migration cutover logs', 'Preserve migration backups', 'Preserve DHW supply temperatures', 'Preserve DHW return temperatures', 'Preserve tank temperatures', 'Preserve pump status and current', 'Preserve mixing-valve position', 'Preserve BMS alarms and resets', 'Preserve BMS overrides',
  'Preserve lead-lag state', 'Preserve plant runtime', 'Preserve pressure and flow data', 'Preserve Smart Water consumption', 'Preserve Smart Water leak events', 'Preserve Smart Water anomaly flags', 'Preserve elevator telemetry', 'Preserve fire-door telemetry', 'Preserve balcony inspection records', 'Preserve permit and inspection records',
  'Create activation step for emergency safety events', 'Create activation step for preservation demands', 'Create activation step for title resolution', 'Create activation step for 287-row intake', 'Create activation step for LAHD urgent inspection', 'Create activation step for LADBS file pull', 'Create activation step for TAHO notice', 'Create activation step for unit-specific damages', 'Create activation step for source verification', 'Create activation step for enforcement escalation', 'Create machine deadline from explicit date',
  'Display activation output artifact', 'Display activation front unlocks', 'Display activation distinction warning', 'Timestamp each activation action', 'Audit each activation action', 'Allow activation action to create a gap', 'Allow activation action to create a deadline', 'Allow activation action to create a preservation hold', 'Prevent activation from implying liability', 'Prevent activation from bypassing safety remediation',
  'Calculate habitability rent-loss base', 'Calculate fair-rental-value alternative', 'Track consequential expense separately', 'Track Civil Code 1942.4 actual damages', 'Track Civil Code 1942.4 statutory range', 'Track TAHO compensatory base', 'Track TAHO treble multiplier', 'Track TAHO statutory penalty range', 'Track REAP rent reduction', 'Track security-deposit restitution',
  'Track security-deposit bad-faith multiplier', 'Track quiet-enjoyment loss', 'Track nuisance loss', 'Track negligence loss', 'Track Cartwright overcharge', 'Track AB325 statutory treble', 'Reconcile rent-loss overlap', 'Reconcile REAP credit', 'Reconcile deposit versus rent', 'Reconcile antitrust versus rent',
  'Display damages input provenance', 'Display damages formula', 'Display damages stacking rule', 'Display anti-double-counting rule', 'Block duplicate economic base', 'Require unit/month granularity', 'Require source for every input', 'Require confidence for every estimate', 'Mark model as inference', 'Export damages audit table',
  'Store authority type', 'Store operative proposition', 'Store property-specific use', 'Store authority limitation', 'Store authority source URL', 'Store authority retrieval date', 'Store 1540 source category', 'Store source use', 'Store source freshness', 'Store source verification state', 'Review machine source without elevating lead',
  'Detect stale legal source', 'Detect missing legal source URL', 'Detect unsupported legal proposition', 'Detect missing effective date', 'Detect jurisdiction mismatch', 'Detect source status mismatch', 'Link machine front to authority', 'Link machine front to evidence hold', 'Link unit field to proof requirement', 'Link damages input to source',
  'Display machine route in navigation', 'Display machine route in shared inspector', 'Display unit record in inspector', 'Display front record in inspector', 'Display evidence hold in inspector', 'Display activation record in inspector', 'Display damages record in inspector', 'Display source catalog in inspector', 'Display authority register', 'Display machine history in inspector', 'Display machine contradiction state',
  'Filter machine fronts by status', 'Filter evidence holds by priority', 'Filter units by source status', 'Filter units by confidence', 'Filter activation sequence by order', 'Filter damages by bucket', 'Search machine fields', 'Search machine sources', 'Keyboard-select machine rows', 'Capture machine-route screenshot',
  'Test 287-row import', 'Test 65-field preservation', 'Test 12-front import', 'Test 39-authority import', 'Test 15-hold import', 'Test 13-step activation import', 'Test 9-bucket damages import', 'Test 32-source import', 'Test dated-input import', 'Test machine restart recovery',
  'Test source lead state', 'Test alleged state', 'Test inference state', 'Test unknown state', 'Test exact-address guard', 'Test unit-to-front link', 'Test front-to-authority link', 'Test hold-to-evidence link', 'Test damages provenance', 'Test machine deadline creation', 'Test machine export gating',
  'Prevent public allegation from becoming fact', 'Prevent title lead from becoming owner fact', 'Prevent permit existence from proving violation', 'Prevent resident report from proving pattern', 'Prevent common-system hypothesis from proving topology', 'Prevent source URL from proving property record', 'Prevent nearby-address conflation', 'Prevent parent-company assumption', 'Prevent defense suppression', 'Prevent unsupported remedy claim',
  'Require lawful acquisition path for every hold', 'Require native format for preserved record', 'Require custodian for every hold', 'Require preservation-risk label', 'Require source row for machine record', 'Require audit history for machine mutation', 'Require matter ID for machine object', 'Require timestamps for machine object', 'Require status for machine object', 'Require explicit context-only state',
  'Grade machine geometry', 'Grade machine hierarchy', 'Grade machine density', 'Grade machine source visibility', 'Grade machine state clarity', 'Grade machine inspector clarity', 'Grade machine action language', 'Grade machine accessibility', 'Grade machine responsive behavior', 'Grade machine screenshot fidelity'
]
machineTopics.slice(0, 250).forEach((description, offset) => {
  const index = 1051 + offset
  const item = requirements[index - 1]
  item.description = description
  item.sourceRefs = ['CAM', 'WRK', 'CLO']
  item.repeat = 'R2'
})
const implementedMachine = [
  'Verify 287-unit asset identity', 'Store 37 known public unit IDs', 'Track 250 unknown unit IDs', 'Render unit-level epistemic state', 'Create machine deadline from explicit date', 'Review machine source without elevating lead',
  'Display machine route in navigation', 'Display machine route in shared inspector', 'Display unit record in inspector', 'Display front record in inspector',
  'Display evidence hold in inspector', 'Display activation record in inspector', 'Display damages record in inspector', 'Display source catalog in inspector',
  'Display machine history in inspector', 'Display authority register', 'Search machine fields', 'Keyboard-select machine rows', 'Test 287-row import', 'Test 65-field preservation',
  'Test 12-front import', 'Test 39-authority import', 'Test 15-hold import', 'Test 13-step activation import', 'Test 9-bucket damages import', 'Test machine deadline creation',
  'Test 32-source import', 'Test dated-input import', 'Test machine restart recovery', 'Test unit-to-front link', 'Require source row for machine record',
  'Require audit history for machine mutation', 'Require matter ID for machine object', 'Require timestamps for machine object', 'Require status for machine object',
  'Require explicit context-only state', 'Link machine front to evidence hold', 'Link machine front to authority'
]
for (const description of implementedMachine) {
  const item = requirements.find((candidate) => candidate.description === description)
  if (item) { item.status = 'IMPLEMENTED'; item.featureRefs = ['machine-workbook-import', 'machine-route']; item.implementationEvidence = ['electron/store.cjs', 'clo/renderer.js', 'tests/camden.test.cjs']; item.updatedAt = new Date().toISOString() }
}
const representationSurfaces = [
  'shared shell rail', 'shared top bar', 'shared status strip', 'shared inspector', 'Command legal branch band', 'Command next-action field', 'Command live-risk field', 'Command transition chronology', 'Evidence reality map', 'Evidence source queue',
  'Evidence import drawer', 'Evidence chronology', 'Law authority tree', 'Law source text', 'Law proposition chain', 'Elements claim selector', 'Elements proof panel', 'Elements provenance graph', 'Elements build pipeline', 'Procedure docket chronology',
  'Procedure dependency field', 'Strategy judge surface', 'Strategy opponent surface', 'Draft paragraph list', 'Draft source rail', 'Deadline time field', 'Deadline derivation inspector', 'Field Atlas context import', 'Cicero organization profile', 'Machine unit matrix'
]
const representationChecks = [
  'renders a loading state without shifting the shell', 'renders an empty state with a next action and no marketing copy', 'renders a selected state with inspector synchronization', 'renders an unselected state with neutral hierarchy', 'renders a pending ochre state with a text label', 'renders a contradiction oxide state with a text label', 'renders a verified cobalt state with a source label', 'renders a complete viridian state with a completion label', 'renders a keyboard-focus state without hover dependency', 'renders a responsive state without hiding source or action semantics'
]
const representationTopics = representationSurfaces.flatMap((surface) => representationChecks.map((check) => `${surface}: ${check}`))
representationTopics.forEach((description, offset) => {
  const index = 1301 + offset
  const item = requirements[index - 1]
  item.description = description
  item.sourceRefs = ['CLO', 'VIS', 'CAM', 'WRK']
  item.repeat = 'R3'
})
const implementedRepresentation = [
  'shared shell rail: renders a selected state with inspector synchronization',
  'shared top bar: renders a selected state with inspector synchronization',
  'shared status strip: renders a verified cobalt state with a source label',
  'shared inspector: renders a selected state with inspector synchronization',
  'Command legal branch band: renders a selected state with inspector synchronization',
  'Command next-action field: renders a selected state with inspector synchronization',
  'Evidence reality map: renders an unselected state with neutral hierarchy',
  'Evidence source queue: renders a selected state with inspector synchronization',
  'Evidence import drawer: renders a pending ochre state with a text label',
  'Law authority tree: renders a selected state with inspector synchronization',
  'Law source text: renders a verified cobalt state with a source label',
  'Elements provenance graph: renders a selected state with inspector synchronization',
  'Procedure docket chronology: renders a selected state with inspector synchronization',
  'Machine unit matrix: renders a selected state with inspector synchronization',
  'Machine unit matrix: renders a keyboard-focus state without hover dependency',
  'Machine unit matrix: renders a responsive state without hiding source or action semantics'
]
for (const description of implementedRepresentation) {
  const item = requirements.find((candidate) => candidate.description === description)
  if (item) { item.status = 'IMPLEMENTED'; item.featureRefs = ['shared-renderer-surfaces']; item.implementationEvidence = ['clo/renderer.js', 'clo/styles.css']; item.updatedAt = new Date().toISOString() }
}
const trialSurfaces = [
  'trial matter identity', 'trial jurisdiction', 'trial venue', 'trial parties', 'trial service record', 'trial operative pleading', 'trial answer and defenses', 'trial cross-claims', 'trial requested relief', 'trial scheduling order',
  'trial case-management conference', 'trial discovery plan', 'trial preservation notice', 'trial discovery requests', 'trial discovery responses', 'trial privilege log', 'trial inspection request', 'trial subpoena plan', 'trial deposition plan', 'trial discovery motion',
  'trial expert disclosure', 'trial expert qualification', 'trial expert methodology', 'trial expert materials', 'trial expert rebuttal', 'trial dispositive motion', 'trial motion in limine', 'trial opposition', 'trial reply', 'trial hearing logistics',
  'trial settlement record', 'trial pretrial conference', 'trial pretrial statement', 'trial witness list', 'trial exhibit list', 'trial exhibit objections', 'trial proposed stipulations', 'trial proposed instructions', 'trial trial brief', 'trial courtroom logistics',
  'trial voir dire topics', 'trial cause challenge', 'trial peremptory record', 'trial juror question', 'trial jury admonition', 'trial opening theory', 'trial opening proof map', 'trial plaintiff order of proof', 'trial defense order of proof', 'trial rebuttal order',
  'trial fact witness', 'trial adverse witness', 'trial expert witness', 'trial custodian witness', 'trial witness foundation', 'trial witness personal knowledge', 'trial witness credibility', 'trial witness impeachment', 'trial witness sequestration', 'trial witness accommodation',
  'trial direct examination', 'trial cross examination', 'trial redirect examination', 'trial recross examination', 'trial examination outline', 'trial leading question control', 'trial nonresponsive answer', 'trial offer of proof', 'trial testimony correction', 'trial transcript citation',
  'trial documentary exhibit', 'trial demonstrative exhibit', 'trial physical exhibit', 'trial public record', 'trial business record', 'trial electronic communication', 'trial photograph', 'trial video or audio', 'trial metadata', 'trial exhibit admission',
  'trial hearsay objection', 'trial authentication objection', 'trial relevance objection', 'trial foundation objection', 'trial best-evidence objection', 'trial speculation objection', 'trial prejudice objection', 'trial cumulative objection', 'trial ruling record', 'trial objection preservation',
  'trial jury instruction elements', 'trial burden instruction', 'trial credibility instruction', 'trial damages instruction', 'trial no-double-recovery instruction', 'trial closing argument', 'trial rebuttal closing', 'trial verdict form', 'trial judgment entry', 'trial costs request',
  'trial post-trial motion', 'trial new-trial issue', 'trial judgment notwithstanding issue', 'trial stay request', 'trial enforcement step', 'trial notice of appeal', 'trial appellate deadline', 'trial record designation', 'trial preserved issue', 'trial appellate argument'
]
const trialChecks = [
  'has a named owner and responsible next action', 'has a source or explicit source gap', 'has a controlling-rule placeholder', 'has a date or explicit date dependency', 'has a status distinct from completion', 'has a provenance link to facts or evidence', 'has a contradiction or defense field', 'has an inspectable audit history', 'has a keyboard and responsive representation', 'has an end-to-end acceptance test'
]
const trialTopics = trialSurfaces.flatMap((surface) => trialChecks.map((check) => `${surface}: ${check}`))
trialTopics.forEach((description, offset) => {
  const index = 1601 + offset
  const item = requirements[index - 1]
  item.description = description
  item.sourceRefs = ['CLO', 'LAW', 'CAM', 'VIS', 'OPS']
  item.repeat = 'R4+'
})
const postTrialSurfaces = [
  'post-trial judgment entry and service', 'post-trial motion calendar', 'post-trial cost memorandum', 'post-judgment satisfaction and accounting',
  'post-judgment stay analysis', 'post-judgment enforcement selection', 'appellate notice of appeal', 'appellate jurisdiction and appealability',
  'appellate record designation', 'appellate transcript and reporter record', 'appellate brief calendar', 'appellate disposition and remand'
]
const postTrialChecks = [
  'has a named owner and responsible next action', 'has a source or explicit source gap', 'has a controlling-rule placeholder', 'has a date or explicit date dependency',
  'has a status distinct from completion', 'has a provenance link to facts or evidence', 'has a contradiction or defense field', 'has an inspectable audit history',
  'has a keyboard and responsive representation', 'has an end-to-end acceptance test'
]
const postTrialTopics = postTrialSurfaces.flatMap((surface) => postTrialChecks.map((check) => `${surface}: ${check}`))
postTrialTopics.forEach((description, offset) => {
  const index = 2701 + offset
  const item = requirements[index - 1]
  item.description = description
  item.sourceRefs = ['CLO', 'LAW', 'CAM', 'VIS', 'OPS']
  item.repeat = 'R4+'
})
const implementedPostTrial = [
  'post-trial judgment entry and service: has a source or explicit source gap', 'post-trial judgment entry and service: has a date or explicit date dependency',
  'post-trial judgment entry and service: has a status distinct from completion', 'post-trial judgment entry and service: has an inspectable audit history',
  'post-trial cost memorandum: has a source or explicit source gap', 'post-trial cost memorandum: has a provenance link to facts or evidence',
  'post-judgment satisfaction and accounting: has a status distinct from completion', 'post-judgment stay analysis: has a source or explicit source gap',
  'post-judgment enforcement selection: has an inspectable audit history', 'appellate notice of appeal: has a date or explicit date dependency',
  'appellate record designation: has a source or explicit source gap', 'appellate transcript and reporter record: has a provenance link to facts or evidence',
  'appellate brief calendar: has a date or explicit date dependency', 'appellate disposition and remand: has an inspectable audit history'
]
for (const description of implementedPostTrial) {
  const item = requirements.find((candidate) => candidate.description === description)
  if (item) { item.status = 'IMPLEMENTED'; item.featureRefs = ['trial-post-verdict']; item.implementationEvidence = ['electron/store.cjs', 'clo/renderer.js', 'tests/camden.test.cjs']; item.updatedAt = new Date().toISOString() }
}
const implementedTrial = [
  'trial matter identity: has a named owner and responsible next action', 'trial scheduling order: has a source or explicit source gap', 'trial witness list: has a status distinct from completion',
  'trial exhibit list: has a provenance link to facts or evidence', 'trial witness foundation: has a contradiction or defense field', 'trial direct examination: has an inspectable audit history',
  'trial documentary exhibit: has a provenance link to facts or evidence', 'trial hearsay objection: has a named owner and responsible next action', 'trial ruling record: has an inspectable audit history',
  'trial objection preservation: has a status distinct from completion', 'trial jury instruction elements: has a controlling-rule placeholder', 'trial verdict form: has a source or explicit source gap',
  'trial post-trial motion: has a date or explicit date dependency', 'trial notice of appeal: has a date or explicit date dependency', 'trial preserved issue: has a provenance link to facts or evidence',
  'trial appellate argument: has an inspectable audit history', 'trial service record: has a source or explicit source gap', 'trial service record: has a date or explicit date dependency',
  'trial service record: has a status distinct from completion', 'trial service record: has an inspectable audit history', 'trial case-management conference: has a source or explicit source gap',
  'trial case-management conference: has a date or explicit date dependency'
]
for (const description of implementedTrial) {
  const item = requirements.find((candidate) => candidate.description === description)
  if (item) { item.status = 'IMPLEMENTED'; item.featureRefs = ['trial-route', 'trial-store']; item.implementationEvidence = ['electron/store.cjs', 'clo/renderer.js', 'tests/camden.test.cjs']; item.updatedAt = new Date().toISOString() }
}
const implementedIds = [1, 2, 3, 4, 7, 8, 9, 10, 20, 21, 31, 32, 35, 36, 37, 38, 39, 40, 41, 45, 46, 51, 52, 53, 54, 57, 58, 59, 60, 61, 64, 65, 68, 69, 72, 73, 74, 75, 78, 79, 80, 81, 83, 84, 85, 99, 101, 102, 103, 104, 105, 106, 107, 108, 109, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 132, 133, 134, 135, 136, 139, 140, 141, 147, 148, 149, 150, 151, 153, 154, 156, 159, 164, 165, 167, 168, 169, 170, 171, 172, 174, 175, 176, 179, 182, 185, 186, 187, 188, 189, 190, 191, 192, 194, 195, 196, 197, 198, 199, 200, 205, 207, 211, 214, 217, 219, 224, 226, 229, 231, 232, 234, 236, 237, 238, 239, 240, 241, 242, 243, 245, 249, 251, 253, 254, 257, 259, 260, 261, 262, 263, 264, 273, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 300, 350, 362, 365, 383, 384, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 410, 411, 419, 420, 423, 424, 425, 426, 428, 429, 430, 431, 435, 438, 441, 442, 443, 444, 445, 446, 448, 449, 450, 451, 456, 460, 468, 473, 474, 475, 477, 478, 479, 480, 483, 486, 487, 500, 501, 516, 517, 518, 519, 521, 525, 527, 528, 530, 531, 532, 533, 535, 536, 537, 538, 542, 544, 545, 546, 550, 551, 553, 554, 555, 556, 557, 561, 562, 564, 565, 566, 573, 574, 582, 583, 584, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 599, 600, 601, 602, 606, 607, 608, 609, 610, 612, 619, 620, 621, 622, 623, 631, 632, 633, 634, 641, 642, 643, 644, 645, 650, 651, 656, 661, 670, 671, 676, 682, 683, 684, 691, 693, 694, 695, 696, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 712, 713, 717, 718, 719, 720, 721, 722, 723, 724, 725, 727, 728, 729, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 766, 768, 769, 770, 771, 772, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 795, 796, 797, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 841, 842, 843, 844, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 866, 867, 868, 869, 871, 872, 873, 874, 875, 876, 877, 882, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 936, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 954, 955, 956, 957, 958, 959, 961, 963, 964, 965, 967, 968, 969, 972, 973, 974, 977, 978]
implementedIds.push(745)
implementedIds.push(412, 413, 414, 415, 416, 417, 418, 421, 436, 437)
implementedIds.push(269, 270, 271, 272, 274)
implementedIds.push(520, 522, 524, 540)
for (const index of implementedIds) {
  const item = requirements[index - 1]
  item.status = 'IMPLEMENTED'
  item.updatedAt = new Date().toISOString()
  item.featureRefs = ['existing-clo-build']
  item.implementationEvidence = ['current-repository']
}

// These rows have concrete mutation and test evidence from the current tranche.
// Keep this separate from the broad legacy baseline so the ledger never treats
// a fixture or a rendered label as proof of a behavior that has no test.
const concreteEvidence = new Map([
  [236, { featureRefs: ['deadline-derivation'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/store.test.cjs', 'tests/camden.test.cjs'] }],
  [645, { featureRefs: ['deadline-dependency-fields'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [650, { featureRefs: ['deadline-restart-recovery'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [520, { featureRefs: ['authority-source-review'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [522, { featureRefs: ['authority-source-review'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [524, { featureRefs: ['authority-source-review'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [540, { featureRefs: ['authority-source-review'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [269, { featureRefs: ['property-address-guard'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [270, { featureRefs: ['property-address-guard'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [271, { featureRefs: ['property-address-guard'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [272, { featureRefs: ['property-address-guard'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [273, { featureRefs: ['property-address-guard'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [274, { featureRefs: ['property-address-guard'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/camden.test.cjs'] }],
  [1642, { featureRefs: ['trial-control-register'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [1644, { featureRefs: ['trial-control-register'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [1645, { featureRefs: ['trial-control-register'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [1648, { featureRefs: ['trial-control-register'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [780, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['cicero/main.js', 'electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [781, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['cicero/main.js', 'electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [782, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['cicero/index.html', 'cicero/main.js', 'electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [783, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['cicero/index.html', 'cicero/main.js', 'electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [784, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['cicero/index.html', 'cicero/main.js', 'electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [785, { featureRefs: ['cicero-estimate-boundary'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/ledger.test.cjs'] }],
  [786, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [787, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [788, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [789, { featureRefs: ['cicero-profile-persistence'], implementationEvidence: ['cicero/main.js', 'electron/store.cjs'], testEvidence: ['tests/ledger.test.cjs'] }],
  [429, { featureRefs: ['extraction-provenance'], implementationEvidence: ['electron/hash-worker.cjs', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [430, { featureRefs: ['extraction-provenance'], implementationEvidence: ['electron/hash-worker.cjs', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [412, { featureRefs: ['evidence-staging-drawer'], implementationEvidence: ['clo/renderer.js'], testEvidence: ['tests/store.test.cjs'] }],
  [413, { featureRefs: ['evidence-staging-drawer'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [414, { featureRefs: ['evidence-staging-drawer'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [415, { featureRefs: ['evidence-commit-metadata'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [416, { featureRefs: ['evidence-commit-metadata'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [417, { featureRefs: ['evidence-commit-metadata'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [418, { featureRefs: ['evidence-commit-metadata'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [421, { featureRefs: ['evidence-hash-deduplication'], implementationEvidence: ['electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [436, { featureRefs: ['evidence-staging-boundary'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/store.test.cjs'] }],
  [437, { featureRefs: ['evidence-commit-confirmation'], implementationEvidence: ['clo/renderer.js', 'electron/store.cjs'], testEvidence: ['tests/store.test.cjs'] }],
  [704, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [705, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [706, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [707, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [708, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [709, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [710, { featureRefs: ['strategy-observation-record'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [723, { featureRefs: ['filing-validation'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/store.test.cjs', 'tests/camden.test.cjs'] }],
  [724, { featureRefs: ['filing-export-gate'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/store.test.cjs', 'tests/camden.test.cjs'] }],
  [727, { featureRefs: ['deadline-field'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [728, { featureRefs: ['deadline-field'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [729, { featureRefs: ['deadline-field'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [738, { featureRefs: ['shared-inspector'], implementationEvidence: ['clo/renderer.js'], testEvidence: ['tests/constitution.test.cjs'] }],
  [745, { featureRefs: ['deadline-derivation'], implementationEvidence: ['electron/store.cjs', 'clo/renderer.js'], testEvidence: ['tests/camden.test.cjs'] }],
  [800, { featureRefs: ['secondary-route-shell'], implementationEvidence: ['clo/renderer.js', 'cicero/main.js'], testEvidence: ['tests/constitution.test.cjs'] }]
])
for (const [requirementId, evidence] of concreteEvidence) {
  const item = requirements[requirementId - 1]
  if (!item || item.status !== 'IMPLEMENTED') continue
  item.featureRefs = evidence.featureRefs
  item.implementationEvidence = evidence.implementationEvidence
  item.testEvidence = evidence.testEvidence
  item.updatedAt = new Date().toISOString()
}

fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'source-registry.json'), JSON.stringify(registry, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'local-source-manifest.json'), JSON.stringify({ generatedAt: registry.generatedAt, sources: files }, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'MASTER-LEDGER.json'), JSON.stringify({ version: 3, total: requirements.length, generatedAt: new Date().toISOString(), requirements }, null, 2) + '\n')
const implemented = requirements.filter((item) => item.status === 'IMPLEMENTED').length
const markdown = ['# Proscriptio Master Completion Ledger', '', 'Generated from the original 1,050-point plan, the 250-point 1540 N. Vine machine extension, the 300-point shared-renderer representation extension, and the 1,000-point full-trial operating extension.', '', `- Total requirements: **${requirements.length}**`, `- Implemented baseline: **${implemented}**`, `- Remaining requirements: **${requirements.length - implemented}**`, `- Attachment sources indexed: **${files.length}**`, '', '| ID | Requirement | Repeat | Status | Feature refs | Evidence |', '|---:|---|---|---|---|---|', ...requirements.map((item) => `| ${item.id} | ${item.description} | ${item.repeat} | ${item.status} | ${item.featureRefs.join(', ') || '—'} | ${item.implementationEvidence.join(', ') || '—'} |`), ''].join('\n')
fs.writeFileSync(path.join(output, 'MASTER-LEDGER.md'), markdown)
console.log(`Generated ledger for ${files.length} attachments and ${requirements.length} requirements`)
