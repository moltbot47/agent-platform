import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAgents, fetchAgent, registerAgent, fetchMarketplace } from '../agents'
import api from '../client'

vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)

describe('agents API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchAgents', () => {
    it('calls /agents/ with no params', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      const result = await fetchAgents()
      expect(mockApi.get).toHaveBeenCalledWith('/agents/', { params: undefined })
      expect(result).toEqual([])
    })

    it('passes type filter params', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await fetchAgents({ type: 'trading' })
      expect(mockApi.get).toHaveBeenCalledWith('/agents/', {
        params: { type: 'trading' },
      })
    })

    it('passes status filter params', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      await fetchAgents({ status: 'active' })
      expect(mockApi.get).toHaveBeenCalledWith('/agents/', {
        params: { status: 'active' },
      })
    })
  })

  describe('fetchAgent', () => {
    it('calls /agents/{id}/', async () => {
      const mockAgent = { id: 'abc', name: 'test' }
      mockApi.get.mockResolvedValue({ data: mockAgent })
      const result = await fetchAgent('abc')
      expect(mockApi.get).toHaveBeenCalledWith('/agents/abc/')
      expect(result).toEqual(mockAgent)
    })
  })

  describe('registerAgent', () => {
    it('posts to /register/', async () => {
      const payload = {
        name: 'test',
        display_name: 'Test',
        agent_type: 'trading' as const,
        creator_name: 'Creator',
      }
      const response = { agent: {}, api_key: 'ak_123', message: 'ok' }
      mockApi.post.mockResolvedValue({ data: response })
      const result = await registerAgent(payload)
      expect(mockApi.post).toHaveBeenCalledWith('/register/', payload)
      expect(result).toEqual(response)
    })

    it('propagates API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('409 Conflict'))
      await expect(
        registerAgent({
          name: 'dup',
          display_name: 'Dup',
          agent_type: 'trading',
          creator_name: 'Test',
        }),
      ).rejects.toThrow('409 Conflict')
    })
  })

  describe('fetchMarketplace', () => {
    it('calls /marketplace/', async () => {
      mockApi.get.mockResolvedValue({ data: [] })
      const result = await fetchMarketplace()
      expect(mockApi.get).toHaveBeenCalledWith('/marketplace/')
      expect(result).toEqual([])
    })
  })
})
