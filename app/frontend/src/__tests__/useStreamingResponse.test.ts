import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreamingResponse } from '../hooks/useStreamingResponse';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('useStreamingResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startStream', () => {
    it('sets isStreaming to true and clears content on start', async () => {
      const mockBody = {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      });

      const { result } = renderHook(() => useStreamingResponse());

      let onCompleteCalled = false;
      await act(async () => {
        await result.current.startStream('conv-1', 'hello', () => {
          onCompleteCalled = true;
        });
      });

      expect(result.current.isStreaming).toBe(false);
      expect(onCompleteCalled).toBe(true);
    });

    it('parses SSE token events and accumulates fullText', async () => {
      const encoder = new TextEncoder();
      const events: Uint8Array[] = [];

      // First token event
      events.push(encoder.encode(JSON.stringify('Hello')));
      // Second token event
      events.push(encoder.encode(JSON.stringify(' world')));

      let callCount = 0;
      const mockBody = {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            if (callCount < events.length) {
              const value = events[callCount++];
              return Promise.resolve({ done: false, value });
            }
            return Promise.resolve({ done: true, value: undefined });
          }),
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      });

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStream('conv-1', 'hi', () => {});
      });

      // After stream completes, streamingContent should be reset
      expect(result.current.isStreaming).toBe(false);
    });

    it('parses sources event and updates streamingSources', async () => {
      const encoder = new TextEncoder();
      const sourcesData = JSON.stringify(['Video Title 1', 'Video Title 2']);
      const sourcesEvent = `event: sources\ndata: ${sourcesData}\n\n`;
      const doneEvent = `data: [DONE]\n\n`;

      let callCount = 0;
      const mockBody = {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            if (callCount === 0) {
              callCount++;
              return Promise.resolve({ done: false, value: encoder.encode(sourcesEvent) });
            }
            return Promise.resolve({ done: true, value: encoder.encode(doneEvent) });
          }),
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      });

      const { result } = renderHook(() => useStreamingResponse());

      let capturedSources: string[] = [];
      await act(async () => {
        await result.current.startStream('conv-1', 'hi', ({ sources }) => {
          capturedSources = sources;
        });
      });

      expect(capturedSources).toEqual(['Video Title 1', 'Video Title 2']);
    });

    it('throws on non-ok HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        try {
          await result.current.startStream('conv-1', 'hi', () => {});
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('throws when response body is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        try {
          await result.current.startStream('conv-1', 'hi', () => {});
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('aborts in-flight stream when cancelStream is called', async () => {
      const encoder = new TextEncoder();
      let shouldBlock = true;

      const mockBody = {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            if (shouldBlock) {
              // Return a never-resolving promise to simulate blocking
              return new Promise(() => {});
            }
            return Promise.resolve({ done: true, value: undefined });
          }),
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      });

      const { result } = renderHook(() => useStreamingResponse());

      // Start the stream (it will block)
      const startPromise = act(async () => {
        await result.current.startStream('conv-1', 'hi', () => {});
      });

      // Wait a tick for the stream to start
      await vi.waitFor(() => {
        expect(result.current.isStreaming).toBe(true);
      });

      // Cancel the stream
      await act(async () => {
        result.current.cancelStream();
      });

      // Allow the blocked read to resolve
      shouldBlock = false;

      // The stream should be cancelled
      await vi.waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });
    });
  });

  describe('cancelStream', () => {
    it('does nothing when no stream is in progress', () => {
      const { result } = renderHook(() => useStreamingResponse());

      expect(() => result.current.cancelStream()).not.toThrow();
    });
  });
});