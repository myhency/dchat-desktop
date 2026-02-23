import { describe, it, expect } from 'vitest'
import { formatErrorMessage } from '../adapters/inbound/http/chat.routes'

describe('formatErrorMessage', () => {
  it('Anthropic APIError 형태에서 내부 메시지 추출', () => {
    const error = Object.assign(new Error('529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}'), {
      status: 529,
      error: { error: { type: 'overloaded_error', message: 'Overloaded' } }
    })
    expect(formatErrorMessage(error)).toBe('Overloaded')
  })

  it('JSON이 포함된 일반 Error에서 JSON 앞부분만 추출', () => {
    const error = new Error('Something went wrong {"detail":"internal"}')
    expect(formatErrorMessage(error)).toBe('Something went wrong')
  })

  it('일반 Error.message 그대로 반환', () => {
    const error = new Error('Network timeout')
    expect(formatErrorMessage(error)).toBe('Network timeout')
  })

  it('Error가 아닌 값은 Unknown error 반환', () => {
    expect(formatErrorMessage('string error')).toBe('Unknown error')
    expect(formatErrorMessage(null)).toBe('Unknown error')
    expect(formatErrorMessage(42)).toBe('Unknown error')
  })
})
