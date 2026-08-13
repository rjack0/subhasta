const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('clo', {
  getState: () => ipcRenderer.invoke('case:state'),
  save: (patch) => ipcRenderer.invoke('case:save', patch),
  chooseEvidence: () => ipcRenderer.invoke('evidence:choose-files'),
  chooseEvidenceDirectory: () => ipcRenderer.invoke('evidence:choose-directory'),
  clipboardEvidence: () => ipcRenderer.invoke('evidence:clipboard'),
  commitEvidence: (staged) => ipcRenderer.invoke('evidence:commit', staged),
  importContext: (record) => ipcRenderer.invoke('context:import', record),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
  health: () => ipcRenderer.invoke('system:health')
})
