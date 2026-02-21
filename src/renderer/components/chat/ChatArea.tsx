import { useChatStore } from '../../stores/chat.store'
import { useProjectStore } from '../../stores/project.store'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { PromptInput } from './PromptInput'
import { HomeScreen } from '../home/HomeScreen'
import { AllChatsScreen } from '../home/AllChatsScreen'
import { ProjectsScreen } from '../home/ProjectsScreen'
import { ProjectDetailScreen } from '../home/ProjectDetailScreen'

export function ChatArea(): React.JSX.Element {
  const currentSessionId = useChatStore((s) => s.currentSessionId)
  const allChatsOpen = useChatStore((s) => s.allChatsOpen)
  const projectsOpen = useChatStore((s) => s.projectsOpen)
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)

  if (projectsOpen) {
    if (selectedProjectId) return <ProjectDetailScreen />
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
      <ChatHeader />
      <MessageList />
      <PromptInput />
    </div>
  )
}
