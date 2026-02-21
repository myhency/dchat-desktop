import type { HChatAPI } from '../preload/index'

declare global {
  interface Window {
    hchat: HChatAPI
  }
}
