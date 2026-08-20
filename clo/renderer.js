const el = (selector) => document.querySelector(selector)
const stage = el('#stage')
const inspector = el('#inspector')
const drawer = el('#drawer')
const state = { route: 'command', data: null, selected: null, inspectorTab: 'DETAIL', evidencePage: 0, machineQuery: '', ledgerQuery: '', ledgerStatus: 'ALL', ledgerRows: [], stagedItems: [] }

document.addEventListener('click', (event) => {
  if (event.target?.id === 'record-procedure-filing') runProcedureFiling()
  if (event.target?.id === 'record-procedure-service') runProcedureService()
})

const installProcedureDocketField = () => {
  if (state.route !== 'procedure' || el('#record-procedure-docket')) return
  const grid = stage.querySelector('.stage-grid')
  if (!grid) return
  const article = document.createElement('article')
  article.className = 'field wide-field'
  article.innerHTML = '<div class="field-header"><h2 class="field-title">Record docket entry</h2><span class="field-meta">TITLE + DATE + SOURCE</span></div><div class="trial-form"><input id="procedure-docket-title" class="search-input" placeholder="Docket entry title" aria-label="Docket entry title"><input id="procedure-docket-number" class="search-input" placeholder="Docket number" aria-label="Docket number"><input id="procedure-docket-date" class="search-input" type="date" aria-label="Docket entry date"><input id="procedure-docket-source" class="search-input" placeholder="Docket source" aria-label="Docket source"><button id="record-procedure-docket" class="action-button">RECORD DOCKET ENTRY</button></div>'
  grid.append(article)
  const docketRows = (state.data.docketEntries || []).slice(-12).reverse().map((item) => `<div class="object-row" data-select="${safe(item.id)}"><div><strong>${safe(item.title)}</strong><small>${safe(item.date)} · docket ${safe(item.docketNumber || 'UNNUMBERED')} · ${safe(item.source)}</small></div><b class="${statusClass(item.status)}">${safe(item.status)}</b></div>`).join('')
  article.insertAdjacentHTML('beforeend', `<div class="field-header"><h2 class="field-title">Committed docket</h2><span class="field-meta">${(state.data.docketEntries || []).length} ENTRIES</span></div><div class="object-list">${docketRows || '<p class="muted">No docket entries committed.</p>'}</div>`)
  el('#record-procedure-docket').addEventListener('click', runProcedureDocket)
}

new MutationObserver(installProcedureDocketField).observe(stage, { childList: true })

const installCoverageControls = () => {
  if (state.route !== 'coverage' || stage.querySelector('#record-coverage-gap')) return
  const grid = stage.querySelector('.stage-grid')
  if (!grid) return
  const facts = state.data.facts || []
  const options = facts.map((item) => `<option value="${safe(item.id)}">${safe(item.title || item.id)}</option>`).join('')
  const article = document.createElement('article')
  article.className = 'field wide-field coverage-controls'
  article.innerHTML = `<div class="field-header"><h2 class="field-title">Open proof controls</h2><span class="field-meta">SOURCE + NEXT ACTION REQUIRED</span></div><div class="coverage-form"><input id="coverage-gap-title" class="search-input" placeholder="Evidence gap title" aria-label="Evidence gap title"><input id="coverage-gap-requirement" class="search-input" placeholder="Required proof" aria-label="Evidence gap requirement"><input id="coverage-gap-next" class="search-input" placeholder="Next verification action" aria-label="Evidence gap next action"><input id="coverage-gap-source" class="search-input" placeholder="Gap source" aria-label="Evidence gap source"><button id="record-coverage-gap" class="utility-button">RECORD GAP</button></div><div class="coverage-form"><select id="coverage-left-fact" aria-label="Contradiction left fact">${options}</select><input id="coverage-left-statement" class="search-input" placeholder="Left statement" aria-label="Contradiction left statement"><select id="coverage-right-fact" aria-label="Contradiction right fact">${options}</select><input id="coverage-right-statement" class="search-input" placeholder="Right statement" aria-label="Contradiction right statement"><input id="coverage-contradiction-source" class="search-input" placeholder="Comparison source" aria-label="Contradiction source"><button id="record-coverage-contradiction" class="utility-button">RECORD CONTRADICTION</button></div>`
  const propertyRows = (state.data.propertyRecords || []).map((item) => `<div class="object-row"><div><strong>${safe(item.address)}</strong><small>${safe(item.addressIdentity)} · ${safe(item.source)}</small></div><b class="${item.linkedToMatter ? 'state-pending' : 'state-danger'}">${item.linkedToMatter ? 'LEAD' : 'NO MATTER LINK'}</b></div>`).join('')
  article.insertAdjacentHTML('beforeend', `<div class="field-header"><h2 class="field-title">Verify property identity</h2><span class="field-meta">EXACT ADDRESS REQUIRED</span></div><div class="coverage-form"><input id="coverage-property-address" class="search-input" placeholder="Full property address" aria-label="Property address"><input id="coverage-property-source" class="search-input" placeholder="Recorder / agency source" aria-label="Property record source"><button id="record-coverage-property" class="utility-button">RECORD PROPERTY SOURCE</button></div><div class="object-list">${propertyRows || '<p class="muted">No property identity records committed.</p>'}</div>`)
  grid.append(article)
  el('#record-coverage-gap').addEventListener('click', runCoverageGap)
  el('#record-coverage-contradiction').addEventListener('click', runCoverageContradiction)
  el('#record-coverage-property').addEventListener('click', runCoverageProperty)
}

new MutationObserver(installCoverageControls).observe(stage, { childList: true })

const installSystemExportControls = () => {
  if (state.route !== 'system' || stage.querySelector('#export-evidence-manifest')) return
  const grid = stage.querySelector('.stage-grid')
  if (!grid) return
  const article = document.createElement('article')
  article.className = 'field wide-field system-export-controls'
  article.innerHTML = '<div class="field-header"><h2 class="field-title">Local exports</h2><span class="field-meta">PROVENANCE-PRESERVING</span></div><p class="muted">Exports retain matter identity, source metadata, hashes, audit history, and uncertainty state.</p><div class="button-row"><button id="export-evidence-manifest" class="utility-button">EXPORT EVIDENCE MANIFEST</button><button id="export-case-backup" class="utility-button">EXPORT CASE BACKUP</button></div>'
  grid.append(article)
  el('#export-evidence-manifest').addEventListener('click', exportEvidenceManifest)
  el('#export-case-backup').addEventListener('click', exportCaseBackup)
}

new MutationObserver(installSystemExportControls).observe(stage, { childList: true })

const installStrategyLinkControl = () => {
  if (state.route !== 'strategy' || stage.querySelector('#strategy-links')) return
  const button = stage.querySelector('#record-strategy')
  if (!button) return
  const input = document.createElement('input')
  input.id = 'strategy-links'
  input.className = 'search-input'
  input.placeholder = 'Linked object IDs, comma separated'
  input.setAttribute('aria-label', 'Strategy linked object IDs')
  button.before(input)
}

new MutationObserver(installStrategyLinkControl).observe(stage, { childList: true })

const installValidationSummary = () => {
  if (!['elements', 'drafts'].includes(state.route) || stage.querySelector('#validation-issues')) return
  const draft = state.data.drafts?.[0]
  if (!draft?.validation) return
  const grid = stage.querySelector('.stage-grid')
  if (!grid) return
  const article = document.createElement('article')
  article.id = 'validation-issues'
  article.className = 'field wide-field validation-summary'
  const issues = draft.validationIssues || []
  article.innerHTML = `<div class="field-header"><h2 class="field-title">Validation result</h2><span class="field-meta">${safe(draft.validation)}</span></div>${issues.length ? `<p class="label state-danger">EXPORT BLOCKED</p><div class="object-list">${issues.map((item) => `<div class="object-row"><strong>${safe(item)}</strong><b class="state-danger">OPEN</b></div>`).join('')}</div>` : '<p class="label state-complete">ALL CHECKS PASSED</p>'}`
  grid.append(article)
}

new MutationObserver(installValidationSummary).observe(stage, { childList: true })

const installEvidenceLinkControls = () => {
  const object = currentObject()
  const card = inspector.querySelector('.inspector-card')
  if (!object || object.objectType !== 'EVIDENCE' || !card || inspector.querySelector('#link-evidence-target')) return
  const targets = [
    ...(state.data.elements || []).map((item) => ({ type: 'element', id: item.id, label: `ELEMENT · ${item.title}` })),
    ...(state.data.events || []).map((item) => ({ type: 'event', id: item.id, label: `EVENT · ${item.title || item.id}` })),
    ...(state.data.people || []).map((item) => ({ type: 'person', id: item.id, label: `PERSON · ${item.name || item.id}` })),
    ...(state.data.organizations || []).map((item) => ({ type: 'organization', id: item.id, label: `ORGANIZATION · ${item.name || item.id}` }))
  ]
  const controls = document.createElement('div')
  controls.className = 'evidence-link-controls'
  controls.innerHTML = `<p class="label">LINK EVIDENCE</p><select id="link-evidence-target" aria-label="Evidence relationship target">${targets.map((item) => `<option value="${safe(item.type)}|${safe(item.id)}">${safe(item.label)}</option>`).join('')}</select><button id="commit-evidence-link" class="utility-button">COMMIT LINK</button>`
  card.append(controls)
  el('#commit-evidence-link').addEventListener('click', () => {
    const [targetType, targetId] = el('#link-evidence-target').value.split('|')
    runEvidenceLink(object.id, targetType, targetId)
  })
}

new MutationObserver(installEvidenceLinkControls).observe(inspector, { childList: true, subtree: true })

const installLawReviewControls = () => {
  const object = currentObject()
  const card = inspector.querySelector('.inspector-card')
  if (!object || object.objectType !== 'LAW' || !card || inspector.querySelector('#review-authority-source')) return
  const controls = document.createElement('div')
  controls.className = 'law-review-controls'
  controls.innerHTML = `<p class="label">REVIEW SOURCE</p><input id="law-review-excerpt" class="search-input" value="${safe(object.text || object.proposition || '')}" placeholder="Exact excerpt" aria-label="Authority excerpt"><input id="law-review-page" class="search-input" placeholder="Page / section" aria-label="Authority source page"><input id="law-review-version" class="search-input" placeholder="Source version" aria-label="Authority source version"><input id="law-review-effective" class="search-input" type="date" aria-label="Authority effective date"><input id="law-review-jurisdiction" class="search-input" value="${safe(object.jurisdiction || '')}" placeholder="Jurisdiction" aria-label="Authority jurisdiction"><input id="law-review-limitations" class="search-input" placeholder="Limitations" aria-label="Authority limitations"><button id="review-authority-source" class="utility-button">COMMIT SOURCE REVIEW</button><button id="flag-stale-authority" class="utility-button">MARK SOURCE STALE</button>`
  card.append(controls)
  el('#review-authority-source').addEventListener('click', () => runLawReview(object.id))
  el('#flag-stale-authority').addEventListener('click', () => runFlagStaleAuthority(object.id))
}

new MutationObserver(installLawReviewControls).observe(inspector, { childList: true, subtree: true })

