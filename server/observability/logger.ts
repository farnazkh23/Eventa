export type LogValue = string | number | boolean | null | undefined

export interface LogFields {
  requestId?: string
  endpoint?: string
  operation?: string
  status?: number
  durationMs?: number
  attempt?: number
  errorCategory?: string
  cache?: 'hit' | 'miss' | 'deduplicated' | 'disabled'
  [key: string]: LogValue
}

export function logServer(level: 'info' | 'warn' | 'error', fields: LogFields): void {
  if (process.env.NODE_ENV === 'test') return
  const payload = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
  console[level](JSON.stringify({ time: new Date().toISOString(), level, ...requestStorage.getStore(), ...payload }))
}

export function logDevelopmentServer(level: 'info' | 'warn' | 'error', fields: LogFields): void {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') return
  logServer(level, fields)
}

export function withRequestContext<T>(context: { requestId: string; endpoint: string }, work: () => T): T {
  return requestStorage.run(context, work)
}

export async function timeOperation<T>(
  operation: string,
  fields: LogFields,
  work: () => Promise<T> | T,
): Promise<{ result: T; durationMs: number }> {
  const started = performance.now()
  try {
    const result = await work()
    const durationMs = Math.round(performance.now() - started)
    logServer('info', { ...fields, operation, durationMs })
    return { result, durationMs }
  } catch (error) {
    const durationMs = Math.round(performance.now() - started)
    logServer('error', { ...fields, operation, durationMs, errorCategory: error instanceof Error ? error.name : 'unknown' })
    throw error
  }
}
import { AsyncLocalStorage } from 'node:async_hooks'

const requestStorage = new AsyncLocalStorage<{ requestId: string; endpoint: string }>()
