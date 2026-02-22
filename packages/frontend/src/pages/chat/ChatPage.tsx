import { ChatHeader } from './ChatHeader'
import { MessageList } from '@/widgets/message-list'
import { PromptInput } from '@/widgets/prompt-input'

export function ChatPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col">
      <ChatHeader />
      <MessageList />
      <PromptInput />
    </div>
  )
}