const installElementLinkControls = () => {
  const object = currentObject()
  const card = inspector.querySelector('.inspector-card')
  if (!object || object.objectType !== 'ELEMENT' || !card || inspector.querySelector('#link-element-fact')) return
  const facts = state.data.facts || []
  const authorities = state.data.law || []
  const controls = document.createElement('div')
  controls.className = 'element-link-controls'
  controls.innerHTML = `<p class="label">LINK PROOF OBJECTS</p><select id="element-fact-target" aria-label="Fact for element">${facts.map((item) => `<option value="${safe(item.id)}">FACT · ${safe(item.title || item.id)}</option>`).join('')}</select><button id="link-element-fact" class="utility-button">LINK FACT</button><select id="element-authority-target" aria-label="Authority for element">${authorities.map((item) => `<option value="${safe(item.id)}">AUTHORITY · ${safe(item.title || item.id)} · ${safe(item.status)}</option>`).join('')}</select><button id="link-element-authority" class="utility-button">LINK AUTHORITY</button>`
  card.append(controls)
  el('#link-element-fact').addEventListener('click', () => runElementFactLink(object.id, el('#element-fact-target').value))
  el('#link-element-authority').addEventListener('click', () => runElementAuthorityLink(object.id, el('#element-authority-target').value))
}

new MutationObserver(installElementLinkControls).observe(inspector, { childList: true, subtree: true })

const installStagedTextEditor = () => {
  const button = drawer.querySelector('#commit-evidence, #commit-dropped-evidence')
  if (!button || drawer.querySelector('#staged-extracted-text') || !state.stagedItems.length) return
  const label = document.createElement('p')
  label.className = 'label'
  label.textContent = 'EXTRACTED TEXT REVIEW'
  const textarea = document.createElement('textarea')
  textarea.id = 'staged-extracted-text'
  textarea.className = 'staged-text'
  textarea.setAttribute('aria-label', 'Extracted text review')
  textarea.value = state.stagedItems[0].extractedText || ''
  textarea.addEventListener('input', () => {
    const item = state.stagedItems[0]
    if (!item.originalExtractedText) item.originalExtractedText = item.extractedText || ''
    item.extractedText = textarea.value
    item.extractionCorrection = { originalTextPreserved: true, correctedAt: new Date().toISOString() }
  })
  button.before(label, textarea)
}

new MutationObserver(installStagedTextEditor).observe(drawer, { childList: true, subtree: true })

const statusClass = (status) => ({ COMPLETE: 'state-complete', VERIFIED: 'state-complete', SUPPORTED: 'state-complete', INCOMPLETE: 'state-pending', PENDING: 'state-pending', HYPOTHESIS: 'state-pending', CONTRADICTION: 'state-danger', FAILED: 'state-danger', INFERENCE: 'state-inference' }[status] || '')
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))

function currentObject() {
  if (!state.selected || !state.data) return null
  const collections = ['facts', 'evidence', 'law', 'claims', 'elements', 'procedure', 'drafts', 'propositions', 'deadlines', 'context', 'legalClaims', 'organizations', 'organizationProfiles', 'propertyRecords', 'events', 'serviceRecords', 'docketEntries', 'courtFilings', 'contradictions', 'evidenceGaps', 'moderateReviews', 'strategyRecords', 'machineFronts', 'unitMatrixDetailed', 'evidenceHolds', 'activationSequence', 'damagesModel', 'sourceCatalog', 'caseInputs', 'machineAuthorities', 'machineActions', 'machineLinks', 'trialPhases', 'trialWitnesses', 'trialExhibits', 'trialMotions', 'trialObjections', 'trialExaminations', 'juryInstructions', 'trialTasks', 'trialControls', 'trialRulings', 'trialEvents', 'trialArguments', 'trialAppealIssues', 'trialActions', 'trialJudgments', 'trialCosts', 'trialEnforcement', 'trialAppeals']
  const objectTypeMap = { moderateReviews: 'MODERATIONREVIEW', strategyRecords: 'STRATEGYRECORD', organizationProfiles: 'ORGANIZATIONPROFILE', propertyRecords: 'PROPERTYRECORD', trialControls: 'TRIALCONTROL', machineFronts: 'MACHINEFRONT', unitMatrixDetailed: 'UNITMATRIXDETAIL', evidenceHolds: 'EVIDENCEHOLD', activationSequence: 'ACTIVATION', damagesModel: 'DAMAGE', sourceCatalog: 'SOURCECATALOG', caseInputs: 'CASEINPUT', machineAuthorities: 'MACHINEAUTHORITY', machineActions: 'MACHINEACTION', machineLinks: 'MACHINELINK', trialPhases: 'TRIALPHASE', trialWitnesses: 'TRIALWITNESS', trialExhibits: 'TRIALEXHIBIT', trialMotions: 'TRIALMOTION', trialObjections: 'TRIALOBJECTION', trialExaminations: 'TRIALEXAMINATION', juryInstructions: 'JURYINSTRUCTION', trialTasks: 'TRIALTASK', trialRulings: 'TRIALRULING', trialEvents: 'TRIALEVENT', trialAppealIssues: 'APPEALISSUE', trialActions: 'TRIALACTION', trialJudgments: 'TRIALJUDGMENT', trialCosts: 'TRIALCOST', trialEnforcement: 'ENFORCEMENT', trialAppeals: 'TRIALAPPEAL' }
  for (const key of collections) {
    const found = state.data[key]?.find((item) => item.id === state.selected)
    if (found) return { ...found, objectType: objectTypeMap[key] || key.slice(0, -1).toUpperCase() }
    for (const paragraph of key === 'drafts' ? state.data.drafts.flatMap((draft) => draft.paragraphs || []) : []) if (paragraph.id === state.selected) return { ...paragraph, objectType: 'PARAGRAPH' }
  }
  return null
}

function setSelected(id) { state.selected = id; renderInspector(); document.querySelectorAll('[data-select]').forEach((node) => node.classList.toggle('selected', node.dataset.select === id)) }

function renderInspector() {
  const object = currentObject()
  if (!object) { inspector.innerHTML = '<p class="label">Inspector</p><div class="inspector-card"><p class="inspector-name">No selection</p><p class="muted">Select an object.</p></div>'; return }
  const tabs = ['DETAIL', 'LINKS', 'PROOF', 'HISTORY']
  const machineLinks = (state.data.machineLinks || []).filter((item) => item.frontId === object.id || item.unitId === object.id || item.targetId === object.id).map((item) => item.targetId === object.id ? `${item.frontId || item.unitId} (${item.relation})` : `${item.targetId} (${item.relation})`)
  const objectLinks = [...(object.links || []), ...(state.data.evidenceLinks || []).filter((item) => item.evidenceId === object.id || item.targetId === object.id).map((item) => item.targetId || item.evidenceId), ...machineLinks]
  const history = state.data.audit.filter((item) => item.object === object.id).slice(-8).reverse()
  const displayName = object.title || object.name || object.unit || object.bucket || object.key || object.id
  const machineDetail = object.objectType === 'MACHINEFRONT' ? `<dl class="kv"><dt>Trigger</dt><dd>${safe(object.trigger)}</dd><dt>Defense</dt><dd>${safe(object.defense)}</dd><dt>Remedy</dt><dd>${safe(object.remedy)}</dd><dt>Source row</dt><dd>${safe(object.sourceRow)}</dd></dl>` : object.objectType === 'UNITMATRIXDETAIL' ? `<dl class="kv"><dt>Unit</dt><dd>${safe(object.unit)}</dd><dt>Floor</dt><dd>${safe(object.floor)} / ${safe(object.floorConfidence)}</dd><dt>Layout</dt><dd>${safe(object.floorplan)}</dd><dt>Rent</dt><dd>${safe(object.baseRent)}</dd><dt>Source row</dt><dd>${safe(object.sourceRow)}</dd></dl>` : object.objectType === 'EVIDENCEHOLD' ? `<dl class="kv"><dt>Custodian</dt><dd>${safe(object.custodian)}</dd><dt>Native form</dt><dd>${safe(object.nativeForm)}</dd><dt>Acquisition</dt><dd>${safe(object.acquisitionPath)}</dd><dt>Purpose</dt><dd>${safe(object.purpose)}</dd></dl>` : object.objectType === 'SOURCECATALOG' ? `<dl class="kv"><dt>Category</dt><dd>${safe(object.category)}</dd><dt>URL</dt><dd>${safe(object.url)}</dd><dt>Use</dt><dd>${safe(object.use)}</dd><dt>Review</dt><dd>${safe(object.reviewStatus || 'LEAD')}</dd></dl>` : object.objectType === 'MACHINEAUTHORITY' ? `<dl class="kv"><dt>Authority</dt><dd>${safe(object.authority)}</dd><dt>Type</dt><dd>${safe(object.type)}</dd><dt>Operative point</dt><dd>${safe(object.operativePoint)}</dd><dt>Source</dt><dd>${safe(object.source)}</dd><dt>Limit</dt><dd>${safe(object.status)}</dd></dl>` : object.objectType.startsWith('TRIAL') || object.objectType === 'JURYINSTRUCTION' || object.objectType === 'APPEALISSUE' ? `<dl class="kv"><dt>Object</dt><dd>${safe(object.objectType)}</dd><dt>Status</dt><dd class="${statusClass(object.status)}">${safe(object.status || 'ACTIVE')}</dd><dt>Phase</dt><dd>${safe(object.phaseId || object.posture || 'TRIAL')}</dd><dt>Detail</dt><dd>${safe(object.purpose || object.target || object.issue || object.title || object.id)}</dd></dl>` : `<dl class="kv"><dt>Object</dt><dd>${safe(object.objectType)}</dd><dt>Status</dt><dd class="${statusClass(object.status)}">${safe(object.status || 'ACTIVE')}</dd><dt>Source</dt><dd>${safe(object.source || 'Matter store')}</dd><dt>Detail</dt><dd>${safe(object.detail || object.text || object.missing || object.title || object.id)}</dd></dl>`
  const proofDetail = object.objectType === 'MACHINEFRONT' ? `<dl class="kv"><dt>Proof needed</dt><dd>${safe(object.proofNeeded)}</dd><dt>Present state</dt><dd>${safe(object.presentState)}</dd><dt>Corroboration</dt><dd>${safe(object.status || 'NOT RECORDED')}</dd></dl>` : object.objectType === 'UNITMATRIXDETAIL' ? `<dl class="kv"><dt>Source status</dt><dd>${safe(object.sourceStatus)}</dd><dt>Confidence</dt><dd>${safe(object.confidence)}</dd><dt>Custodian</dt><dd>${safe(object.custodian)}</dd><dt>Public record</dt><dd>${safe(object.publicRecord ? 'PRESERVED' : 'NOT RECORDED')}</dd></dl>` : object.objectType === 'MACHINEAUTHORITY' ? `<dl class="kv"><dt>Use</dt><dd>${safe(object.caseUse)}</dd><dt>Verification</dt><dd>${safe(object.status)}</dd><dt>Source row</dt><dd>${safe(object.sourceRow)}</dd></dl>` : `<dl class="kv"><dt>Proof</dt><dd>${safe(object.proof ?? object.status)}</dd><dt>Hash</dt><dd>${safe(object.hash || 'Not applicable')}</dd><dt>Corroboration</dt><dd>${safe(object.corroboration || 'Not recorded')}</dd></dl>`
  const tabContent = state.inspectorTab === 'LINKS' ? `<dl class="kv"><dt>Links</dt><dd>${safe(Array.from(new Set(objectLinks)).join(', ') || 'None')}</dd></dl>` : state.inspectorTab === 'PROOF' ? proofDetail : state.inspectorTab === 'HISTORY' ? `<div class="timeline">${history.map((item) => `<div class="timeline-row"><time>${safe(item.at.slice(0, 10))}</time><i class="timeline-dot"></i><span>${safe(item.action)}</span></div>`).join('') || '<p class="muted">No object-specific mutations.</p>'}</div>` : machineDetail
  inspector.innerHTML = `<p class="label">${safe(object.objectType)}</p><div class="inspector-card"><h2 class="inspector-name">${safe(displayName)}</h2><span class="${statusClass(object.status)}">${safe(object.status || 'ACTIVE')}</span><div class="inspector-tabs">${tabs.map((tab) => `<button data-inspector-tab="${tab}" class="${state.inspectorTab === tab ? 'active' : ''}">${tab}</button>`).join('')}</div>${tabContent}</div>`
  inspector.querySelectorAll('[data-inspector-tab]').forEach((button) => button.addEventListener('click', () => { state.inspectorTab = button.dataset.inspectorTab; renderInspector() }))
}

