import { useChatStore } from '../../stores/chat.store'
import { MessageList } from './MessageList'
import { PromptInput } from './PromptInput'
import { HomeScreen } from '../home/HomeScreen'
import { AllChatsScreen } from '../home/AllChatsScreen'

export function ChatArea(): React.JSX.Element {
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const allChatsOpen = useChatStore((s) => s.allChatsOpen)

  if (allChatsOpen) {
    return <AllChatsScreen />
  }

  if (!currentSessionId) {
    return <HomeScreen />
  }

  return (
    <div className="flex flex-1 flex-col">
      <MessageList />
      <PromptInput />
    </div>
  )
}
