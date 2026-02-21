export const IPC_CHANNELS = {
  CHAT: {
    SEND_MESSAGE: 'chat:send-message',
    GET_MESSAGES: 'chat:get-messages',
    STREAM_CHUNK: 'chat:stream-chunk',
    STREAM_END: 'chat:stream-end',
    STREAM_ERROR: 'chat:stream-error',
    STOP_STREAM: 'chat:stop-stream',
    REGENERATE: 'chat:regenerate'
  },
  SESSION: {
    CREATE: 'session:create',
    LIST: 'session:list',
    GET: 'session:get',
    DELETE: 'session:delete',
    UPDATE_MODEL: 'session:update-model',
    UPDATE_TITLE: 'session:update-title',
    TOGGLE_FAVORITE: 'session:toggle-favorite',
    TITLE_UPDATED: 'session:title-updated',
    LIST_BY_PROJECT: 'session:list-by-project',
    UPDATE_PROJECT: 'session:update-project'
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:get-all'
  },
  LLM: {
    LIST_MODELS: 'llm:list-models'
  },
  PROJECT: {
    CREATE: 'project:create',
    LIST: 'project:list',
    DELETE: 'project:delete',
    UPDATE: 'project:update',
    UPDATE_INSTRUCTIONS: 'project:update-instructions'
  },
  ARTIFACT: {
    OPEN_IN_BROWSER: 'artifact:open-in-browser'
  }
} as const