function header(title, kicker = 'CLO') { return `<div class="screen-head"><div><p class="screen-kicker">${kicker}</p><h1 class="screen-title">${title}</h1></div><span class="field-meta">${state.data.matter.status}</span></div>` }
function field(title, content, className = '', meta = '') { return `<article class="field ${className}"><div class="field-header"><h2 class="field-title">${title}</h2><span class="field-meta">${meta}</span></div>${content}</article>` }

function commandView() {
  const claim = state.data.claims[0]
  const next = state.data.elements.find((item) => item.status !== 'COMPLETE')
  const bands = state.data.elements.map((item) => `<div class="band" data-select="${item.id}"><div><h3>${safe(item.title)}</h3><small>${safe(item.missing || 'All required links present')}</small></div><div><div class="progress"><i style="width:${item.proof}%"></i></div><small>${item.proof}% proof</small></div><strong class="${statusClass(item.status)}">${item.status}</strong></div>`).join('')
  const timeline = state.data.audit.slice(-4).reverse().map((item) => `<div class="timeline-row"><time>${safe(item.at.slice(0, 10))}</time><i class="timeline-dot"></i><span>${safe(item.action)}</span></div>`).join('')
  return `${header('Command','CASE STATE')}<div class="stage-grid">${field('Case state', `<div class="band-list">${bands}</div>`, 'hero-field', `${claim.proof}% CLAIM PROOF`)}${field('Next action', `<p class="label">OBTAIN LAHD INSPECTION RECORD</p><div class="metric">HIGH</div><p class="muted">Impacts 1 incomplete legal branch</p><button class="action-button" data-case-action="open-action" data-id="${next?.id || ''}">OPEN ACTION</button>`, 'action-field', 'JUSTIFIED')}${field('Live risk', '<p class="label">LIMITATION CLOCK</p><div class="metric">14<span class="unit">DAYS</span></div><p class="muted">Affects 3 claimants</p>', 'risk-field', 'OCHRE')}${field('State changes', `<div class="timeline">${timeline}</div>`, '', 'MEANINGFUL TRANSITIONS')}</div>`
}

