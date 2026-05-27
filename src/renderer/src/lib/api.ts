// Typed wrapper over window.bridge exposed by preload
declare global {
  interface Window {
    bridge: import('../../../preload/index').Bridge
  }
}

export const api = {
  get window() { return window.bridge.window },
  get dialog()  { return window.bridge.dialog },
  get cases()   { return window.bridge.cases },
  get evidence(){ return window.bridge.evidence },
  get custody() { return window.bridge.custody },
  get activity(){ return window.bridge.activity },
  get hashdb()  { return window.bridge.hashdb },
  get settings(){ return window.bridge.settings },
  get file()    { return window.bridge.file },
  get system()  { return window.bridge.system },
  get browser() { return window.bridge.browser },
  get log()     { return window.bridge.log },
  get timeline(){ return window.bridge.timeline },
  get image()   { return window.bridge.image },
  get ioc()     { return window.bridge.ioc },
  get sqlite()  { return window.bridge.sqlite },
  get email()   { return window.bridge.email },
  get archive() { return window.bridge.archive },
  get pcap()    { return window.bridge.pcap },
  get registry(){ return window.bridge.registry },
  get disk()    { return window.bridge.disk },
  get report()  { return window.bridge.report },
  get util()    { return window.bridge.util },
}

export type ApiResult<T> = { data: T | null; error: string | null }
