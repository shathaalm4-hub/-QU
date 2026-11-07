// Trace logger for reproducing and tracking title state lifecycle events
export interface TraceEvent {
  timestamp: string;
  type: string;
  payload: Record<string, any>;
}

declare global {
  interface Window {
    __TITLE_TRACE_LOGS?: TraceEvent[];
  }
}

export function logTrace(type: string, payload: Record<string, any> = {}) {
  const event: TraceEvent = {
    timestamp: new Date().toISOString(),
    type,
    payload,
  };

  if (typeof window !== 'undefined') {
    window.__TITLE_TRACE_LOGS = window.__TITLE_TRACE_LOGS || [];
    window.__TITLE_TRACE_LOGS.push(event);
  }

  // Keep logs visible in DevTools and server logs
  console.log(`[TITLE-TRACE] [${event.type}]`, JSON.stringify(payload));
}

export function getTraceLogs(): TraceEvent[] {
  if (typeof window !== 'undefined') {
    return window.__TITLE_TRACE_LOGS || [];
  }
  return [];
}