function evidenceView() { const filter = state.evidenceFilter || 'ALL'; const visible = state.data.evidence.filter((item) => filter === 'ALL' || item.status === filter); const pageSize = 100; const pageCount = Math.max(1, Math.ceil(visible.length / pageSize)); state.evidencePage = Math.min(state.evidencePage, pageCount - 1); const page = visible.slice(state.evidencePage * pageSize, (state.evidencePage + 1) * pageSize); const rows = page.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.name)}</strong><small>${safe(item.type)} · ${safe(item.hash || 'NO HASH')} · ${safe(item.source)}</small></div><b class="${statusClass(item.status)}">${safe(item.status)}</b></div>`).join(''); return `${header('Evidence','FACTS → EVIDENCE')}<div class="stage-grid">${field('Reality map', '<div class="map-plate"><div class="building-shape"></div><div class="person-node">PEOPLE</div><div class="system-node">SYSTEMS</div><div class="event-node">EVENTS</div></div>', 'hero-field', '2.5D / BUILDING')}${field('Source queue', `<div id="evidence-drop-zone" class="drop-zone" tabindex="0" aria-label="Drop evidence files here">DROP FILES HERE TO STAGE</div><div class="filter-row">${['ALL', 'VERIFIED', 'HYPOTHESIS', 'PENDING'].map((item) => `<button class="filter-button ${filter === item ? 'active' : ''}" data-evidence-filter="${item}">${item}</button>`).join('')}</div><div class="object-list">${rows || '<p class="muted">No evidence matches this filter.</p>'}</div><div class="pagination"><button class="filter-button" data-evidence-page="prev" ${state.evidencePage === 0 ? 'disabled' : ''}>PREV</button><span>${state.evidencePage + 1} / ${pageCount}</span><button class="filter-button" data-evidence-page="next" ${state.evidencePage >= pageCount - 1 ? 'disabled' : ''}>NEXT</button></div><button class="action-button" id="import-evidence">IMPORT EVIDENCE</button>`, '', `${visible.length}/${state.data.evidence.length} OBJECTS`)}${field('Evidence chronology', '<div class="timeline"><div class="timeline-row"><time>2024-02-11</time><i class="timeline-dot"></i><span>Recurring water intrusion recorded</span></div><div class="timeline-row"><time>2024-04-02</time><i class="timeline-dot"></i><span>Owner notice corroborated</span></div></div>', 'wide-field', 'SOURCE-ORDERED')}</div>` }
function lawView() { const laws = state.data.law.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.jurisdiction)} · ${safe(item.proposition || 'No proposition')}</small></div><b class="${statusClass(item.status)}">${safe(item.status)}</b></div>`).join(''); return `${header('Law','AUTHORITY')}<div class="stage-grid">${field('Authority tree', '<div class="object-list"><div class="object-row"><strong>FEDERAL</strong><small>CALIFORNIA · LOS ANGELES · ORDERS · CASES</small></div><div class="object-row"><strong>CALIFORNIA</strong><small>STATUTES · REGULATIONS · CASES</small></div><div class="object-row"><strong>LOS ANGELES</strong><small>LOCAL RULES · INSPECTIONS</small></div></div>', 'hero-field', 'HIERARCHY')}${field('Source text', `<div class="paper"><p class="label">CIVIL CODE §1942.4</p><p>A landlord may not collect rent or issue certain notices while specified conditions remain unresolved.</p><button class="utility-button" data-case-action="create-proposition">CREATE PROPOSITION</button></div>`, '', 'VERIFIED SOURCE')}${field('Proposition chain', `<div class="proposition-list">${laws}</div><div class="button-row"><button class="utility-button" data-case-action="verify-source">VERIFY SOURCE</button><button class="utility-button" data-case-action="link-element">LINK ELEMENT</button></div>`, 'wide-field', 'LINKED AUTHORITY')}</div>` }
function elementsView() { const rows = state.data.elements.map((item) => `<div class="object-row source-rail" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.missing || 'All required evidence linked')}</small></div><b class="${statusClass(item.status)}">${item.proof}%</b></div>`).join(''); const validation = state.data.drafts[0]?.validation; return `${header('Elements','LEGAL COMPLETENESS')}<div class="stage-grid">${field('Claim', `<p class="label">HABITABILITY / NOTICE THEORY</p><div class="metric">${state.data.claims[0].proof}%</div><p class="muted">${state.data.claims[0].status}</p>`, 'hero-field', 'CURRENT CLAIM')}${field('Build pipeline', '<div class="pipeline"><b>RELIEF</b><b>PROCEDURE</b><b class="active">ELEMENTS</b><b>FACTS</b><b>AUTHORITIES</b><b>DEFENSE</b><b>DRAFT</b><b>VALIDATE</b><b>EXPORT</b></div>', '', validation ? `VALIDATION ${validation}` : '8 / 9')}${field('Element proof', `<div class="object-list">${rows}</div><div class="button-row"><button class="utility-button" data-case-action="recalculate-completeness">RECALCULATE PROOF</button><button class="utility-button" data-case-action="build-section">BUILD SECTION</button><button class="utility-button" data-case-action="verify-citations">VERIFY CITATIONS</button><button class="utility-button" data-case-action="validate-filing">VALIDATE FILING</button>${validation === 'PASSED' ? '<button class="action-button" data-case-action="export-filing">EXPORT FILING</button>' : ''}</div>`, 'wide-field', 'PROVENANCE')}</div>` }
function procedureView() {
  const rows = state.data.procedure.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.date)} · ${safe(item.source)}</small></div><div class="machine-row-actions"><b class="${statusClass(item.status)}">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="update-procedure-event" data-id="${safe(item.id)}">RECORD</button></div></div>`).join('')
  const filings = (state.data.courtFilings || []).map((item) => `<div class="object-row" data-select="${safe(item.id)}"><div><strong>${safe(item.title)}</strong><small>${safe(item.filingType)} · ${safe(item.date)} · ${safe(item.docketNumber || 'NO DOCKET')}</small></div><b class="${statusClass(item.status)}">${safe(item.status)}</b></div>`).join('')
  const services = (state.data.serviceRecords || []).map((item) => `<div class="object-row" data-select="${safe(item.id)}"><div><strong>${safe(item.servedParty)}</strong><small>${safe(item.method)} · ${safe(item.date)} · ${safe(item.source)}</small></div><b class="${statusClass(item.status)}">${safe(item.status)}</b></div>`).join('')
  return `${header('Procedure','PROCEDURAL STATE')}<div class="stage-grid">${field('Current posture', '<p class="label">SERVICE PENDING</p><div class="metric">2</div><p class="muted">derived procedural clocks</p>', 'hero-field', 'ACTIVE')}${field('Record event', '<div class="trial-form"><input id="procedure-event-title" class="search-input" placeholder="Filing, service, or court event" aria-label="Procedural event title"><input id="procedure-event-date" class="search-input" type="date" aria-label="Procedural event date"><button id="record-procedure-event" class="action-button">RECORD EVENT</button></div>', '', 'SOURCE REQUIRED')}${field('Record filing', `<div class="trial-form"><input id="procedure-filing-title" class="search-input" placeholder="Filing title" aria-label="Filing title"><input id="procedure-filing-date" class="search-input" type="date" aria-label="Filing date"><input id="procedure-filing-source" class="search-input" placeholder="Filed record source" aria-label="Filing source"><button id="record-procedure-filing" class="action-button">RECORD FILING</button></div><div class="object-list">${filings || '<p class="muted">No filings recorded.</p>'}</div>`, 'wide-field', 'SOURCE + DATE')}${field('Record service', `<div class="trial-form"><input id="procedure-service-party" class="search-input" placeholder="Served party" aria-label="Served party"><input id="procedure-service-method" class="search-input" placeholder="Method" aria-label="Service method"><input id="procedure-service-date" class="search-input" type="date" aria-label="Service date"><input id="procedure-service-source" class="search-input" placeholder="Proof of service source" aria-label="Service source"><button id="record-procedure-service" class="action-button">RECORD SERVICE</button></div><div class="object-list">${services || '<p class="muted">No service records recorded.</p>'}</div>`, 'wide-field', 'PARTY + METHOD + PROOF')}${field('Docket chronology', `<div class="object-list">${rows}</div>`, '', 'AUDITABLE')}${field('Dependencies', '<div class="timeline"><div class="timeline-row"><time>CLAIM</time><i class="timeline-dot"></i><span>Element completeness affects responsive filing window</span></div><div class="timeline-row"><time>EVIDENCE</time><i class="timeline-dot"></i><span>Inspection record remains an open gap</span></div></div>', 'wide-field', 'LINKED STATE')}</div>`
}
function strategyView() { const records = state.data.strategyRecords || []; const make = (title, data, role) => { const rows = records.filter((item) => item.role === role).map((item) => `<div class="object-row" data-select="${safe(item.id)}"><div><strong>${safe(item.observation)}</strong><small>${safe(item.source)} · ${safe(item.uncertainty)}</small></div><b class="state-inference">${safe(item.confidence)}%</b></div>`).join(''); return field(title, `<p class="label">SOURCE UNIVERSE</p><p>${safe(data.sourceUniverse)}</p><div class="metric">${Math.round(data.confidence * 100)}%</div><p class="muted">confidence · ${records.filter((item) => item.role === role).length} recorded observations</p><div class="object-list">${rows || '<p class="muted">No source-backed observations recorded.</p>'}</div>`, '', 'INFERENCE'); }; return `${header('Strategy','ANALYSIS')}<div class="stage-grid">${make('Judge', state.data.strategy.judge, 'JUDGE')}${make('Opponent', state.data.strategy.opponent, 'OPPONENT')}${field('Record observation', '<div class="trial-form"><select id="strategy-role" aria-label="Strategy subject"><option>JUDGE</option><option>OPPONENT</option></select><input id="strategy-observation" class="search-input" placeholder="Observed pattern" aria-label="Observed pattern"><input id="strategy-universe" class="search-input" placeholder="Source universe" aria-label="Source universe"><input id="strategy-confidence" class="search-input" type="number" min="0" max="100" placeholder="Confidence 0–100" aria-label="Strategy confidence"><input id="strategy-uncertainty" class="search-input" placeholder="Uncertainty" aria-label="Strategy uncertainty"><input id="strategy-source" class="search-input" placeholder="Source record" aria-label="Strategy source"><button id="record-strategy" class="action-button">RECORD OBSERVATION</button></div>', 'wide-field', 'SOURCE + UNCERTAINTY REQUIRED')}${field('Uncertainty', '<p class="label state-inference">INFERENCE IS NOT FACT</p><p class="muted">Every analytical statement remains linked to a declared source universe, confidence, uncertainty, and source record. No personality claims are inferred.</p>', 'wide-field', 'VIOLET')}</div>` }
function moderateView() { const reviews = state.data.moderateReviews || []; const rows = reviews.map((item) => `<div class="object-row" data-select="${safe(item.id)}"><div><strong>${safe(item.label)}</strong><small>${safe(item.lawfulPurpose)} · ${safe(item.source)}</small></div><b class="${item.status === 'REVIEWED' ? 'state-complete' : 'state-pending'}">${safe(item.status)}</b></div>`).join(''); return `${header('Moderate','CONTROLLED REVIEW')}<div class="stage-grid">${field('Review boundary', '<p class="label state-danger">NO ASSOCIATION GRAPH</p><p class="muted">This surface does not connect people, infer protected traits, or optimize extremist reach. Financial fields are not used to buy access.</p>', 'hero-field', 'SAFETY GATE')}${field('Review record', `<div class="trial-form"><select id="moderate-review-id" aria-label="Moderation review">${reviews.map((item) => `<option value="${safe(item.id)}">${safe(item.label)}</option>`).join('')}</select><input id="moderate-intensity" class="search-input" type="number" min="0" max="100" placeholder="Viewpoint intensity 0–100" aria-label="Viewpoint intensity"><input id="moderate-acceptance" class="search-input" type="number" min="0" max="100" placeholder="Acceptance width 0–100" aria-label="Acceptance width"><input id="moderate-confidence" class="search-input" type="number" min="0" max="100" placeholder="Confidence 0–100" aria-label="Review confidence"><input id="moderate-reason" class="search-input" placeholder="Evidence-based review reason" aria-label="Review reason"><input id="moderate-source" class="search-input" placeholder="Source record" aria-label="Review source"><button id="record-moderation" class="action-button">RECORD REVIEW</button></div>`, '', 'REASON + SOURCE REQUIRED')}${field('Review queue', `<div class="object-list">${rows || '<p class="muted">No review records.</p>'}</div>`, 'wide-field', 'NO LITIGATION FACT LINK')}</div>` }
function draftsView() { const draft = state.data.drafts[0]; return `${header('Drafts','PROVENANCE')}<div class="stage-grid">${field('Draft list', `<div class="object-list"><div class="object-row" data-select="${draft.id}"><div><strong>${safe(draft.title)}</strong><small>${draft.status} · ${draft.paragraphs.length} paragraph</small></div><b class="${statusClass(draft.validation || draft.status)}">${safe(draft.validation || draft.status)}</b></div></div>`, 'hero-field', 'LOCAL')}${field('Actions', '<button class="action-button" data-case-action="build-section">BUILD SECTION</button><div class="button-row"><button class="utility-button" data-case-action="verify-citations">VERIFY CITATIONS</button><button class="utility-button" data-case-action="validate-filing">VALIDATE FILING</button></div>', '', 'ONE PRIMARY')}${field('Paragraph provenance', `<div class="object-list">${draft.paragraphs.map((p) => `<div class="object-row source-rail" data-select="${p.id}"><div><strong>${safe(p.text)}</strong><small>${p.provenance.join(' · ')}</small></div><b class="${statusClass(p.status)}">${p.status}</b></div>`).join('')}</div>`, 'wide-field', 'FACTS · LAW · INFERENCE')}</div>` }
function deadlinesView() {
  const deadlines = state.data.deadlines?.length ? state.data.deadlines : state.data.procedure
  const bars = deadlines.map((item, index) => {
    const consequence = String(item.consequence || 'MEDIUM').toLowerCase()
    const severity = ['high', 'medium', 'low'].includes(consequence) ? consequence : 'medium'
    return `<div class="deadline-bar ${index % 2 ? 'second' : 'first'} ${severity}" data-select="${safe(item.id)}" aria-label="${safe(item.title)} ${safe(consequence)} consequence"><span>${safe(item.date)}</span><b>${safe(item.title)}</b><small>${safe(consequence)} consequence</small></div>`
  }).join('')
  return `${header('Deadlines','PROCEDURAL CLOCKS')}<div class="stage-grid">${field('Time field', `<div class="time-field"><div class="today-line"><span>TODAY</span></div>${bars}</div>`, 'hero-field', `${deadlines.length} DERIVED`)}${field('Selected derivation', '<dl class="kv"><dt>Elements</dt><dd>Condition theory incomplete</dd><dt>Procedure</dt><dd>Service deadline pending</dd><dt>Evidence</dt><dd>Source-linked proof dependency</dd><dt>Drafts</dt><dd>Verified section available</dd><dt>Strategy</dt><dd>Confidence affects review posture</dd></dl><button class="utility-button" data-case-action="derive-deadlines">RECALCULATE</button>', '', 'AUDITABLE')}${field('Open clocks', `<div class="object-list">${deadlines.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.date)} · ${safe(item.source)} · ${safe(item.consequence || 'MEDIUM')} consequence</small></div><b class="state-pending">${safe(item.status)}</b></div>`).join('')}</div>`, 'wide-field', 'SOURCE-LINKED')}</div>`
}
function systemView() { const counts = state.ledger?.counts || {}; return `${header('System','HEALTH')}<div class="stage-grid">${field('Database', '<div class="metric state-complete">OK</div><p class="muted">Local SQLite case store / version 2</p>', 'hero-field', 'VERIFIED')}${field('Memory', `<div class="metric">${state.health?.ram ? Math.round(state.health.ram / 1024 / 1024) : '--'}<span class="unit">MB</span></div><p class="muted">Working set within target</p>`, '', 'GOVERNED')}${field('Completion ledger', `<div class="metric">${state.ledger?.total || 2700}</div><div class="ledger-counts"><span>IMPLEMENTED <b>${counts.IMPLEMENTED || 0}</b></span><span>TESTED <b>${counts.TESTED || 0}</b></span><span>VERIFIED <b>${counts.VERIFIED || 0}</b></span><span>OPEN <b>${(counts.UNREAD || 0) + (counts.MAPPED || 0) + (counts.PARSED || 0)}</b></span></div><p class="muted">${state.ledger?.sourceCount || 0} attachment sources indexed · checksum ${safe((state.ledger?.checksum || '').slice(0, 12))}</p>`, 'wide-field', 'TRACEABILITY')}${field('Audit', `<div class="timeline">${state.data.audit.slice(-5).reverse().map((item) => `<div class="timeline-row"><time>${item.at.slice(0,10)}</time><i class="timeline-dot"></i><span>${safe(item.action)}</span></div>`).join('')}</div>`, 'wide-field', 'LOCAL HISTORY')}</div>` }
function coverageView() { const fronts = state.data.legalClaims || []; const critical = fronts.filter((item) => item.priority === 'CRITICAL').length; const rows = fronts.map((item) => `<div class="object-row coverage-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.authority)} · ${safe(item.status)} · ${safe(item.defendants)}</small></div><b class="${item.priority === 'CRITICAL' ? 'state-danger' : item.priority === 'HIGH' ? 'state-pending' : ''}">${safe(item.priority)}</b></div>`).join(''); const actors = (state.data.organizations || []).map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.name)}</strong><small>${safe(item.role)}</small></div><b>${safe(item.status)}</b></div>`).join(''); const registry = state.data.context.find((item) => item.type === 'WAR_ROOM_WORKBOOK')?.sourceRegistry || []; const ledgerRows = (state.ledgerRows || []).map((item) => `<div class="object-row ledger-row"><div><strong>${safe(item.id)} · ${safe(item.description)}</strong><small>${safe(item.repeat)} · ${safe(item.sourceRefs?.join(', '))} · ${safe(item.featureRefs?.join(', ') || 'No feature evidence')}</small></div><select data-ledger-id="${safe(item.id)}" aria-label="Status for ${safe(item.id)}">${['UNREAD', 'PARSED', 'MAPPED', 'IMPLEMENTED', 'TESTED', 'VERIFIED', 'DEFERRED', 'REJECTED'].map((status) => `<option ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>`).join(''); return `${header('Coverage','1540 VINE MASTER MATRIX')}<div class="stage-grid">${field('Legal fronts', `<p class="label">${critical} CRITICAL / ${fronts.length} TOTAL</p><div class="object-list coverage-list">${rows}</div>`, 'hero-field', 'WORKBOOK-LINKED')}${field('Enforcement chain', `<div class="object-list">${actors}</div>`, '', 'ACTOR-SPECIFIC')}${field('Rules of use', `<p class="label state-pending">LEAD ≠ FACT</p><p class="muted">Workbook rows are context and triage. A front becomes pleadable only after a primary record, source location, and element-level proof link are committed.</p><p class="label">${registry.length} LIVE SOURCE SURFACES · CHECKED 2026-08-17</p><p class="muted">Accessible portals are not property findings. Each source remains gated on the exact deed, inspection, registration, or transaction record.</p>`, '', 'EPISTEMIC CONTROL')}${field('Acceptance ledger', `<div class="ledger-controls"><input id="ledger-query" class="search-input" value="${safe(state.ledgerQuery)}" placeholder="Search requirement, source, or feature" aria-label="Search acceptance ledger"><select id="ledger-status" aria-label="Filter ledger status">${['ALL', 'UNREAD', 'PARSED', 'MAPPED', 'IMPLEMENTED', 'TESTED', 'VERIFIED', 'DEFERRED', 'REJECTED'].map((status) => `<option ${status === state.ledgerStatus ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="object-list ledger-list">${ledgerRows || '<p class="muted">No ledger rows match.</p>'}</div><p class="label">Showing ${(state.ledgerRows || []).length} filtered rows of ${state.ledger?.total || 0}</p>`, 'wide-field', 'TRACEABLE STATUS')}${field('Coverage inventory', `<dl class="kv"><dt>Units</dt><dd>${state.data.units.length}</dd><dt>Evidence rows</dt><dd>${state.data.evidence.filter((item) => item.id.startsWith('EV-')).length}</dd><dt>Clocks</dt><dd>${state.data.procedure.filter((item) => item.id.startsWith('CL-')).length}</dd><dt>Property facts</dt><dd>${state.data.facts.filter((item) => item.id.startsWith('PF-')).length}</dd></dl>`, '', 'AUDITABLE')}</div>` }
function machineView() {
  const machine = state.data.machine || {}
  const fronts = state.data.machineFronts || []
  const units = state.data.unitMatrixDetailed || []
  const holds = state.data.evidenceHolds || []
  const authorities = state.data.machineAuthorities || []
  const sequence = state.data.activationSequence || []
  const damages = state.data.damagesModel || []
  const inputs = state.data.caseInputs || []
  const sources = state.data.sourceCatalog || []
  const actions = state.data.machineActions || []
  const links = state.data.machineLinks || []
  const query = state.machineQuery.trim().toLowerCase()
  const visibleUnits = units.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query)).slice(0, 24)
  const unitRows = visibleUnits.map((item) => `<div class="object-row machine-unit-row" data-select="${item.id}"><div><strong>${safe(item.unit || item.id)} · ${safe(item.floorplan || 'FLOOR UNKNOWN')}</strong><small>${safe(item.bedrooms)} BD / ${safe(item.bathrooms)} BA · ${safe(item.baseRent || 'RENT UNKNOWN')} · ${safe(item.sourceStatus)}</small></div><b class="${item.confidence === 'HIGH' ? 'state-complete' : 'state-pending'}">${safe(item.confidence || 'UNKNOWN')}</b></div>`).join('')
  const holdRows = holds.slice(0, 10).map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.priority)} · ${safe(item.custodian)}</strong><small>${safe(item.nativeForm)}</small></div><div class="machine-row-actions"><b class="${item.priority === 'P0' ? 'state-danger' : 'state-pending'}">${safe(item.priority)}</b><button class="utility-button compact-button" data-case-action="create-preservation-hold" data-id="${safe(item.id)}">HOLD</button></div></div>`).join('')
  const activationRows = sequence.slice(0, 8).map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.order)} · ${safe(item.trigger)}</strong><small>${safe(item.action)}</small></div><div class="machine-row-actions"><b class="state-pending">${safe(item.fronts)}</b><button class="utility-button compact-button" data-case-action="record-activation" data-id="${safe(item.id)}">RECORD</button></div></div>`).join('')
  const frontOptions = fronts.map((item) => `<option value="${safe(item.id)}">${safe(item.title)}</option>`).join('')
  const proofOptions = [...holds.map((item) => `<option value="evidenceHold|${safe(item.id)}">HOLD · ${safe(item.priority)} · ${safe(item.custodian)}</option>`), ...authorities.map((item) => `<option value="machineAuthority|${safe(item.id)}">AUTH · ${safe(item.authority)}</option>`)].join('')
  const frontRows = fronts.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.presentState)}</small></div><b class="${item.status?.includes('HIGH') ? 'state-danger' : 'state-pending'}">${safe(item.status)}</b></div>`).join('')
  const sourceRows = sources.slice(0, 8).map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.name)}</strong><small>${safe(item.category)} · row ${safe(item.sourceRow)} · ${safe(item.url)}</small></div><div class="machine-row-actions"><b class="state-pending">${safe(item.reviewStatus || 'LEAD')}</b><button class="utility-button compact-button" data-case-action="review-machine-source" data-id="${safe(item.id)}">REVIEW</button></div></div>`).join('')
  const actionRows = actions.slice(-6).reverse().map((item) => `<div class="timeline-row"><time>${safe((item.recordedAt || item.createdAt || '').slice(0, 10))}</time><i class="timeline-dot"></i><span>${safe(item.type)} · ${safe(item.output || item.holdId || item.activationId)}</span></div>`).join('')
  return `${header('Machine','PROPERTY-SPECIFIC LITIGATION MODEL')}<div class="stage-grid">${field('Asset state', `<div class="metric">${units.length}<span class="unit">UNITS</span></div><dl class="kv"><dt>Public IDs</dt><dd>37</dd><dt>Unknown IDs</dt><dd>250</dd><dt>Research state</dt><dd>${safe(machine.researchState)}</dd><dt>Source</dt><dd>${safe(machine.sourceWorkbook)}</dd><dt>Proof links</dt><dd>${links.length}</dd></dl>`, 'hero-field', 'RAW MODEL')}${field('Unit matrix', `<input id="machine-unit-search" class="search-input" value="${safe(state.machineQuery)}" placeholder="Unit, floorplan, status, source..." aria-label="Search unit matrix"><div class="object-list machine-unit-list">${unitRows || '<p class="muted">No unit rows match.</p>'}</div><p class="label">Showing ${visibleUnits.length} of ${units.length} - exact source row retained</p>`, '', '287 ROWS / 65 FIELDS')}${field('Activation', `<div class="object-list">${activationRows}</div>`, '', 'NEXT ACTION')}${field('12-front legal machine', `<div class="object-list">${frontRows}</div><div class="machine-proof-controls"><select id="machine-proof-front" aria-label="Machine front">${frontOptions}</select><select id="machine-proof-target" aria-label="Proof target">${proofOptions}</select><button id="machine-link-front" class="utility-button">LINK PROOF</button></div>`, 'wide-field', 'ELEMENTS / PROOF')}${field('Evidence hold', `<div class="object-list">${holdRows}</div>`, '', 'PRESERVATION')}${field('Authority register', `<div class="object-list">${authorities.slice(0, 8).map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.authority)}</strong><small>${safe(item.type)} · ${safe(item.operativePoint)}</small></div><b class="state-pending">LEAD</b></div>`).join('')}</div>`, '', '39 ROWS / SOURCE-LINKED')}${field('Machine deadline', '<div class="machine-deadline-controls"><input id="machine-deadline-title" class="search-input" placeholder="Deadline title" aria-label="Machine deadline title"><input id="machine-deadline-date" class="search-input" type="date" aria-label="Machine deadline date"><button id="machine-create-deadline" class="action-button">CREATE CLOCK</button></div><p class="label">A dated procedural object is created only after explicit action.</p>', '', 'DERIVED PROCEDURE')}${field('Damages controls', `<div class="object-list">${damages.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.bucket)}</strong><small>${safe(item.antiDoubleCounting)}</small></div><b class="state-inference">MODEL</b></div>`).join('')}</div><p class="label">${inputs.length} dated inputs - ${sources.length} source rows - no automatic legal conclusion</p>`, '', 'ANTI-DOUBLE-COUNTING')}${field('Source catalog', `<div class="object-list">${sourceRows}</div>`, 'wide-field', 'LEAD UNTIL VERIFIED')}${field('Machine history', `<div class="timeline">${actionRows || '<p class="muted">No machine actions recorded.</p>'}</div>`, '', 'AUDITABLE')}</div>`
}
function trialView() {
  const trial = state.data.trial || {}
  const phases = state.data.trialPhases || []
  const tasks = state.data.trialTasks || []
  const controls = state.data.trialControls || []
  const witnesses = state.data.trialWitnesses || []
  const exhibits = state.data.trialExhibits || []
  const motions = state.data.trialMotions || []
  const examinations = state.data.trialExaminations || []
  const instructions = state.data.juryInstructions || []
  const events = state.data.trialEvents || []
  const argumentRecords = state.data.trialArguments || []
  const rulings = state.data.trialRulings || []
  const actions = (state.data.trialActions || []).slice(-8).reverse()
  const objections = (state.data.trialObjections || []).slice(-8).reverse()
  const issues = state.data.trialAppealIssues || []
  const judgments = state.data.trialJudgments || []
  const costs = state.data.trialCosts || []
  const enforcement = state.data.trialEnforcement || []
  const appeals = state.data.trialAppeals || []
  const current = phases.find((item) => item.id === trial.currentPhaseId)
  const phaseRows = phases.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.order)} · ${safe(item.title)}</strong><small>${safe(item.purpose)}</small></div><div class="machine-row-actions"><b class="${item.status === 'COMPLETE' ? 'state-complete' : item.status === 'ACTIVE' ? 'state-pending' : ''}">${safe(item.status)}</b>${item.status !== 'COMPLETE' ? `<button class="utility-button compact-button" data-case-action="advance-trial-phase" data-id="${safe(item.id)}">OPEN</button>` : ''}</div></div>`).join('')
  const controlRows = controls.map((item) => `<div class="object-row" data-select="${safe(item.id)}"><div><strong>${safe(item.title)}</strong><small>${safe(item.owner || 'OWNER REQUIRED')} · ${safe(item.nextAction)} · ${safe(item.source)}</small></div><b class="${item.owner ? 'state-complete' : 'state-pending'}">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="record-trial-control" data-id="${safe(item.id)}">RECORD</button></div>`).join('')
  const taskRows = tasks.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.category)} · ${safe(item.phaseId)}${item.dueDate ? ` · ${safe(item.dueDate)}` : ''}</small></div><button class="utility-button compact-button" data-case-action="record-trial-task" data-id="${safe(item.id)}">${item.status === 'COMPLETE' ? 'REOPEN' : 'DONE'}</button></div>`).join('') + `<div class="label">TRIAL CONTROL REGISTER</div>${controlRows}`
  const witnessRows = witnesses.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.name)}</strong><small>${safe(item.role)} · ${safe(item.side)} · ${safe(item.directTopics.join(', '))}</small></div><div class="machine-row-actions"><b class="${item.status === 'LEAD' ? 'state-pending' : ''}">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="record-witness-foundation" data-id="${safe(item.id)}">FOUND</button></div></div>`).join('')
  const exhibitRows = exhibits.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.label)} · ${safe(item.title)}</strong><small>${safe(item.category)} · ${safe(item.foundation || item.foundationStatus || 'FOUNDATION REQUIRED')}</small></div><div class="machine-row-actions"><b class="${item.status === 'MISSING' || item.status === 'EXCLUDED' ? 'state-danger' : item.status === 'ADMITTED' ? 'state-complete' : 'state-pending'}">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="mark-exhibit-foundation" data-id="${safe(item.id)}">FOUND</button><button class="utility-button compact-button" data-case-action="record-exhibit-admission" data-id="${safe(item.id)}">ADMIT</button></div></div>`).join('')
  const motionRows = motions.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.type)} · ${safe(item.ruleSource)} · ${safe(item.relief)}</small></div><div class="machine-row-actions"><b class="state-pending">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="record-trial-motion" data-id="${safe(item.id)}">RECORD</button></div></div>`).join('')
  const examinationRows = examinations.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.mode)} · ${safe(item.witnessId)}</strong><small>${safe(item.topics.join(', '))}</small></div><div class="machine-row-actions"><b class="${item.status === 'COMPLETE' ? 'state-complete' : 'state-pending'}">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="record-examination" data-id="${safe(item.id)}">${item.status === 'COMPLETE' ? 'REOPEN' : 'COMPLETE'}</button></div></div>`).join('')
  const instructionRows = instructions.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.source)}</small></div><div class="machine-row-actions"><b class="state-pending">${safe(item.status)}</b><button class="utility-button compact-button" data-case-action="record-jury-instruction" data-id="${safe(item.id)}">RECORD</button></div></div>`).join('')
  const eventRows = events.slice(-8).reverse().map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.date)} · ${safe(item.title)}</strong><small>${safe(item.type)} · ${safe(item.source)}</small></div><b class="state-complete">${safe(item.status)}</b></div>`).join('')
  const argumentRows = argumentRecords.slice(-8).reverse().map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.side)} · ${safe(item.segment)}</strong><small>${safe(item.text)} · ${safe(item.source)}</small></div><b class="state-pending">${safe(item.status)}</b></div>`).join('')
  const rulingRows = rulings.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.result)} · ${safe(item.targetType)}</strong><small>${safe(item.reasoning || 'Reasoning not recorded')} · ${safe(item.source)}</small></div><b class="${item.preserved ? 'state-complete' : 'state-pending'}">${item.preserved ? 'PRESERVED' : 'REVIEW'}</b></div>`).join('')
  const actionRows = actions.map((item) => `<div class="timeline-row"><time>${safe((item.createdAt || '').slice(0, 10))}</time><i class="timeline-dot"></i><span>${safe(item.type)} · ${safe(item.status)}</span></div>`).join('')
  const objectionRows = objections.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.ground)}</strong><small>${safe(item.target)} · ${safe(item.phaseId)}</small></div><b class="${item.preserved ? 'state-complete' : 'state-pending'}">${item.preserved ? 'PRESERVED' : safe(item.ruling || item.status)}</b></div>`).join('')
  const issueRows = issues.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.issue)}</strong><small>${safe(item.recordLocation || 'Record location missing')}</small></div><b class="${item.preservation === 'PRESERVED' ? 'state-complete' : 'state-pending'}">${safe(item.preservation)}</b></div>`).join('')
  const judgmentRows = judgments.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.verdictStatus)} / ${safe(item.judgmentStatus)}</strong><small>${safe(item.verdict || 'Verdict not recorded')} · ${safe(item.entryDate || 'Entry date missing')} · ${safe(item.source)}</small></div><b class="${item.judgmentStatus === 'ENTERED' ? 'state-complete' : 'state-pending'}">${safe(item.judgmentStatus)}</b></div>`).join('')
  const costRows = costs.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.category)}</strong><small>${safe(item.amount ?? 'Amount not recorded')} · ${safe(item.source)}</small></div><button class="utility-button compact-button" data-case-action="record-trial-cost" data-id="${safe(item.id)}">RECORD</button></div>`).join('')
  const enforcementRows = enforcement.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.recordLocation || item.source)}</small></div><button class="utility-button compact-button" data-case-action="record-enforcement-step" data-id="${safe(item.id)}">UPDATE</button></div>`).join('')
  const appealRows = appeals.map((item) => `<div class="object-row" data-select="${item.id}"><div><strong>${safe(item.title)}</strong><small>${safe(item.dueDate || 'Date not recorded')} · ${safe(item.recordLocation || item.source)}</small></div><button class="utility-button compact-button" data-case-action="record-appellate-step" data-id="${safe(item.id)}">UPDATE</button></div>`).join('')
  const grounds = Array.from(new Set((state.data.trialObjections || []).map((item) => item.ground))).filter(Boolean)
  return `${header('Trial','FULL-TRIAL OPERATING RECORD')}<div class="stage-grid">${field('Current posture', `<p class="label">${safe(trial.posture)}</p><div class="metric">${current?.order || 1}<span class="unit">/ ${phases.length} PHASES</span></div><p class="muted">${safe(current?.title || 'Pleadings and service')}</p><p class="label state-pending">${safe(trial.readiness)}</p><p class="muted">${safe(trial.warning)}</p>`, 'hero-field', 'SOURCE-GATED')}${field('Phase control', `<div class="object-list">${phaseRows}</div>`, '', '12 PHASES')}${field('Trial tasks', `<div class="object-list">${taskRows}</div>`, 'wide-field', `${tasks.filter((item) => item.status === 'COMPLETE').length}/${tasks.length} COMPLETE`)}${field('Witness matrix', `<div class="object-list">${witnessRows}</div>`, '', 'FOUNDATION / IMPEACHMENT')}${field('Exhibit matrix', `<div class="object-list">${exhibitRows}</div>`, '', 'ADMISSION CONTROL')}${field('Motions', `<div class="object-list">${motionRows}</div>`, 'wide-field', 'RULE SOURCE REQUIRED')}${field('Examinations', `<div class="object-list">${examinationRows}</div>`, '', 'DIRECT / CROSS / FOUNDATION')}${field('Jury instructions', `<div class="object-list">${instructionRows}</div>`, '', 'SOURCE REQUIRED')}${field('Trial events', `<div class="trial-form"><input id="trial-event-title" class="search-input" placeholder="Event title" aria-label="Trial event title"><input id="trial-event-date" class="search-input" type="date" aria-label="Trial event date"><button id="trial-record-event" class="action-button">RECORD EVENT</button></div><div class="object-list">${eventRows || '<p class="muted">No trial events recorded.</p>'}</div>`, 'wide-field', 'DATE + SOURCE REQUIRED')}${field('Arguments', `<div class="trial-form"><select id="trial-argument-side" aria-label="Argument side"><option>PLAINTIFF</option><option>DEFENSE</option></select><select id="trial-argument-segment" aria-label="Argument segment"><option>OPENING</option><option>CLOSING</option><option>REBUTTAL</option><option>OFFER_OF_PROOF</option></select><input id="trial-argument-text" class="search-input" placeholder="Argument text" aria-label="Argument text"><button id="trial-record-argument" class="action-button">RECORD ARGUMENT</button></div><div class="object-list">${argumentRows || '<p class="muted">No arguments recorded.</p>'}</div>`, '', 'PROVENANCE REQUIRED')}${field('Objection record', `<div class="trial-form"><select id="trial-objection-ground" aria-label="Objection ground">${grounds.map((ground) => `<option>${safe(ground)}</option>`).join('')}</select><input id="trial-objection-target" class="search-input" placeholder="Testimony or exhibit target" aria-label="Objection target"><label><input id="trial-objection-preserved" type="checkbox"> PRESERVE</label><button id="trial-record-objection" class="action-button">RECORD OBJECTION</button></div><div class="object-list">${objectionRows || '<p class="muted">No objections recorded.</p>'}</div>`, '', 'RULING + PRESERVATION')}${field('Ruling record', `<div class="trial-form"><input id="trial-ruling-target" class="search-input" placeholder="Target object ID" aria-label="Ruling target"><input id="trial-ruling-reasoning" class="search-input" placeholder="Ruling reasoning" aria-label="Ruling reasoning"><input id="trial-ruling-source" class="search-input" placeholder="Transcript or docket location" aria-label="Ruling record location"><select id="trial-ruling-result" aria-label="Ruling result"><option>SUSTAINED</option><option>OVERRULED</option><option>DENIED</option><option>GRANTED</option><option>PENDING</option></select><label><input id="trial-ruling-preserved" type="checkbox"> PRESERVE</label><button id="trial-record-ruling" class="action-button">RECORD RULING</button></div><div class="object-list">${rulingRows || '<p class="muted">No rulings recorded.</p>'}</div>`, 'wide-field', 'REASON + RECORD LOCATION REQUIRED')}${field('Verdict and judgment', `<div class="trial-form"><input id="trial-verdict" class="search-input" placeholder="Verdict result" aria-label="Verdict result"><button id="trial-record-verdict" class="action-button">RECORD VERDICT</button><input id="trial-judgment-date" class="search-input" type="date" aria-label="Judgment entry date"><button id="trial-record-judgment" class="action-button">RECORD JUDGMENT</button></div><div class="object-list">${judgmentRows}</div>`, 'wide-field', 'COURT RECORD REQUIRED')}${field('Costs', `<div class="object-list">${costRows}</div>`, '', 'RECEIPTS / COST RECORD')}${field('Enforcement and stay', `<div class="object-list">${enforcementRows}</div>`, '', 'JUDGMENT DEPENDENT')}${field('Appeal steps', `<div class="object-list">${appealRows}</div>`, 'wide-field', 'RULE + DOCKET REQUIRED')}${field('Appeal preservation', `<div class="trial-form"><input id="trial-appeal-issue" class="search-input" placeholder="Issue requiring preservation" aria-label="Appeal issue"><input id="trial-appeal-location" class="search-input" placeholder="Transcript or exhibit location" aria-label="Appeal record location"><button id="trial-record-appeal" class="action-button">RECORD ISSUE</button></div><div class="object-list">${issueRows || '<p class="muted">No appeal issues recorded.</p>'}</div>`, '', 'POST-TRIAL / APPEAL')}${field('Trial action history', `<div class="timeline">${actionRows || '<p class="muted">No trial actions recorded.</p>'}</div>`, 'wide-field', 'AUDIT TRAIL')}</div>`
}
function secondaryView(kind) { const target = kind === 'field-atlas' ? '../index.html' : '../cicero/index.html'; return `${header(kind === 'field-atlas' ? 'Field Atlas' : 'Cicero','SECONDARY APP')}<iframe class="iframe-field" src="${target}" title="${kind}"></iframe>` }

