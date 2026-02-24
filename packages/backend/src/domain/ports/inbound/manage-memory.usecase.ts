export interface ManageMemoryUseCase {
  getMemory(): Promise<{ content: string; updatedAt: string | null }>
  deleteMemory(): Promise<void>
  editMemory(instruction: string, model: string): Promise<{ content: string; updatedAt: string }>
}
