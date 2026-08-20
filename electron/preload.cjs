const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('clo', {
  getState: () => ipcRenderer.invoke('case:state'),
  save: (patch) => ipcRenderer.invoke('case:save', patch),
  action: (name, payload) => ipcRenderer.invoke('case:action', name, payload),
  search: (query) => ipcRenderer.invoke('case:search', query),
  ledger: () => ipcRenderer.invoke('ledger:state'),
  ledgerRequirements: (query, status, limit) => ipcRenderer.invoke('ledger:requirements', query, status, limit),
  updateRequirement: (id, status, evidence) => ipcRenderer.invoke('ledger:update', id, status, evidence),
  linkEvidence: (evidenceId, targetType, targetId) => ipcRenderer.invoke('evidence:link', evidenceId, targetType, targetId),
  deriveDeadlines: () => ipcRenderer.invoke('procedure:derive-deadlines'),
  chooseEvidence: () => ipcRenderer.invoke('evidence:choose-files'),
  chooseEvidenceDirectory: () => ipcRenderer.invoke('evidence:choose-directory'),
  stageDroppedEvidence: (paths) => ipcRenderer.invoke('evidence:drop-files', paths),
  clipboardEvidence: () => ipcRenderer.invoke('evidence:clipboard'),
  commitEvidence: (staged) => ipcRenderer.invoke('evidence:commit', staged),
  importContext: (record) => ipcRenderer.invoke('context:import', record),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
  health: () => ipcRenderer.invoke('system:health'),
  evidenceManifest: () => ipcRenderer.invoke('evidence:manifest'),
  backupSnapshot: () => ipcRenderer.invoke('case:backup')
})
