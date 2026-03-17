import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export function useAllSessions() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    async function fetchSessions() {
      const { data } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setSessions(data || []);
    }
    fetchSessions();
    const channel = supabase
      .channel('all-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' }, fetchSessions)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);
  return sessions;
}

export function useSessionEvents(sessionId) {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`events-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events',
        filter: `session_id=eq.${sessionId}` },
        payload => setEvents(prev => [payload.new, ...prev].slice(0, 50)))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [sessionId]);
  return events;
}