function render() { if (!state.data) return; const views = { command: commandView, evidence: evidenceView, law: lawView, elements: elementsView, procedure: procedureView, strategy: strategyView, moderate: moderateView, drafts: draftsView, deadlines: deadlinesView, coverage: coverageView, machine: machineView, trial: trialView, system: systemView }; stage.innerHTML = views[state.route] ? views[state.route]() : secondaryView(state.route); document.querySelectorAll('[data-route]').forEach((button) => button.classList.toggle('active', button.dataset.route === state.route)); document.querySelectorAll('[data-select]').forEach((node) => node.addEventListener('click', () => setSelected(node.dataset.select))); document.querySelectorAll('[data-case-action]').forEach((button) => button.addEventListener('click', () => runAction(button.dataset.caseAction, button.dataset.id))); document.querySelectorAll('[data-ledger-id]').forEach((select) => select.addEventListener('change', () => updateLedgerStatus(select.dataset.ledgerId, select.value))); document.querySelectorAll('[data-evidence-filter]').forEach((button) => button.addEventListener('click', () => { state.evidenceFilter = button.dataset.evidenceFilter; state.evidencePage = 0; render() })); document.querySelectorAll('[data-evidence-page]').forEach((button) => button.addEventListener('click', () => { state.evidencePage += button.dataset.evidencePage === 'next' ? 1 : -1; render() })); const ledgerQuery = el('#ledger-query'); if (ledgerQuery) { ledgerQuery.addEventListener('input', () => { state.ledgerQuery = ledgerQuery.value; refreshLedger() }); ledgerQuery.addEventListener('click', (event) => event.stopPropagation()) } const ledgerStatus = el('#ledger-status'); if (ledgerStatus) ledgerStatus.addEventListener('change', () => { state.ledgerStatus = ledgerStatus.value; refreshLedger() }); const unitSearch = el('#machine-unit-search'); if (unitSearch) { unitSearch.addEventListener('input', () => { state.machineQuery = unitSearch.value; render(); const next = el('#machine-unit-search'); if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length) } }); unitSearch.addEventListener('click', (event) => event.stopPropagation()) } const dropZone = el('#evidence-drop-zone'); if (dropZone) { const setDragging = (value) => dropZone.classList.toggle('is-dragging', value); dropZone.addEventListener('dragover', (event) => { event.preventDefault(); setDragging(true) }); dropZone.addEventListener('dragleave', () => setDragging(false)); dropZone.addEventListener('drop', async (event) => { event.preventDefault(); setDragging(false); const paths = [...event.dataTransfer.files].map((file) => file.path).filter(Boolean); if (!paths.length) return; try { const staged = await window.clo.stageDroppedEvidence(paths); showStagedEvidence(staged) } catch (error) { showActionError('DROP IMPORT FAILED', error) } }) } const procedureButton = el('#record-procedure-event'); if (procedureButton) procedureButton.addEventListener('click', () => runProcedureEvent()); const moderateButton = el('#record-moderation'); if (moderateButton) moderateButton.addEventListener('click', () => runModerationReview()); const strategyButton = el('#record-strategy'); if (strategyButton) strategyButton.addEventListener('click', () => runStrategyObservation()); const linkButton = el('#machine-link-front'); if (linkButton) linkButton.addEventListener('click', () => runMachineLink(el('#machine-proof-front').value, el('#machine-proof-target').value)); const deadlineButton = el('#machine-create-deadline'); if (deadlineButton) deadlineButton.addEventListener('click', () => runMachineDeadline(el('#machine-deadline-title').value, el('#machine-deadline-date').value)); const objectionButton = el('#trial-record-objection'); if (objectionButton) objectionButton.addEventListener('click', () => runTrialObjection()); const rulingButton = el('#trial-record-ruling'); if (rulingButton) rulingButton.addEventListener('click', () => runTrialRuling()); const verdictButton = el('#trial-record-verdict'); if (verdictButton) verdictButton.addEventListener('click', () => runTrialVerdict()); const judgmentButton = el('#trial-record-judgment'); if (judgmentButton) judgmentButton.addEventListener('click', () => runTrialJudgment()); const eventButton = el('#trial-record-event'); if (eventButton) eventButton.addEventListener('click', () => runTrialEvent()); const argumentButton = el('#trial-record-argument'); if (argumentButton) argumentButton.addEventListener('click', () => runTrialArgument()); const appealButton = el('#trial-record-appeal'); if (appealButton) appealButton.addEventListener('click', () => runTrialAppeal()); const importButton = el('#import-evidence'); if (importButton) importButton.addEventListener('click', openImport); renderInspector() }

