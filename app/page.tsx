'use client'

import { diff } from 'deep-object-diff'
import {QRCodeSVG} from 'qrcode.react'
import { useState, useEffect, useRef } from 'react'
import { StyleSheet, css } from 'aphrodite'
import { Snack, getSupportedSDKVersions, SDKVersion } from 'snack-sdk'
import dynamic from 'next/dynamic'

import createWorkerTransport from '../components/transports/createWorkerTransport'
import { Button } from '../components/Button'
import { Toolbar } from '../components/Toolbar'
import defaults from '../components/Defaults'

const INITIAL_CODE_CHANGES_DELAY = 500
const VERBOSE = false
const USE_WORKERS = true

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
  },
  left: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #eee',
  },
  preview: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  right: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #eee',
  },
  code: {
    flex: 1,
    margin: 0,
    padding: 16,
    width: '100%',
    border: 0,
    resize: 'none',
    fontFamily: 'monospace',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  previewFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    border: 0,
  },
  previewNotSupported: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  settingsContainer: {
    borderBottom: '1px solid #eee',
  },
  settingsContent: {
    padding: 16,
  },
  onlineContainer: {
    flex: 1,
  },
  onlineContent: {
    padding: 16,
  },
  button: {
    marginRight: 8,
  },
  qrcode: {
    display: 'block',
    margin: '8px 0',
  },
})

// Create a client-only component for the main app content
export default function SnackEditor() {
  const webPreviewRef = useRef<Window | null>(null)
  const [snack, setSnack] = useState<Snack | null>(null)
  const [snackState, setSnackState] = useState<ReturnType<Snack['getState']>>({
    files: {},
    dependencies: {},
    missingDependencies: {},
    disabled: false,
    channel: '',
    url: '',
    deviceId: '',
    id: '',
    online: false,
    onlineName: '',
    connectedClients: {},
    name: '',
    description: '',
    sdkVersion: getSupportedSDKVersions()[0],
    webPreviewURL: '',
    transports: {},
    user: undefined,
    unsaved: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [codeChangesDelay, setCodeChangesDelay] = useState(INITIAL_CODE_CHANGES_DELAY)
  const [isClientReady, setClientReady] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newSnack = new Snack({
        ...defaults,
        disabled: false,
        codeChangesDelay: INITIAL_CODE_CHANGES_DELAY,
        verbose: true,
        webPreviewRef,
        ...(USE_WORKERS ? { createTransport: createWorkerTransport } : {}),
      })
      
      setSnack(newSnack)
      setSnackState(newSnack.getState())
      console.log("newSnack.getState()", newSnack.getState())
      setClientReady(true)

      const listeners = [
        newSnack.addStateListener((state, prevState) => {
          console.log('State changed: ', diff(prevState, state))
          setSnackState(state)
        }),
        newSnack.addLogListener(({ message }) => console.log(message)),
      ]

      return () => listeners.forEach((listener) => listener())
    }
  }, [])

  // Early return if not client-side yet
  if (!isClientReady || !snack) {
    return <div>Loading...</div>
  }

  const {
    files,
    url,
    deviceId,
    online,
    onlineName,
    connectedClients,
    name,
    description,
    sdkVersion,
    webPreviewURL,
    id,
  } = snackState

  return (
    <main className={css(styles.container)}>
      <div className={css(styles.left)}>
        <Toolbar title="Code" />
        <textarea
          className={css(styles.code)}
          value={files['App.js'].contents as string}
          onChange={(event) =>
            snack.updateFiles({
              'App.js': {
                type: 'CODE',
                contents: event.target.value,
              },
            })
          }
        />
        <p>Open the Developer Console of your Browser to view logs.</p>
      </div>
      <div className={css(styles.preview)}>
        <Toolbar title="Preview" />
        <div className={css(styles.previewContainer)}>
          <iframe
            className={css(styles.previewFrame)}
            ref={(c) => {
              if (c) {
                webPreviewRef.current = c.contentWindow;
              } else {
                webPreviewRef.current = null;
              }
            }}
            src={isClientReady ? webPreviewURL : undefined}
            allow="geolocation; camera; microphone"
          />
          {isClientReady && !webPreviewURL && (
            <div className={css(styles.previewNotSupported)}>
              <label>Set the SDK Version to 40.0.0 or higher to use Web preview</label>
            </div>
          )}
        </div>
      </div>
      <div className={css(styles.right)}>
        <div className={css(styles.settingsContainer)}>
          <Toolbar>
            <Button
              style={styles.button}
              label="Save"
              loading={isSaving}
              onClick={async () => {
                console.log('Saving...')
                setIsSaving(true)
                try {
                  const { id } = await snack.saveAsync()
                  console.log(`Saved with id ${id}`)
                } catch (err) {
                  console.error('Save failed', err)
                }
                setIsSaving(false)
              }}
            />
            <Button
              label="Download"
              loading={isDownloading}
              onClick={async () => {
                console.log('Getting download URL...')
                setIsDownloading(true)
                try {
                  const url = await snack.getDownloadURLAsync()
                  console.log(`Download URL: ${url}, starting download...`)
                } catch (err) {
                  console.error('Get download URL failed', err)
                }
                setIsDownloading(false)
              }}
            />
          </Toolbar>
          <div className={css(styles.settingsContent)}>
            <label>Name</label>
            
            <input
              type="text"
              value={name}
              onChange={(event) => snack.setName(event.target.value)}
            /> <br/>
            <a href={`https://snack.expo.dev/${id}`}>See on Snack</a><br/>
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(event) => snack.setDescription(event.target.value)}
            />
            <label>SDK Version</label>
            <select
              value={sdkVersion}
              onChange={(event) => snack.setSDKVersion(event.target.value as SDKVersion)}>
              {getSupportedSDKVersions().map((ver) => (
                <option key={ver} value={ver}>
                  {ver}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={css(styles.onlineContainer)}>
          <Toolbar title="Connections">
            <Button
              label={online ? 'Go Offline' : 'Go Online'}
              onClick={() => snack.setOnline(!online)}
            />
          </Toolbar>
          <div className={css(styles.onlineContent)}>
            <label>Device Id</label>
            <input
              type="text"
              placeholder="xxxx-xxxx"
              value={deviceId}
              onChange={(event) => snack.setDeviceId(event.target.value)}
            />
            <label>Send Code changes automatically</label>
            <select
              value={codeChangesDelay}
              onChange={(event) => {
                snack.setCodeChangesDelay(Number(event.target.value))
                setCodeChangesDelay(Number(event.target.value))
              }}>
              <option value={-1}>Disabled (-1)</option>
              <option value={0}>Immediately (0)</option>
              <option value={500}>Debounced (after 500ms)</option>
            </select>
            {codeChangesDelay === -1 ? (
              <Button label="Send Code changes" onClick={() => snack.sendCodeChanges()} />
            ) : undefined}
            <label>{`Status: ${online ? 'Online' : 'Offline'}`}</label>
            {online ? <QRCodeSVG className={css(styles.qrcode)} value={url} /> : undefined}
            {online ? <a href={url}>{url}</a> : undefined}
            {online ? <label>{`Online name: ${onlineName}`}</label> : undefined}
            {online ? (
              <label>{`${Object.keys(connectedClients).length} connected client(s)`}</label>
            ) : undefined}
          </div>
        </div>
      </div>
    </main>
  )
}

 