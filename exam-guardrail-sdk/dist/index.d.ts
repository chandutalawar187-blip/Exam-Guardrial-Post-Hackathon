// Type definitions for exam-guardrail

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ViolationEntry {
  eventType: string;
  severity: Severity;
  timestamp: string;
  count: number;
}

export interface AgentStatusData {
  status: string;
  platform?: string;
  timestamp?: string;
  stats?: { scans: number; findings: number; blocked: number; errors: number };
}

export interface AgentScanResult {
  status: string;
  findings_count: number;
  findings: object[];
  blocked_count: number;
}

export interface BlockedProcessList {
  count: number;
  processes: string[];
}

export interface GuardrailSDKOptions {
  apiBase?: string;
  onViolation?: (eventType: string, severity: Severity, totalCount: number) => void;
  onMediaStateChange?: (state: MediaState) => void;
  onAgentAlert?: (data: AgentStatusData) => void;
}

export type MediaState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
export type FaceStatus = 'ok' | 'looking_away' | 'no_face';
export type AgentStatus = 'connected' | 'disconnected' | 'unknown';

export declare class GuardrailSDK {
  sessionId: string | null;
  userId: string | null;
  violations: number;
  violationLog: ViolationEntry[];
  mediaState: MediaState;
  mediaStream: MediaStream | null;

  constructor(options?: GuardrailSDKOptions);

  startSession(sessionId: string, userId?: string): void;
  reportViolation(eventType: string, severity?: Severity): Promise<void>;
  startMonitoring(): void;
  requestMedia(): Promise<boolean>;
  startProctoring(): void;
  getVideoStream(): MediaStream | null;
  getAudioLevel(): number;
  getFaceStatus(): FaceStatus;
  getViolationLog(): ViolationEntry[];

  // Native agent
  agentStatus: AgentStatus;
  startAgentPolling(intervalMs?: number): void;
  getAgentStatus(): AgentStatus;
  triggerAgentScan(): Promise<AgentScanResult | null>;
  getBlockedProcessList(): Promise<BlockedProcessList>;

  stop(): void;
}
