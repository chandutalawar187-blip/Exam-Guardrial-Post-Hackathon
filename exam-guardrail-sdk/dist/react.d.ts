// Type definitions for exam-guardrail/react

import { GuardrailSDK, MediaState, FaceStatus, AgentStatus, AgentScanResult, ViolationEntry } from './index';

export interface UseGuardrailOptions {
  apiBase?: string;
  sessionId?: string | null;
  userId?: string | null;
  autoStart?: boolean;
}

export interface UseGuardrailReturn {
  sdk: GuardrailSDK | null;
  violations: number;
  mediaState: MediaState;
  faceStatus: FaceStatus;
  audioLevel: number;
  agentStatus: AgentStatus;
  startMonitoring: () => void;
  requestMedia: () => Promise<boolean> | undefined;
  startProctoring: () => void;
  startAgentPolling: () => void;
  triggerAgentScan: () => Promise<AgentScanResult | null> | undefined;
  stop: () => void;
  getVideoStream: () => MediaStream | null | undefined;
  getViolationLog: () => ViolationEntry[];
}

export declare function useGuardrail(options?: UseGuardrailOptions): UseGuardrailReturn;
