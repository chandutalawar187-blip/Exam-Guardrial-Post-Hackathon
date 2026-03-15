/**
 * Custom Hooks for Backend API Integration - Dashboard
 * Provides React hooks for fetching and managing backend data
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Hook: Get all active exam sessions (for admin dashboard)
 */
export function useAllSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.sessions.getAll();
      setSessions(Array.isArray(data) ? data : data.sessions || []);
    } catch (err) {
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Poll for session updates every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}

/**
 * Hook: Get individual session details with event history
 */
export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.sessions.get(sessionId);
        setSession(data);
      } catch (err) {
        setError(err.message);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return { session, loading, error };
}

/**
 * Hook: Get credibility report for a session
 */
export function useReport(sessionId) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await api.reports.get(sessionId);
      setReport(data);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return { report, loading, error, refetch: fetchReport };
}

/**
 * Hook: WebSocket connection for real-time events
 */
export function useEventStream(sessionId) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    let ws;
    const connectWebSocket = () => {
      try {
        ws = api.events.connectWebSocket(sessionId);
        
        ws.onopen = () => {
          setConnected(true);
          setError(null);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setEvents(prev => [data, ...prev]);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };
        
        ws.onerror = (err) => {
          setError('WebSocket connection error');
          setConnected(false);
        };
        
        ws.onclose = () => {
          setConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
      } catch (err) {
        setError(err.message);
        setConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [sessionId]);

  return { connected, events, error };
}

/**
 * Hook: Submit behavioral event/violation
 */
export function useEventSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitEvent = useCallback(async (eventData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.events.submit(eventData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitEvent, loading, error };
}

/**
 * Hook: Create exam session
 */
export function useCreateSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSession = useCallback(async (sessionData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.sessions.create(sessionData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createSession, loading, error };
}

/**
 * Hook: Submit answer for analysis
 */
export function useAnswerSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitAnswer = useCallback(async (answerData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.submissions.submitAnswer(answerData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitAnswer, loading, error };
}

/**
 * Hook: Generate exam questions using AI
 */
export function useGenerateQuestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQuestions = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.exams.generateQuestions(params);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateQuestions, loading, error };
}

/**
 * Hook: Export report as Excel
 */
export function useReportExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exportReport = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await api.reports.export(sessionId);
      // Trigger file download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${sessionId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { exportReport, loading, error };
}

/**
 * Hook: Backend health check
 */
export function useBackendHealth() {
  const [healthy, setHealthy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.health();
        setHealthy(true);
        setError(null);
      } catch (err) {
        setHealthy(false);
        setError(err.message);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return { healthy, error };
}
