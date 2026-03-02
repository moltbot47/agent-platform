import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAgent, fetchAgents, fetchMarketplace, registerAgent } from '../api/agents'
import type { RegistrationRequest } from '../types'

export function useAgents(params?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => fetchAgents(params),
    staleTime: 10_000,
  })
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => fetchAgent(id),
    enabled: !!id,
  })
}

export function useMarketplace() {
  return useQuery({
    queryKey: ['marketplace'],
    queryFn: fetchMarketplace,
    staleTime: 30_000,
  })
}

export function useRegisterAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegistrationRequest) => registerAgent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}
