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
  sources: files,
  families: familyLabels,
  rules: { pastedClaims: 'LEAD_UNTIL_PRIMARY_SOURCE', residentReports: 'LEAD_UNTIL_CORROBORATED', addressIdentity: 'EXACT_PROPERTY_REQUIRED', contextImport: 'EXPLICIT_ACTION_REQUIRED' }
}

const requirements = Array.from({ length: 1050 }, (_, index) => ({
  id: String(index + 1).padStart(4, '0'), status: 'UNREAD', sourceRefs: [], featureRefs: [], implementationEvidence: [], testEvidence: [], screenshotEvidence: [], updatedAt: null
}))
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
fs.writeFileSync(path.join(output, 'MASTER-LEDGER.json'), JSON.stringify({ version: 2, total: 1050, generatedAt: new Date().toISOString(), requirements }, null, 2) + '\n')
const implemented = requirements.filter((item) => item.status === 'IMPLEMENTED').length
const markdown = ['# Proscriptio Master Completion Ledger', '', 'Generated from the 1,050-point completion plan.', '', `- Total requirements: **${requirements.length}**`, `- Implemented baseline: **${implemented}**`, `- Remaining requirements: **${requirements.length - implemented}**`, `- Attachment sources indexed: **${files.length}**`, '', '| ID | Status | Feature refs | Evidence |', '|---:|---|---|---|', ...requirements.map((item) => `| ${item.id} | ${item.status} | ${item.featureRefs.join(', ') || '—'} | ${item.implementationEvidence.join(', ') || '—'} |`), ''].join('\n')
fs.writeFileSync(path.join(output, 'MASTER-LEDGER.md'), markdown)
console.log(`Generated ledger for ${files.length} attachments and ${requirements.length} requirements`)
