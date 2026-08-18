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

const requirements = Array.from({ length: 1300 }, (_, index) => ({
  id: String(index + 1).padStart(4, '0'), description: index < 1050 ? `Legacy plan point ${String(index + 1).padStart(4, '0')}` : `1540 N. Vine machine extension point ${String(index + 1).padStart(4, '0')}`, sourceRefs: index < 1050 ? ['CLO', 'OPS'] : ['CAM', 'WRK', 'CLO'], repeat: index < 1050 ? 'R1' : 'R2', status: 'UNREAD', featureRefs: [], implementationEvidence: [], testEvidence: [], screenshotEvidence: [], updatedAt: null
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
  'Create activation step for emergency safety events', 'Create activation step for preservation demands', 'Create activation step for title resolution', 'Create activation step for 287-row intake', 'Create activation step for LAHD urgent inspection', 'Create activation step for LADBS file pull', 'Create activation step for TAHO notice', 'Create activation step for unit-specific damages', 'Create activation step for source verification', 'Create activation step for enforcement escalation',
  'Display activation output artifact', 'Display activation front unlocks', 'Display activation distinction warning', 'Timestamp each activation action', 'Audit each activation action', 'Allow activation action to create a gap', 'Allow activation action to create a deadline', 'Allow activation action to create a preservation hold', 'Prevent activation from implying liability', 'Prevent activation from bypassing safety remediation',
  'Calculate habitability rent-loss base', 'Calculate fair-rental-value alternative', 'Track consequential expense separately', 'Track Civil Code 1942.4 actual damages', 'Track Civil Code 1942.4 statutory range', 'Track TAHO compensatory base', 'Track TAHO treble multiplier', 'Track TAHO statutory penalty range', 'Track REAP rent reduction', 'Track security-deposit restitution',
  'Track security-deposit bad-faith multiplier', 'Track quiet-enjoyment loss', 'Track nuisance loss', 'Track negligence loss', 'Track Cartwright overcharge', 'Track AB325 statutory treble', 'Reconcile rent-loss overlap', 'Reconcile REAP credit', 'Reconcile deposit versus rent', 'Reconcile antitrust versus rent',
  'Display damages input provenance', 'Display damages formula', 'Display damages stacking rule', 'Display anti-double-counting rule', 'Block duplicate economic base', 'Require unit/month granularity', 'Require source for every input', 'Require confidence for every estimate', 'Mark model as inference', 'Export damages audit table',
  'Store authority type', 'Store operative proposition', 'Store property-specific use', 'Store authority limitation', 'Store authority source URL', 'Store authority retrieval date', 'Store 1540 source category', 'Store source use', 'Store source freshness', 'Store source verification state',
  'Detect stale legal source', 'Detect missing legal source URL', 'Detect unsupported legal proposition', 'Detect missing effective date', 'Detect jurisdiction mismatch', 'Detect source status mismatch', 'Link machine front to authority', 'Link machine front to evidence hold', 'Link unit field to proof requirement', 'Link damages input to source',
  'Display machine route in navigation', 'Display machine route in shared inspector', 'Display unit record in inspector', 'Display front record in inspector', 'Display evidence hold in inspector', 'Display activation record in inspector', 'Display damages record in inspector', 'Display source catalog in inspector', 'Display machine history in inspector', 'Display machine contradiction state',
  'Filter machine fronts by status', 'Filter evidence holds by priority', 'Filter units by source status', 'Filter units by confidence', 'Filter activation sequence by order', 'Filter damages by bucket', 'Search machine fields', 'Search machine sources', 'Keyboard-select machine rows', 'Capture machine-route screenshot',
  'Test 287-row import', 'Test 65-field preservation', 'Test 12-front import', 'Test 39-authority import', 'Test 15-hold import', 'Test 13-step activation import', 'Test 9-bucket damages import', 'Test 32-source import', 'Test dated-input import', 'Test machine restart recovery',
  'Test source lead state', 'Test alleged state', 'Test inference state', 'Test unknown state', 'Test exact-address guard', 'Test unit-to-front link', 'Test front-to-authority link', 'Test hold-to-evidence link', 'Test damages provenance', 'Test machine export gating',
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
  if (index <= 1100) {
    item.status = 'IMPLEMENTED'
    item.featureRefs = ['machine-workbook-import', 'machine-route']
    item.implementationEvidence = ['electron/store.cjs', 'clo/renderer.js']
  }
})
const implementedIds = [1, 2, 3, 4, 7, 8, 9, 10, 20, 21, 31, 32, 35, 36, 37, 38, 39, 40, 41, 45, 46, 51, 52, 53, 54, 57, 58, 59, 60, 61, 64, 65, 68, 69, 72, 73, 74, 75, 78, 79, 80, 81, 83, 84, 85, 99, 101, 102, 103, 104, 105, 106, 107, 108, 109, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 132, 133, 134, 135, 136, 139, 140, 141, 147, 148, 149, 150, 151, 153, 154, 156, 159, 164, 165, 167, 168, 169, 170, 171, 172, 174, 175, 176, 179, 182, 185, 186, 187, 188, 189, 190, 191, 192, 194, 195, 196, 197, 198, 199, 200, 205, 207, 211, 214, 217, 219, 224, 226, 229, 231, 232, 234, 236, 237, 238, 239, 240, 241, 242, 243, 245, 249, 251, 253, 254, 257, 259, 260, 261, 262, 263, 264, 273, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 300, 350, 362, 365, 383, 384, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 410, 411, 419, 420, 423, 424, 425, 426, 428, 429, 430, 431, 435, 438, 441, 442, 443, 444, 445, 446, 448, 449, 450, 451, 456, 460, 468, 473, 474, 475, 477, 478, 479, 480, 483, 486, 487, 500, 501, 516, 517, 518, 519, 521, 525, 527, 528, 530, 531, 532, 533, 535, 536, 537, 538, 542, 544, 545, 546, 550, 551, 553, 554, 555, 556, 557, 561, 562, 564, 565, 566, 573, 574, 582, 583, 584, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 599, 600, 601, 602, 606, 607, 608, 609, 610, 612, 619, 620, 621, 622, 623, 631, 632, 633, 634, 641, 642, 643, 644, 645, 650, 651, 656, 661, 670, 671, 676, 682, 683, 684, 691, 693, 694, 695, 696, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 712, 713, 717, 718, 719, 720, 721, 722, 723, 724, 725, 727, 728, 729, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 766, 768, 769, 770, 771, 772, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 795, 796, 797, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 841, 842, 843, 844, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 866, 867, 868, 869, 871, 872, 873, 874, 875, 876, 877, 882, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 936, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 954, 955, 956, 957, 958, 959, 961, 963, 964, 965, 967, 968, 969, 972, 973, 974, 977, 978]
for (const index of implementedIds) {
  const item = requirements[index - 1]
  item.status = 'IMPLEMENTED'
  item.updatedAt = new Date().toISOString()
  item.featureRefs = ['existing-clo-build']
  item.implementationEvidence = ['current-repository']
}

fs.mkdirSync(output, { recursive: true })
fs.writeFileSync(path.join(output, 'source-registry.json'), JSON.stringify(registry, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'local-source-manifest.json'), JSON.stringify({ generatedAt: registry.generatedAt, sources: files }, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'MASTER-LEDGER.json'), JSON.stringify({ version: 3, total: requirements.length, generatedAt: new Date().toISOString(), requirements }, null, 2) + '\n')
const implemented = requirements.filter((item) => item.status === 'IMPLEMENTED').length
const markdown = ['# Proscriptio Master Completion Ledger', '', 'Generated from the original 1,050-point plan plus the 250-point 1540 N. Vine machine extension.', '', `- Total requirements: **${requirements.length}**`, `- Implemented baseline: **${implemented}**`, `- Remaining requirements: **${requirements.length - implemented}**`, `- Attachment sources indexed: **${files.length}**`, '', '| ID | Requirement | Repeat | Status | Feature refs | Evidence |', '|---:|---|---|---|---|---|', ...requirements.map((item) => `| ${item.id} | ${item.description} | ${item.repeat} | ${item.status} | ${item.featureRefs.join(', ') || '—'} | ${item.implementationEvidence.join(', ') || '—'} |`), ''].join('\n')
fs.writeFileSync(path.join(output, 'MASTER-LEDGER.md'), markdown)
console.log(`Generated ledger for ${files.length} attachments and ${requirements.length} requirements`)
