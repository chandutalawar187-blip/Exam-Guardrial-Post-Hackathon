// exam-guardrail-sdk/src/GuardrailSDK.js
// Core SDK class — works with any framework (React, Vue, Angular, Vanilla JS)

export class GuardrailSDK {
  constructor({ apiBase = '/api', onViolation = null, onMediaStateChange = null, onAgentAlert = null } = {}) {
    this.apiBase = apiBase;
    this.sessionId = null;
    this.userId = null;
    this.violations = 0;
    this.violationLog = [];
    this.onViolation = onViolation;
    this.onMediaStateChange = onMediaStateChange;
    this.onAgentAlert = onAgentAlert;
    this.mediaStream = null;
    this.mediaState = 'idle';
    this.agentStatus = 'unknown'; // 'connected' | 'disconnected' | 'unknown'
    this._cleanupFns = [];
    this._proctoringTimer = null;
    this._agentPollTimer = null;
    this._videoEl = null;
    this._canvasEl = null;
    this._audioCtx = null;
    this._analyser = null;
    this._lastViolation = { face: 0, audio: 0 };
    this._initialWidth = 0;
    this._initialHeight = 0;
  }

  // ── SESSION ────────────────────────────────────────────────
  // sessionId: any unique string (their session/exam ID)
  // userId: any unique string (their user/student ID)
  startSession(sessionId, userId) {
    this.sessionId = sessionId;
    this.userId = userId;
    this._initialWidth = window.innerWidth;
    this._initialHeight = window.innerHeight;
  }

