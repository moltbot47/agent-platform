import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllEvents, fetchAgentEvents, fetchDashboardSummary, fetchPipelineRuns } from '../events'
import client from '../client'

vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockClient = vi.mocked(client)

describe('events API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchAllEvents', () => {
    it('calls /events/all/ with no params', async () => {
      const response = { count: 0, next: null, previous: null, results: [] }
      mockClient.get.mockResolvedValue({ data: response })
      const result = await fetchAllEvents()
      expect(mockClient.get).toHaveBeenCalledWith('/events/all/', { params: undefined })
      expect(result).toEqual(response)
    })

    it('passes filter params', async () => {
      mockClient.get.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      })
      await fetchAllEvents({ event_type: 'prediction', outcome: 'pass', limit: 20 })
      expect(mockClient.get).toHaveBeenCalledWith('/events/all/', {
        params: { event_type: 'prediction', outcome: 'pass', limit: 20 },
      })
    })
  })

  describe('fetchAgentEvents', () => {
    it('calls /agents/{id}/events/', async () => {
      mockClient.get.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      })
      await fetchAgentEvents('agent-123', { limit: 10 })
      expect(mockClient.get).toHaveBeenCalledWith('/agents/agent-123/events/', {
        params: { limit: 10 },
      })
    })
  })

  describe('fetchDashboardSummary', () => {
    it('calls /metrics/dashboard/', async () => {
      const summary = { total_events: 100, events_today: 5 }
      mockClient.get.mockResolvedValue({ data: summary })
      const result = await fetchDashboardSummary()
      expect(mockClient.get).toHaveBeenCalledWith('/metrics/dashboard/')
      expect(result).toEqual(summary)
    })
  })

  describe('fetchPipelineRuns', () => {
    it('calls /agents/{id}/pipeline-runs/ with params', async () => {
      mockClient.get.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      })
      await fetchPipelineRuns('agent-123', { outcome: 'pass', limit: 20, offset: 0 })
      expect(mockClient.get).toHaveBeenCalledWith('/agents/agent-123/pipeline-runs/', {
        params: { outcome: 'pass', limit: 20, offset: 0 },
      })
    })

    it('propagates API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('500 Internal'))
      await expect(fetchPipelineRuns('bad-id')).rejects.toThrow('500 Internal')
    })
  })
})
