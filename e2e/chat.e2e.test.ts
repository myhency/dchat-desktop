import { describe, it, expect, afterAll } from 'vitest'
import { browser } from 'vibium'

describe('chat E2E', () => {
  let vibe: Awaited<ReturnType<typeof browser.launch>>

  afterAll(async () => {
    await vibe?.quit()
  })

  it('loads the app and shows the sidebar', async () => {
    vibe = await browser.launch({ headless: true })
    await vibe.go('http://localhost:5173')

    const sidebar = await vibe.find('.flex.h-full.w-64')
    expect(sidebar).toBeTruthy()

    const newChatLabel = await vibe.find('button.w-full span')
    const text = await newChatLabel.text()
    expect(text).toContain('새 채팅')
  })

  it('sends a message and displays it', async () => {
    // Type a message in the HomeScreen textarea
    const textarea = await vibe.find('textarea')
    await textarea.type('Hello from E2E test')

    // Find and click the send button (bg-primary class on HomeScreen)
    const sendButton = await vibe.find('button.bg-primary')
    await sendButton.click()

    // Wait for navigation to ChatPage and verify user message bubble
    const messageBubble = await vibe.find('.bg-primary.text-white p.whitespace-pre-wrap')
    const text = await messageBubble.text()
    expect(text).toContain('Hello from E2E test')
  })
})