async function runAction(action, objectId) {
  if (!window.clo?.action) return
  const selected = currentObject()
  const selectedAuthorityId = selected?.objectType === 'LAW' ? selected.id : state.data.law[0]?.id
  const selectedElementId = selected?.objectType === 'ELEMENT' ? selected.id : state.data.elements[0]?.id
  const payload = action === 'create-preservation-hold' ? { holdId: objectId } : action === 'record-activation' ? { activationId: objectId } : action === 'review-machine-source' ? { sourceId: objectId } : action === 'advance-trial-phase' ? { phaseId: objectId } : action === 'record-trial-task' ? { taskId: objectId, status: 'COMPLETE' } : action === 'update-procedure-event' ? { eventId: objectId, status: 'RECORDED' } : action === 'mark-exhibit-foundation' ? { exhibitId: objectId, witnessId: state.data.trialWitnesses?.[0]?.id, status: 'READY_FOR_FOUNDATION' } : action === 'record-examination' ? { examinationId: objectId, status: 'COMPLETE' } : action === 'record-trial-motion' ? { motionId: objectId, status: 'READY_FOR_REVIEW', source: 'Controlling motion rule and filing record required' } : action === 'record-jury-instruction' ? { instructionId: objectId, status: 'READY_FOR_REVIEW', source: 'Controlling instruction source required' } : action === 'record-witness-foundation' ? { witnessId: objectId, status: 'FOUNDATION_RECORDED', note: 'Transcript, stipulation, or exhibit foundation record required' } : action === 'record-exhibit-admission' ? { exhibitId: objectId, result: 'ADMITTED', source: 'Court ruling or stipulation required' } : action === 'record-trial-cost' ? { costId: objectId, status: 'RECORDED', source: 'Trial cost record required' } : action === 'record-enforcement-step' ? { stepId: objectId, status: 'RECORDED', recordLocation: 'Post-judgment record required' } : action === 'record-appellate-step' ? { stepId: objectId, status: 'RECORDED', recordLocation: 'Appellate docket or record required' } : action === 'verify-source' || action === 'create-proposition' ? { authorityId: selectedAuthorityId } : action === 'link-element' ? { authorityId: selectedAuthorityId, elementId: selectedElementId } : { id: objectId }
  if (action === 'record-trial-control') {
    payload.owner = window.prompt('Responsible owner:')?.trim()
    payload.nextAction = window.prompt('Next action:')?.trim()
    payload.source = window.prompt('Source or explicit source gap:')?.trim()
    payload.ruleSource = window.prompt('Controlling rule or explicit rule gap:')?.trim()
    if (!payload.owner || !payload.nextAction || !payload.source || !payload.ruleSource) return
  }
  if (action === 'record-witness-foundation') {
    payload.note = window.prompt('Transcript, stipulation, or exhibit foundation source:')?.trim()
    if (!payload.note) return
  }
  if (action === 'record-trial-cost') {
    const amount = window.prompt('Amount in the cost record:')
    if (amount === null || !amount.trim()) return
    payload.amount = amount.trim()
  }
  if (['update-procedure-event', 'mark-exhibit-foundation', 'record-examination', 'record-trial-motion', 'record-jury-instruction', 'record-trial-cost', 'record-enforcement-step', 'record-appellate-step', 'record-exhibit-admission'].includes(action)) {
    const source = window.prompt('Enter the controlling record source or location before recording this item:')
    if (!source?.trim()) return
    payload.source = source.trim()
    payload.recordLocation = source.trim()
  }
  try { state.data = await window.clo.action(action, payload); render() } catch (error) { drawer.hidden = false; drawer.innerHTML = `<p class="label state-danger">ACTION FAILED</p><p>${safe(error.message)}</p><button id="close-drawer" class="utility-button">CLOSE</button>`; el('#close-drawer').addEventListener('click', () => { drawer.hidden = true }) }
}

