import type { Session } from '../../entities/session'

export interface SessionRepository {
  findAll(): Promise<Session[]>
  findById(id: string): Promise<Session | null>
  save(session: Session): Promise<void>
  delete(id: string): Promise<void>
}
