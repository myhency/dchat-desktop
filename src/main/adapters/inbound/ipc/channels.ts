export const IPC_CHANNELS = {
  CHAT: {
    SEND_MESSAGE: 'chat:send-message',
    GET_MESSAGES: 'chat:get-messages',
    STREAM_CHUNK: 'chat:stream-chunk',
    STREAM_END: 'chat:stream-end',
    STREAM_ERROR: 'chat:stream-error',
    STOP_STREAM: 'chat:stop-stream'
  },
  SESSION: {
    CREATE: 'session:create',
    LIST: 'session:list',
    GET: 'session:get',
    DELETE: 'session:delete',
    UPDATE_MODEL: 'session:update-model',
    TITLE_UPDATED: 'session:title-updated'
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:get-all'
  },
  LLM: {
    LIST_MODELS: 'llm:list-models'
  }
} as const
