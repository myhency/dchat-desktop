export interface GenerateTitleUseCase {
  generateTitle(sessionId: string): Promise<string | null>
}
