import { describe, expect, it, vi } from 'vitest'
import { generateKiconnectStructuredJson } from './kiconnect.js'

const request = {
  apiKey: 'safe-test-key', baseUrl: 'https://example.test/api/v1', model: 'exact-model-id',
  systemInstruction: 'Return an object.', contents: 'Test', responseJsonSchema: { type: 'object' },
  schemaName: 'test_schema', endpoint: '/api/interpret-event' as const, temperature: 0.1,
}

describe('KI:connect structured transport', () => {
  it('uses OpenAI-compatible chat completions with JSON Schema output', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"ok":true}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(generateKiconnectStructuredJson({ ...request, fetchImplementation })).resolves.toEqual({ ok: true })
    const [url, init] = fetchImplementation.mock.calls[0] ?? []
    expect(url).toBe('https://example.test/api/v1/chat/completions')
    const body = JSON.parse(String(init?.body)) as { model: string; response_format: { type: string; json_schema: { strict: boolean } } }
    expect(body).toMatchObject({ model: 'exact-model-id', response_format: { type: 'json_schema', json_schema: { strict: true } } })
    expect(String((init?.headers as Record<string, string>).Authorization)).toBe('Bearer safe-test-key')
  })

  it('retries transient responses and respects Retry-After', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '7' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 }))
    const sleep = vi.fn(async () => undefined)
    await generateKiconnectStructuredJson({ ...request, fetchImplementation, sleep })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(7_000)
  })

  it('does not retry permanent authentication errors', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }))
    const sleep = vi.fn(async () => undefined)
    await expect(generateKiconnectStructuredJson({ ...request, fetchImplementation, sleep })).rejects.toMatchObject({
      status: 401, category: 'permanent_configuration', transient: false,
    })
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('rejects markdown or arbitrary text rather than extracting JSON', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"ok":true}\n```' } }],
    }), { status: 200 }))
    await expect(generateKiconnectStructuredJson({ ...request, fetchImplementation })).rejects.toThrow('invalid structured response')
  })
})