async function runMachineLink(frontId, targetValue) {
  if (!window.clo?.action) return
  const [targetType, targetId] = String(targetValue || '').split('|')
  try { state.data = await window.clo.action('link-machine-front', { frontId, targetType, targetId }); render() } catch (error) { drawer.hidden = false; drawer.innerHTML = `<p class="label state-danger">LINK FAILED</p><p>${safe(error.message)}</p><button id="close-drawer" class="utility-button">CLOSE</button>`; el('#close-drawer').addEventListener('click', () => { drawer.hidden = true }) }
}

async function runMachineDeadline(title, date) {
  if (!window.clo?.action) return
  try { state.data = await window.clo.action('create-machine-deadline', { title, date, source: 'Machine route explicit clock' }); render() } catch (error) { drawer.hidden = false; drawer.innerHTML = `<p class="label state-danger">CLOCK FAILED</p><p>${safe(error.message)}</p><button id="close-drawer" class="utility-button">CLOSE</button>`; el('#close-drawer').addEventListener('click', () => { drawer.hidden = true }) }
}

async function runStrategyObservation() {
  try {
    state.data = await window.clo.action('record-strategy-observation', { role: el('#strategy-role').value, observation: el('#strategy-observation').value, sourceUniverse: el('#strategy-universe').value, confidence: el('#strategy-confidence').value, uncertainty: el('#strategy-uncertainty').value, source: el('#strategy-source').value, linkedObjects: (el('#strategy-links')?.value || '').split(',').map((item) => item.trim()).filter(Boolean) })
    render()
  } catch (error) { showActionError('STRATEGY RECORD FAILED', error) }
}

async function runProcedureEvent() {
  const source = window.prompt('Docket, filing, service, or court record location:')?.trim()
  if (!source) return
  try { state.data = await window.clo.action('record-procedural-event', { title: el('#procedure-event-title').value, date: el('#procedure-event-date').value, source }); render() } catch (error) { showActionError('PROCEDURAL EVENT FAILED', error) }
}

async function runProcedureFiling() {
  try { state.data = await window.clo.action('record-filing', { title: el('#procedure-filing-title').value, date: el('#procedure-filing-date').value, source: el('#procedure-filing-source').value }); render() } catch (error) { showActionError('FILING FAILED', error) }
}

async function runProcedureService() {
  try { state.data = await window.clo.action('record-service', { servedParty: el('#procedure-service-party').value, method: el('#procedure-service-method').value, date: el('#procedure-service-date').value, source: el('#procedure-service-source').value }); render() } catch (error) { showActionError('SERVICE FAILED', error) }
}

async function runProcedureDocket() {
  try { state.data = await window.clo.action('record-docket-entry', { title: el('#procedure-docket-title').value, docketNumber: el('#procedure-docket-number').value, date: el('#procedure-docket-date').value, source: el('#procedure-docket-source').value }); render() } catch (error) { showActionError('DOCKET ENTRY FAILED', error) }
}

async function runCoverageGap() {
  try { state.data = await window.clo.action('record-evidence-gap', { title: el('#coverage-gap-title').value, requirement: el('#coverage-gap-requirement').value, nextAction: el('#coverage-gap-next').value, source: el('#coverage-gap-source').value, priority: 'HIGH' }); render() } catch (error) { showActionError('EVIDENCE GAP FAILED', error) }
}

async function runCoverageContradiction() {
  try { state.data = await window.clo.action('record-contradiction', { leftType: 'fact', leftId: el('#coverage-left-fact').value, leftStatement: el('#coverage-left-statement').value, rightType: 'fact', rightId: el('#coverage-right-fact').value, rightStatement: el('#coverage-right-statement').value, source: el('#coverage-contradiction-source').value }); render() } catch (error) { showActionError('CONTRADICTION FAILED', error) }
}

async function runCoverageProperty() {
  try { state.data = await window.clo.action('record-property-record', { address: el('#coverage-property-address').value, source: el('#coverage-property-source').value, recordType: 'PUBLIC_RECORD' }); render() } catch (error) { showActionError('PROPERTY RECORD FAILED', error) }
}

function downloadJson(filename, payload) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

async function exportEvidenceManifest() {
  try { downloadJson('clo-evidence-manifest.json', await window.clo.evidenceManifest()) } catch (error) { showActionError('MANIFEST EXPORT FAILED', error) }
}

async function exportCaseBackup() {
  try { downloadJson('clo-case-backup.json', await window.clo.backupSnapshot()) } catch (error) { showActionError('CASE BACKUP FAILED', error) }
}

async function runEvidenceLink(evidenceId, targetType, targetId) {
  try { state.data = await window.clo.linkEvidence(evidenceId, targetType, targetId); renderInspector() } catch (error) { showActionError('EVIDENCE LINK FAILED', error) }
}

async function runLawReview(authorityId) {
  try {
    state.data = await window.clo.action('review-authority-source', { authorityId, excerpt: el('#law-review-excerpt').value, sourcePage: el('#law-review-page').value, sourceVersion: el('#law-review-version').value, effectiveDate: el('#law-review-effective').value, jurisdiction: el('#law-review-jurisdiction').value, limitations: el('#law-review-limitations').value })
    renderInspector()
  } catch (error) { showActionError('SOURCE REVIEW FAILED', error) }
}

