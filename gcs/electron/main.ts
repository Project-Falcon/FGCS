import { BrowserWindow, Menu, MenuItemConstructorOptions, MessageBoxOptions, app, dialog, ipcMain, nativeImage, shell } from 'electron'
import { glob } from 'glob'
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'os'
import packageInfo from '../package.json'

// @ts-expect-error - no types available
import openFile from './fla'
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let loadingWin: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let pythonBackend: ChildProcessWithoutNullStreams | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'app_icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    alwaysOnTop: true,
  })

  win.setMenuBarVisibility(true)

  // Open links in browser, not within the electron window.
  // Note, links must have target="_blank"
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)

    return { action: 'deny' }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }

  // Swap to main window when ready
  win.once('ready-to-show', () => {
    loadingWin?.destroy()
    win?.maximize()
    // Window starts always on top so it opens even if loading window is hid
    win?.setAlwaysOnTop(false)
  })

  setMainMenu()
}

function setMainMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: 'About FGCS',
          click: async () => {
            const icon = nativeImage.createFromPath(path.join(__dirname, '../public/window_loading_icon-2.png'))

            const options: MessageBoxOptions = {
              type: 'info',
              buttons: [ 'OK','Report a bug',],
              title: 'About FGCS',
              message: 'FGCS Version: ' + app.getVersion(), // get version from package.json
              detail: 'For more information, visit our GitHub page.',
              icon: icon,
              defaultId: 1,
            };

          const response = await dialog.showMessageBox(options);
            if (response.response === 1) {
              shell.openExternal(packageInfo.bugs.url)
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Report a bug',
          click: async () => {
            await shell.openExternal(
              packageInfo.bugs.url,
            )
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createLoadingWindow() {
  loadingWin = new BrowserWindow({
    frame: false,
    transparent: true,
    center: true,
  })

  // Resize and center window
  loadingWin.loadFile(
    path.join(process.env.VITE_PUBLIC, 'window_loading_icon.svg'),
  )
  loadingWin.setSize(300, 300, true)
  loadingWin.center()
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }

  console.log('Killing backend')
  // kill any processes with the name "fgcs_backend.exe"
  // Windows
  spawn('taskkill /f /im fgcs_backend.exe', { shell: true })
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createLoadingWindow()
  ipcMain.handle('fla:open-file', openFile)
  ipcMain.handle('fla:get-fgcs-logs', async () => {
    const fgcsLogsPath = path.join(os.homedir(), 'FGCS', 'logs')
    try {
      const fgcsLogs = await glob(path.join(fgcsLogsPath, '*.ftlog'), {
        nodir: true,
        windowsPathsNoEscape: true,
      }) // Get a list of .ftlog files
      if (!Array.isArray(fgcsLogs)) {
        throw new Error(
          `Expected fgcsLogs to be an array, but got ${typeof fgcsLogs}`,
        )
      }
      const slicedFgcsLogs = fgcsLogs.slice(0, 20) // Only return the last 20 logs

      return slicedFgcsLogs.map((logPath) => {
        const logName = path.basename(logPath, '.ftlog')
        const fileStats = fs.statSync(logPath)
        return {
          name: logName,
          path: logPath,
          size: fileStats.size,
        }
      })
    } catch (error) {
      return []
    }
  })
  ipcMain.handle('app:get-node-env', () =>
    app.isPackaged ? 'production' : 'development',
  )
  ipcMain.handle('app:get-version', () => app.getVersion())

  if (app.isPackaged && pythonBackend === null) {
    console.log('Starting backend')
    pythonBackend = spawn('extras/fgcs_backend.exe')

    pythonBackend.on('error', () => {
      console.error('Failed to start backend.')
    })
  }

  createWindow()
})
