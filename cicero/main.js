const DEFAULT_ROLES = [
  ['Executive leadership', 0.1, 'Sets strategy, incentives, and enterprise targets.'],
  ['Legal and compliance', 1.0, 'Owns policy, risk, regulatory, and litigation exposure.'],
  ['Medical officers and reviewers', 2.0, 'Translates clinical policy into review and authorization practice.'],
  ['Middle management and directors', 3.9, 'Converts enterprise priorities into operating metrics.'],
  ['Software engineers and analysts', 9.0, 'Builds and maintains decision-support systems and reporting.'],
  ['Operations and customer support', 84.0, 'Executes routine service, claims, and administrative work.']
]

const state = { roles: DEFAULT_ROLES.map(([name, percent, note]) => ({ name, percent, note })) }
const refs = { name: document.querySelector('#org-name'), employees: document.querySelector('#employee-count'), source: document.querySelector('#source-note'), confidence: document.querySelector('#confidence'), assumptions: document.querySelector('#assumptions'), roles: document.querySelector('#role-inputs'), table: document.querySelector('#role-table'), total: document.querySelector('#allocation-total'), title: document.querySelector('#profile-title'), heading: document.querySelector('#cicero-heading'), alert: document.querySelector('#alert') }

function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback }
function renderInputs() {
  refs.roles.innerHTML = ''
  state.roles.forEach((role, index) => {
    const row = document.createElement('div'); row.className = 'role-row'
    const name = document.createElement('input'); name.value = role.name; name.setAttribute('aria-label', `Role ${index + 1} name`)
    const percent = document.createElement('input'); percent.type = 'number'; percent.min = '0'; percent.max = '100'; percent.step = '0.1'; percent.value = role.percent; percent.setAttribute('aria-label', `Role ${index + 1} percentage`)
    name.addEventListener('input', () => { role.name = name.value; renderTable() })
    percent.addEventListener('input', () => { role.percent = number(percent.value); renderTable() })
    row.append(name, percent); refs.roles.append(row)
  })
}
function renderTable() {
  const employees = Math.max(1, Math.round(number(refs.employees.value, 1)))
  const total = state.roles.reduce((sum, role) => sum + Math.max(0, number(role.percent)), 0)
  refs.title.textContent = refs.name.value || 'Untitled organization'
  refs.heading.textContent = refs.name.value || 'Untitled organization'
  refs.total.textContent = `${total.toFixed(1)}%`
  refs.alert.hidden = Math.abs(total - 100) < 0.05
  refs.alert.textContent = total > 100 ? 'Allocation exceeds 100%. Reduce one or more role percentages.' : 'Allocation is below 100%. Add or adjust roles until the model accounts for the full workforce.'
  refs.table.innerHTML = '<div class="table-row header"><span>Role</span><span>Share</span><span>Headcount</span><span>Operating knowledge / intent</span></div>'
  state.roles.forEach((role) => {
    const share = Math.max(0, number(role.percent)); const row = document.createElement('div'); row.className = 'table-row'
    row.innerHTML = `<strong>${role.name || 'Unnamed role'}</strong><span>${share.toFixed(1)}%</span><span class="headcount">${Math.round(employees * share / 100).toLocaleString()}</span><span>${role.note}</span>`
    refs.table.append(row)
  })
}
document.querySelector('#add-role').addEventListener('click', () => { state.roles.push({ name: 'New role', percent: 0, note: 'Add a source-backed description.' }); renderInputs(); renderTable() })
document.querySelector('#reset-button').addEventListener('click', () => { state.roles = DEFAULT_ROLES.map(([name, percent, note]) => ({ name, percent, note })); refs.name.value = 'Major insurance enterprise'; refs.employees.value = 390000; renderInputs(); renderTable() })
refs.name.addEventListener('input', renderTable); refs.employees.addEventListener('input', renderTable)
refs.source.addEventListener('input', renderTable); refs.confidence.addEventListener('input', renderTable)
document.querySelector('#export-context').addEventListener('click', async () => {
  const record = { type: 'CICERO_ORGANIZATION_PROFILE', name: refs.name.value, employees: number(refs.employees.value), source: refs.source.value, assumptions: refs.assumptions.value, confidence: number(refs.confidence.value) / 100, roles: state.roles }
  if (window.clo?.importContext) { await window.clo.importContext(record); document.querySelector('#export-status').textContent = 'CONTEXT SAVED' }
  else document.querySelector('#export-status').textContent = 'DESKTOP ONLY'
})
renderInputs(); renderTable()