async function runFlagStaleAuthority(authorityId) {
  const reason = window.prompt('Why is this authority stale or no longer current?')?.trim()
  if (!reason) return
  try { state.data = await window.clo.action('flag-stale-authority', { authorityId, reason }); renderInspector() } catch (error) { showActionError('STALE SOURCE FAILED', error) }
}

async function runElementFactLink(elementId, factId) {
  try { state.data = await window.clo.action('link-element-fact', { elementId, factId }); render() } catch (error) { showActionError('FACT LINK FAILED', error) }
}

async function runElementAuthorityLink(elementId, authorityId) {
  try { state.data = await window.clo.action('link-element', { elementId, authorityId }); render() } catch (error) { showActionError('AUTHORITY LINK FAILED', error) }
}

async function runModerationReview() {
  try { state.data = await window.clo.action('record-moderation-review', { reviewId: el('#moderate-review-id').value, viewpointIntensity: el('#moderate-intensity').value, acceptanceWidth: el('#moderate-acceptance').value, confidence: el('#moderate-confidence').value, reason: el('#moderate-reason').value, source: el('#moderate-source').value }); render() } catch (error) { showActionError('MODERATION REVIEW FAILED', error) }
}

async function runTrialObjection() {
  const source = window.prompt('Transcript or exhibit record location:')?.trim()
  if (!source) return
  try { state.data = await window.clo.action('record-trial-objection', { ground: el('#trial-objection-ground').value, target: el('#trial-objection-target').value, preserved: el('#trial-objection-preserved').checked, source }); render() } catch (error) { showActionError('OBJECTION FAILED', error) }
}

async function runTrialVerdict() {
  const source = window.prompt('Verdict form or clerk record location:')?.trim()
  if (!source) return
  try { state.data = await window.clo.action('record-verdict', { verdict: el('#trial-verdict').value, source }); render() } catch (error) { showActionError('VERDICT FAILED', error) }
}

async function runTrialJudgment() {
  const source = window.prompt('Court judgment record source or docket location:')?.trim()
  if (!source) return
  try { state.data = await window.clo.action('record-judgment', { entryDate: el('#trial-judgment-date').value, relief: el('#trial-verdict').value, source }); render() } catch (error) { showActionError('JUDGMENT FAILED', error) }
}

async function runTrialEvent() {
  const source = window.prompt('Transcript, docket, or court record location:')?.trim()
  if (!source) return
  try { state.data = await window.clo.action('record-trial-event', { title: el('#trial-event-title').value, date: el('#trial-event-date').value, source }); render() } catch (error) { showActionError('TRIAL EVENT FAILED', error) }
}

async function runTrialArgument() {
  const source = window.prompt('Admitted record or attorney-notes source:')?.trim()
  if (!source) return
  try { state.data = await window.clo.action('record-trial-argument', { side: el('#trial-argument-side').value, segment: el('#trial-argument-segment').value, text: el('#trial-argument-text').value, source }); render() } catch (error) { showActionError('TRIAL ARGUMENT FAILED', error) }
}

async function runTrialRuling() {
  try { state.data = await window.clo.action('record-trial-ruling', { targetType: 'trialObject', targetId: el('#trial-ruling-target').value, result: el('#trial-ruling-result').value, reasoning: el('#trial-ruling-reasoning').value, preserved: el('#trial-ruling-preserved').checked, source: el('#trial-ruling-source').value }); render() } catch (error) { showActionError('RULING FAILED', error) }
}

async function runTrialAppeal() {
  try { state.data = await window.clo.action('record-appeal-issue', { issue: el('#trial-appeal-issue').value, recordLocation: el('#trial-appeal-location').value, preservation: 'OPEN' }); render() } catch (error) { showActionError('APPEAL ISSUE FAILED', error) }
}

async function refreshLedger() {
  state.ledgerRows = await window.clo.ledgerRequirements(state.ledgerQuery, state.ledgerStatus, 100)
  render()
}

async function updateLedgerStatus(requirementId, status) {
  try { await window.clo.updateRequirement(requirementId, status, { featureRefs: ['coverage-ledger-ui'], testEvidence: ['tests/ledger.test.cjs'] }); state.ledger = await window.clo.ledger(); await refreshLedger() } catch (error) { showActionError('LEDGER UPDATE FAILED', error) }
}

function showActionError(label, error) { drawer.hidden = false; drawer.innerHTML = `<p class="label state-danger">${safe(label)}</p><p>${safe(error.message)}</p><button id="close-drawer" class="utility-button">CLOSE</button>`; el('#close-drawer').addEventListener('click', () => { drawer.hidden = true }) }

function showStagedEvidence(staged) {
  const items = Array.isArray(staged) ? staged.filter(Boolean) : []
  if (!items.length) return
  state.stagedItems = items
  drawer.hidden = false
  drawer.innerHTML = `<p class="label">Evidence drawer</p><h2 class="inspector-name">${items.length} staged object${items.length > 1 ? 's' : ''}</h2><input id="staged-source" class="search-input" placeholder="Source / collection path / URL" aria-label="Evidence source"><input id="staged-custodian" class="search-input" placeholder="Custodian or producing entity" aria-label="Evidence custodian"><div class="object-list">${items.map((item) => `<div class="object-row"><div><strong>${safe(item.name)}</strong><small>${safe(item.hash)} · ${item.bytes} bytes · original ${safe(item.originalPath || 'clipboard')}</small></div><b class="state-pending">STAGED</b></div>`).join('')}</div><button id="commit-dropped-evidence" class="action-button">COMMIT EVIDENCE</button><button id="close-dropped-evidence" class="utility-button">CLOSE</button>`
  el('#commit-dropped-evidence').addEventListener('click', async () => { try { const source = el('#staged-source').value.trim(); const custodian = el('#staged-custodian').value.trim(); state.data = await window.clo.commitEvidence(items.map((item) => ({ ...item, source, custodian }))); drawer.hidden = true; render() } catch (error) { showActionError('COMMIT FAILED', error) } })
  el('#close-dropped-evidence').addEventListener('click', () => { drawer.hidden = true })
}

async function openImport() {
  drawer.hidden = false
  drawer.innerHTML = '<p class="label">Evidence drawer</p><h2 class="inspector-name">Import evidence</h2><p class="muted">Stage source material before committing it to the matter.</p><div class="button-row"><button id="choose-files" class="action-button">CHOOSE FILES</button><button id="choose-folder" class="utility-button">CHOOSE FOLDER</button><button id="choose-clipboard" class="utility-button">CLIPBOARD</button></div><button id="close-drawer" class="utility-button">CLOSE</button>'
  el('#close-drawer').addEventListener('click', () => { drawer.hidden = true })
  const stage = async (items) => {
    const staged = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean)
    if (!staged.length) return
    state.stagedItems = staged
    drawer.innerHTML = `<p class="label">Evidence drawer</p><h2 class="inspector-name">${staged.length} staged object${staged.length > 1 ? 's' : ''}</h2><input id="staged-source" class="search-input" placeholder="Source / collection path / URL" aria-label="Evidence source"><input id="staged-custodian" class="search-input" placeholder="Custodian or producing entity" aria-label="Evidence custodian"><div class="object-list">${staged.map((item) => `<div class="object-row"><div><strong>${safe(item.name)}</strong><small>${safe(item.hash)} · ${item.bytes} bytes</small></div><b class="state-pending">STAGED</b></div>`).join('')}</div><button id="commit-evidence" class="action-button">COMMIT EVIDENCE</button><button id="close-drawer" class="utility-button">CLOSE</button>`
    el('#commit-evidence').addEventListener('click', async () => { try { const source = el('#staged-source').value.trim(); const custodian = el('#staged-custodian').value.trim(); state.data = await window.clo.commitEvidence(staged.map((item) => ({ ...item, source, custodian }))); drawer.hidden = true; render() } catch (error) { showActionError('COMMIT FAILED', error) } }); el('#close-drawer').addEventListener('click', () => { drawer.hidden = true })
  }
  el('#choose-files').addEventListener('click', async () => stage(await window.clo.chooseEvidence()))
  el('#choose-folder').addEventListener('click', async () => stage(await window.clo.chooseEvidenceDirectory()))
  el('#choose-clipboard').addEventListener('click', async () => stage(await window.clo.clipboardEvidence()))
}

document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => { state.route = button.dataset.route; state.inspectorTab = 'DETAIL'; render() }))
el('#global-search').addEventListener('click', openSearch)
window.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); el('#global-search').click() } if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) { event.preventDefault(); const routes = ['command', 'evidence', 'law', 'elements', 'procedure', 'strategy', 'drafts', 'deadlines', 'system']; state.route = routes[Number(event.key) - 1]; render() } if ((event.metaKey || event.ctrlKey) && event.key === '0') { event.preventDefault(); state.route = 'trial'; render() } if (event.key === 'Escape') drawer.hidden = true; if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) && !drawer.hidden) return; if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) { const nodes = [...document.querySelectorAll('[data-select]')]; if (!nodes.length) return; let index = nodes.findIndex((node) => node.dataset.select === state.selected); if (event.key === 'ArrowDown') index = Math.min(index + 1, nodes.length - 1); if (event.key === 'ArrowUp') index = Math.max(index - 1, 0); if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSelected(nodes[index < 0 ? 0 : index].dataset.select) } } })

async function openSearch() {
  drawer.hidden = false
  drawer.innerHTML = '<p class="label">Object search</p><h2 class="inspector-name">Search matter objects</h2><input id="search-input" class="search-input" autocomplete="off" placeholder="Law, evidence, people, events..."><div id="search-results" class="object-list"></div><button id="close-search" class="utility-button">CLOSE</button>'
  const input = el('#search-input'); const results = el('#search-results')
  const update = async () => { const matches = await window.clo.search(input.value); results.innerHTML = matches.length ? matches.map((item) => `<button class="object-row search-result" data-search-id="${safe(item.id)}"><div><strong>${safe(item.name)}</strong><small>${safe(item.type)} · ${safe(item.status)} · ${safe(item.source)}</small></div><b>${safe(item.matterId)}</b></button>`).join('') : '<p class="muted">No indexed objects.</p>'; results.querySelectorAll('[data-search-id]').forEach((node) => node.addEventListener('click', () => { state.selected = node.dataset.searchId; drawer.hidden = true; renderInspector() })) }
  input.addEventListener('input', update); el('#close-search').addEventListener('click', () => { drawer.hidden = true }); input.focus()
}

const boot = async () => { state.data = await window.clo.getState(); if (window.clo.deriveDeadlines) state.data = await window.clo.deriveDeadlines(); const health = await window.clo.health(); state.health = health; state.ledger = window.clo.ledger ? await window.clo.ledger() : null; state.ledgerRows = window.clo.ledgerRequirements ? await window.clo.ledgerRequirements('', 'ALL', 100) : []; el('#file-count').textContent = String(state.data.evidence.length); el('#ram').textContent = `${Math.round(health.ram / 1024 / 1024)} MB`; el('#agent-count').textContent = String(health.agents); el('#agent-status').textContent = `${health.agents} ACTIVE`; el('#job-count').textContent = String(health.jobs); el('#ledger-status').textContent = String(state.ledger?.total || 2820); render() }
boot()
