const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const { clipboard } = require('electron')
const { createStore } = require('./store.cjs')

let mainWindow
let store

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#0C0E12',
    title: 'CLO',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow.loadFile(path.join(__dirname, '..', 'clo', 'index.html'))
  mainWindow.once('ready-to-show', () => { if (process.env.CLO_BACKGROUND_CAPTURE !== '1') mainWindow.show() })
}

function registerIpc() {
  ipcMain.handle('case:state', () => store.snapshot())
  ipcMain.handle('case:save', (_, patch) => {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid state patch')
    const allowed = new Set(['matter', 'strategy'])
    if (Object.keys(patch).some((key) => !allowed.has(key))) throw new Error('State patch contains a protected collection')
    return store.update(patch)
  })
  ipcMain.handle('case:action', (_, action, payload) => {
    if (typeof action !== 'string' || !/^[a-z-]+$/.test(action)) throw new Error('Invalid case action')
    return store.applyAction(action, payload && typeof payload === 'object' ? payload : {})
  })
  ipcMain.handle('case:search', (_, query) => store.search(query))
  ipcMain.handle('ledger:state', () => store.ledgerSummary())
  ipcMain.handle('ledger:update', (_, requirementId, status, evidence) => store.updateRequirement(requirementId, status, evidence))
  ipcMain.handle('evidence:link', (_, evidenceId, targetType, targetId) => store.linkEvidence(evidenceId, targetType, targetId))
  ipcMain.handle('procedure:derive-deadlines', () => store.deriveDeadlines())
  ipcMain.handle('evidence:choose-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'] })
    if (result.canceled) return []
    return Promise.all(result.filePaths.map((filePath) => store.stageEvidence(filePath)))
  })
  ipcMain.handle('evidence:choose-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
    if (result.canceled) return []
    const entries = await fs.readdir(result.filePaths[0], { withFileTypes: true })
    const files = entries.filter((entry) => entry.isFile()).map((entry) => path.join(result.filePaths[0], entry.name))
    return Promise.all(files.map((filePath) => store.stageEvidence(filePath)))
  })
  ipcMain.handle('evidence:drop-files', async (_, paths) => {
    if (!Array.isArray(paths) || paths.length > 100 || paths.some((filePath) => typeof filePath !== 'string' || !filePath.trim())) throw new Error('Dropped evidence paths are invalid')
    return Promise.all(paths.map((filePath) => store.stageEvidence(filePath)))
  })
  ipcMain.handle('evidence:clipboard', () => {
    const text = clipboard.readText()
    if (!text.trim()) return null
    return store.stageTextEvidence(text)
  })
  ipcMain.handle('evidence:commit', (_, staged) => store.commitEvidence(staged))
  ipcMain.handle('external:open', (_, url) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) return shell.openExternal(url)
    return false
  })
  ipcMain.handle('context:import', (_, record) => store.addContext(record))
  ipcMain.handle('system:health', () => ({ ...store.health(), ram: process.memoryUsage().rss }))
}

app.whenReady().then(async () => {
  store = await createStore(path.join(app.getPath('userData'), 'clo-case-store.sqlite3'))
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
