/**
 * API Client for ExamGuardrail Backend (Dashboard Frontend)
 * Centralizes all API communication with the FastAPI backend
 */

import { API_BASE } from '../config';

// Backend base URL - uses centralized config
const API_BASE_URL = API_BASE;

const api = {
  // Helper function to make API calls with proper headers
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  },

  // ============ SESSIONS API ============
  sessions: {
    /**
     * Create a new exam session
     * POST /api/sessions
     */
    create: async (sessionData) => {
      return api.request('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });
    },

    /**
     * Get a specific session with event history
     * GET /api/sessions/{session_id}
     */
    get: async (sessionId) => {
      return api.request(`/api/sessions/${sessionId}`);
    },

    /**
     * Get all questions for a session
     * GET /api/sessions/{session_id}/questions
     */
    getQuestions: async (sessionId) => {
      return api.request(`/api/sessions/${sessionId}/questions`);
    },

    /**
     * Get all active sessions (dashboard overview)
     * GET /api/dashboard/overview
     */
    getAll: async () => {
      return api.request('/api/dashboard/overview');
    },
  },

  // ============ EVENTS API ============
  events: {
    /**
     * Submit a behavioral event/violation
     * POST /api/events
     */
    submit: async (eventData) => {
      return api.request('/api/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
    },

    /**
     * WebSocket connection for real-time events
     * WS /api/ws/{session_id}
     */
    connectWebSocket: (sessionId) => {
      const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
      const baseUrlHost = new URL(API_BASE_URL).host;
      return new WebSocket(`${protocol}://${baseUrlHost}/api/ws/${sessionId}`);
    },
  },

  // ============ REPORTS API ============
  reports: {
    /**
     * Get credibility report for a session
     * GET /api/reports/{session_id}
     */
    get: async (sessionId) => {
      return api.request(`/api/reports/${sessionId}`);
    },

    /**
     * Export report as Excel
     * GET /api/reports/{session_id}/export
     */
    export: async (sessionId) => {
      // This returns a file blob
      const url = `${API_BASE_URL}/api/reports/${sessionId}/export`;
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to export report: HTTP ${response.status}`);
      }
      return response.blob();
    },
  },

  // ============ SUBMISSIONS API ============
  submissions: {
    /**
     * Submit an answer for analysis
     * POST /api/answers
     */
    submitAnswer: async (answerData) => {
      return api.request('/api/answers', {
        method: 'POST',
        body: JSON.stringify(answerData),
      });
    },
  },

  // ============ EXAMS API ============
  exams: {
    /**
     * Create a new exam
     * POST /api/exams/create
     */
    create: async (examData) => {
      return api.request('/api/exams/create', {
        method: 'POST',
        body: JSON.stringify(examData),
      });
    },

    /**
     * Generate exam questions using AI
     * POST /api/exams/generate-questions
     */
    generateQuestions: async (generationParams) => {
      return api.request('/api/exams/generate-questions', {
        method: 'POST',
        body: JSON.stringify(generationParams),
      });
    },
  },

  // ============ AUTH API ============
  auth: {
    /**
     * Login user
     * POST /api/auth/login
     */
    login: async (credentials) => {
      return api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },

    /**
     * Register new user
     * POST /api/auth/register
     */
    register: async (userData) => {
      return api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    /**
     * Logout user
     */
    logout: () => {
      localStorage.removeItem('authToken');
    },

    /**
     * Get current user
     * GET /api/auth/me
     */
    getMe: async () => {
      return api.request('/api/auth/me');
    },
  },

  // ============ HEALTH CHECK ============
  /**
   * Check if backend is healthy
   * GET /health
   */
  health: async () => {
    try {
      return await api.request('/health');
    } catch (error) {
      throw new Error(`Backend unavailable: ${error.message}`);
    }
  },
};

export default api;
