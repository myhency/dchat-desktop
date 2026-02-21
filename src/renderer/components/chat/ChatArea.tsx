import { useChatStore } from '../../stores/chat.store'
import { MessageList } from './MessageList'
import { PromptInput } from './PromptInput'
import { HomeScreen } from '../home/HomeScreen'
import { AllChatsScreen } from '../home/AllChatsScreen'
import { ProjectsScreen } from '../home/ProjectsScreen'

export function ChatArea(): React.JSX.Element {
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const allChatsOpen = useChatStore((s) => s.allChatsOpen)
  const projectsOpen = useChatStore((s) => s.projectsOpen)

  if (projectsOpen) {
    return <ProjectsScreen />
  }

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
