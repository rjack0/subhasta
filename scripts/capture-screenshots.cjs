const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createStore } = require('../electron/store.cjs')

const routes = ['command', 'evidence', 'law', 'elements', 'procedure', 'strategy', 'drafts', 'deadlines', 'field-atlas', 'cicero']
const outputDir = path.join(__dirname, '..', 'artifacts', 'screenshots')

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  const store = await createStore(path.join(app.getPath('userData'), 'clo-case-store.sqlite3'))
  ipcMain.handle('case:state', () => store.snapshot())
  ipcMain.handle('system:health', () => ({ db: 'VERIFIED', index: 'READY', agents: 0, jobs: 0, ram: process.memoryUsage().rss }))
  ipcMain.handle('procedure:derive-deadlines', () => store.deriveDeadlines())
  const window = new BrowserWindow({ width: 1440, height: 900, show: false, backgroundColor: '#0C0E12', webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  await window.loadFile(path.join(__dirname, '..', 'clo', 'index.html'))
  await new Promise((resolve) => setTimeout(resolve, 250))
  for (const route of routes) {
    await window.webContents.executeJavaScript(`document.querySelector('[data-route="${route}"]')?.click()`)
    await new Promise((resolve) => setTimeout(resolve, 100))
    const image = await window.webContents.capturePage()
    await fs.writeFile(path.join(outputDir, `${route}-1440x900.png`), image.resize({ width: 1440, height: 900 }).toPNG())
  }
  await window.destroy()
  await app.quit()
}

app.whenReady().then(main).catch((error) => { console.error(error); app.quit(1) })
