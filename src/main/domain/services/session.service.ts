import type { Session } from '../entities/session'
import type { ManageSessionUseCase } from '../ports/inbound/manage-session.usecase'
import type { SessionRepository } from '../ports/outbound/session.repository'
import type { MessageRepository } from '../ports/outbound/message.repository'
import { generateId } from './id'

export class SessionService implements ManageSessionUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly messageRepo: MessageRepository
  ) {}

  async create(title: string, model: string): Promise<Session> {
    const now = new Date()
    const session: Session = {
      id: generateId(),
      title,
      model,
      createdAt: now,
      updatedAt: now
    }
    await this.sessionRepo.save(session)
    return session
  }

  async list(): Promise<Session[]> {
    return this.sessionRepo.findAll()
  }

  async getById(id: string): Promise<Session | null> {
    return this.sessionRepo.findById(id)
  }

  async delete(id: string): Promise<void> {
    await this.messageRepo.deleteBySessionId(id)
    await this.sessionRepo.delete(id)
  }

  async updateModel(id: string, model: string): Promise<Session> {
    const session = await this.sessionRepo.findById(id)
    if (!session) {
      throw new Error(`Session not found: ${id}`)
    }
    session.model = model
    session.updatedAt = new Date()
    await this.sessionRepo.save(session)
    return session
  }
}