  // ── REPORT VIOLATION ───────────────────────────────────────
  async reportViolation(eventType, severity = 'HIGH') {
    this.violations++;
    const entry = { eventType, severity, timestamp: new Date().toISOString(), count: this.violations };
    this.violationLog.push(entry);
    if (this.onViolation) this.onViolation(eventType, severity, this.violations);

    if (!this.sessionId) return; // offline mode — just count locally

    try {
      await fetch(`${this.apiBase}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          event_type: eventType,
          severity: severity,
          layer: 'L1',
          metadata: { source: 'exam-guardrail-sdk', user_id: this.userId }
        })
      });
    } catch (err) {
      console.warn('[exam-guardrail] Failed to report violation:', err.message);
    }
  }

  // ── BEHAVIORAL MONITORING ──────────────────────────────────
  startMonitoring() {
    const self = this;

    const onVisibility = () => {
      if (document.hidden) self.reportViolation('TAB_HIDDEN', 'HIGH');
    };
    const onBlur = () => self.reportViolation('WINDOW_FOCUS_LOST', 'HIGH');
    const onContext = (e) => { e.preventDefault(); self.reportViolation('RIGHT_CLICK', 'MEDIUM'); };
    const onClipboard = (e) => { e.preventDefault(); self.reportViolation('CLIPBOARD_ATTEMPT', 'HIGH'); };
    const onKeydown = (e) => {
      const isDevTools = e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'u');
      if (isDevTools) { e.preventDefault(); self.reportViolation('DEVTOOLS_ATTEMPT', 'CRITICAL'); }
      if (e.ctrlKey && ['c','v','x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        self.reportViolation('CLIPBOARD_ATTEMPT', 'HIGH');
      }
    };
    const onResize = () => {
      const dw = Math.abs(window.innerWidth - self._initialWidth);
      const dh = Math.abs(window.innerHeight - self._initialHeight);
      if (dw > 50 || dh > 50) self.reportViolation('SCREEN_RESIZE', 'HIGH');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContext);
    ['copy', 'cut', 'paste'].forEach(ev => document.addEventListener(ev, onClipboard));
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);

    this._cleanupFns.push(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContext);
      ['copy', 'cut', 'paste'].forEach(ev => document.removeEventListener(ev, onClipboard));
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', onResize);
    });
  }

  // ── MEDIA (Camera + Mic) ──────────────────────────────────
  async requestMedia() {
    this._setMediaState('requesting');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCam = devices.some(d => d.kind === 'videoinput');
      const hasMic = devices.some(d => d.kind === 'audioinput');

      if (!hasCam && !hasMic) {
        this._setMediaState('unavailable');
        return false;
      }

      const constraints = {};
      if (hasCam) constraints.video = { width: 320, height: 240, facingMode: 'user' };
      if (hasMic) constraints.audio = { echoCancellation: true, noiseSuppression: true };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this._setMediaState('granted');
      return true;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        this._setMediaState('unavailable');
      } else {
        this._setMediaState('denied');
      }
      return false;
    }
  }

  _setMediaState(state) {
    this.mediaState = state;
    if (this.onMediaStateChange) this.onMediaStateChange(state);
  }

  // ── PROCTORING (Face + Audio Analysis) ─────────────────────
  startProctoring() {
    if (!this.mediaStream) return;

    this._videoEl = document.createElement('video');
    this._videoEl.srcObject = this.mediaStream;
    this._videoEl.muted = true;
    this._videoEl.playsInline = true;
    this._videoEl.play().catch(() => {});
    this._canvasEl = document.createElement('canvas');

    const audioTracks = this.mediaStream.getAudioTracks();
    if (audioTracks.length > 0) {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this._audioCtx.createMediaStreamSource(this.mediaStream);
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 256;
      source.connect(this._analyser);
    }

    let noFaceCount = 0, lookAwayCount = 0, highAudioCount = 0;
    const FACE_THRESHOLD = 5;
    const AUDIO_THRESHOLD = 8;
    const self = this;

    const loop = () => {
      const status = self._analyzeFace();
      if (status === 'no_face') {
        noFaceCount++; lookAwayCount = 0;
        if (noFaceCount >= FACE_THRESHOLD) {
          const now = Date.now();
          if (now - self._lastViolation.face > 10000) {
            self.reportViolation('FACE_NOT_DETECTED', 'HIGH');
            self._lastViolation.face = now;
          }
          noFaceCount = 0;
        }
      } else if (status === 'looking_away') {
        lookAwayCount++; noFaceCount = 0;
        if (lookAwayCount >= FACE_THRESHOLD) {
          const now = Date.now();
          if (now - self._lastViolation.face > 10000) {
            self.reportViolation('GAZE_AWAY', 'MEDIUM');
            self._lastViolation.face = now;
          }
          lookAwayCount = 0;
        }
      } else {
        noFaceCount = Math.max(0, noFaceCount - 1);
        lookAwayCount = Math.max(0, lookAwayCount - 1);
      }

      if (self._analyser) {
        const bufLen = self._analyser.frequencyBinCount;
        const dataArr = new Uint8Array(bufLen);
        self._analyser.getByteFrequencyData(dataArr);
        let sum = 0;
        for (let i = 0; i < bufLen; i++) sum += dataArr[i];
        const avg = sum / bufLen;

        if (avg > 70) {
          highAudioCount++;
          if (highAudioCount >= AUDIO_THRESHOLD) {
            const now = Date.now();
            if (now - self._lastViolation.audio > 15000) {
              self.reportViolation('LOUD_AUDIO_DETECTED', 'MEDIUM');
              self._lastViolation.audio = now;
            }
            highAudioCount = 0;
          }
        } else {
          highAudioCount = Math.max(0, highAudioCount - 1);
        }
      }

      self._proctoringTimer = setTimeout(loop, 500);
    };

    loop();
    this._cleanupFns.push(() => {
      clearTimeout(this._proctoringTimer);
      if (this._audioCtx) this._audioCtx.close().catch(() => {});
    });
  }

  _analyzeFace() {
    const video = this._videoEl;
    const canvas = this._canvasEl;
    if (!video || !canvas || video.readyState < 2) return 'ok';

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 160; canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;
    const startX = 32, endX = 128, startY = 12, endY = 84;
    let skinPixels = 0, totalPixels = 0, skinWeightedX = 0;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * 160 + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const isSkin = r > 60 && g > 40 && b > 20 && r > g && r > b &&
          (r - g) > 10 && Math.abs(r - g) < 150 &&
          (r + g + b) > 150 && (r + g + b) < 700;
        totalPixels++;
        if (isSkin) { skinPixels++; skinWeightedX += x; }
      }
    }

    const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
    if (skinRatio < 0.04) return 'no_face';
    if (skinPixels > 0) {
      const avgX = skinWeightedX / skinPixels;
      const offset = Math.abs(avgX - 80) / 80;
      if (offset > 0.45) return 'looking_away';
    }
    return 'ok';
  }

  getVideoStream() { return this.mediaStream; }

  getAudioLevel() {
    if (!this._analyser) return 0;
    const bufLen = this._analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);
    this._analyser.getByteFrequencyData(dataArr);
    let sum = 0;
    for (let i = 0; i < bufLen; i++) sum += dataArr[i];
    return Math.min(100, Math.round((sum / bufLen / 128) * 100));
  }

  getFaceStatus() { return this._analyzeFace(); }

  getViolationLog() { return [...this.violationLog]; }

  // ── NATIVE AGENT STATUS ────────────────────────────────────
  // Polls the backend to check if a native agent is running for this session.
  // The native agent detects hidden AI tools + screen sharing apps on the OS.

  startAgentPolling(intervalMs = 5000) {
    if (!this.sessionId) return;
    const self = this;

    const poll = async () => {
      try {
        const res = await fetch(`${self.apiBase}/native-agent/status/${self.sessionId}`);
        const data = await res.json();
        self.agentStatus = data.status || 'disconnected';

        if (self.onAgentAlert && data.stats) {
          const { findings, blocked } = data.stats;
          if (findings > 0 || blocked > 0) {
            self.onAgentAlert(data);
          }
        }
      } catch {
        self.agentStatus = 'disconnected';
      }
    };

    poll();
    this._agentPollTimer = setInterval(poll, intervalMs);
    this._cleanupFns.push(() => clearInterval(self._agentPollTimer));
  }

  getAgentStatus() { return this.agentStatus; }

  async triggerAgentScan() {
    if (!this.sessionId) return null;
    try {
      const res = await fetch(`${this.apiBase}/native-agent/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId, block: true })
      });
      return await res.json();
    } catch (err) {
      console.warn('[exam-guardrail] Agent scan failed:', err.message);
      return null;
    }
  }

  async getBlockedProcessList() {
    try {
      const res = await fetch(`${this.apiBase}/native-agent/blocked-list`);
      return await res.json();
    } catch {
      return { count: 0, processes: [] };
    }
  }

  stop() {
    this._cleanupFns.forEach(fn => fn());
    this._cleanupFns = [];
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
}
