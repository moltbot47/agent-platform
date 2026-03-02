import type { AgentDetail, AgentListItem, RegistrationRequest, RegistrationResponse } from '../types'
import api from './client'

export async function fetchAgents(params?: { type?: string; status?: string }): Promise<AgentListItem[]> {
  const { data } = await api.get<AgentListItem[]>('/agents/', { params })
  return data
}

export async function fetchAgent(id: string): Promise<AgentDetail> {
  const { data } = await api.get<AgentDetail>(`/agents/${id}/`)
  return data
}

export async function registerAgent(payload: RegistrationRequest): Promise<RegistrationResponse> {
  const { data } = await api.post<RegistrationResponse>('/register/', payload)
  return data
}

export async function fetchMarketplace(): Promise<AgentListItem[]> {
  const { data } = await api.get<AgentListItem[]>('/marketplace/')
  return data
}
