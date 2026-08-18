const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createStore } = require('../electron/store.cjs')

const routes = ['command', 'evidence', 'law', 'elements', 'procedure', 'strategy', 'drafts', 'deadlines', 'coverage', 'machine', 'trial', 'field-atlas', 'cicero']
const responsive = [{ name: 'shell-1024', width: 1024, height: 900 }, { name: 'shell-mobile', width: 390, height: 844 }]
const outputDir = path.join(__dirname, '..', 'artifacts', 'screenshots')

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  const captureDb = path.join(outputDir, '.capture-case.sqlite3')
  const store = await createStore(captureDb)
  ipcMain.handle('case:state', () => store.snapshot())
  ipcMain.handle('case:save', (_, patch) => store.update(patch))
  ipcMain.handle('case:action', (_, action, payload) => store.applyAction(action, payload))
  ipcMain.handle('case:search', (_, query) => store.search(query))
  ipcMain.handle('system:health', () => ({ ...store.health(), ram: process.memoryUsage().rss }))
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
  for (const capture of responsive) {
    window.setSize(capture.width, capture.height)
    await window.webContents.executeJavaScript('document.querySelector(`[data-route="command"]`)?.click()')
    await new Promise((resolve) => setTimeout(resolve, 100))
    const image = await window.webContents.capturePage()
    await fs.writeFile(path.join(outputDir, `${capture.name}.png`), image.resize({ width: capture.width, height: capture.height }).toPNG())
  }
  window.setSize(1440, 900)
  const captureState = async (name) => { const image = await window.webContents.capturePage(); await fs.writeFile(path.join(outputDir, `${name}.png`), image.resize({ width: 1440, height: 900 }).toPNG()) }
  await window.webContents.executeJavaScript('document.querySelector(`[data-route="command"]`)?.click(); document.querySelector(`[data-select]`)?.click()')
  await new Promise((resolve) => setTimeout(resolve, 100))
  await captureState('inspector-selected')
  await window.webContents.executeJavaScript('document.querySelector(`[data-route="machine"]`)?.click(); document.querySelector(`[data-select]`)?.click()')
  await new Promise((resolve) => setTimeout(resolve, 100))
  await captureState('machine-inspector-selected')
  await window.webContents.executeJavaScript('document.querySelector(`[data-route="trial"]`)?.click(); document.querySelector(`[data-select]`)?.click()')
  await new Promise((resolve) => setTimeout(resolve, 100))
  await captureState('trial-inspector-selected')
  await window.webContents.executeJavaScript('document.querySelector(`[data-route="evidence"]`)?.click(); document.querySelector(`#import-evidence`)?.click()')
  await new Promise((resolve) => setTimeout(resolve, 100))
  await captureState('evidence-import-drawer')
  await window.webContents.executeJavaScript('window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); document.querySelector(`[data-route="elements"]`)?.click(); document.querySelector(`[data-case-action="validate-filing"]`)?.click()')
  await new Promise((resolve) => setTimeout(resolve, 150))
  await captureState('validation-failure')
  await store.update({ elements: store.snapshot().elements.map((element) => ({ ...element, status: 'COMPLETE', proof: 100, missing: null })) })
  const reload = new Promise((resolve) => window.webContents.once('did-finish-load', resolve))
  window.webContents.reload()
  await reload
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript('document.querySelector(`[data-route="elements"]`)?.click(); document.querySelector(`[data-case-action="validate-filing"]`)?.click()')
  await new Promise((resolve) => setTimeout(resolve, 150))
  await window.webContents.executeJavaScript('document.querySelector("#stage").scrollTop = document.querySelector("#stage").scrollHeight')
  await captureState('export-ready')
  await window.destroy()
  await fs.rm(captureDb, { force: true })
  await app.quit()
}

app.whenReady().then(main).catch((error) => { console.error(error); app.quit(1) })
