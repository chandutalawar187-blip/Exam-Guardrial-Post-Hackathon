// dashboard/src/components/ProctoringMonitor.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * ProctoringMonitor — Camera + Microphone proctoring overlay.
 *
 * Eye/face monitoring:  Uses a periodic canvas snapshot of the webcam feed.
 *   - Detects if the student's face disappears from the frame (no face detected)
 *   - Detects if the student is looking away from screen (eye gaze estimation via face position)
 *
 * Audio monitoring:  Monitors ambient noise levels via Web Audio API.
 *   - Reports violations when sustained loud audio is detected (potential talking/dictation)
 *
 * Props:
 *   onViolation(eventType, severity)  — callback to report a violation
 *   enabled  — whether monitoring is active
 *   hasMedia — whether camera/mic are available
 *   stream   — the MediaStream from getUserMedia
 */
export default function ProctoringMonitor({ onViolation, enabled, hasMedia, stream }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const [cameraScore, setCameraScore] = useState(100);
  const [audioScore, setAudioScore] = useState(100);
  const [faceStatus, setFaceStatus] = useState('ok'); // ok | looking_away | no_face
  const [audioLevel, setAudioLevel] = useState(0);
  const lastViolationRef = useRef({ face: 0, audio: 0 });

  // ── Attach video stream ────────────────────────────────────
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);

  // ── Audio analyser setup ────────────────────────────────────
  useEffect(() => {
    if (!stream || !enabled) return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    return () => {
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, enabled]);

  // ── Face / eye detection via canvas analysis ────────────────
  const analyzeFace = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return 'ok';

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;

    // Skin-tone detection in the center region of the frame
    // We check the center 60% of the frame for skin-colored pixels
    const startX = Math.floor(160 * 0.2);
    const endX = Math.floor(160 * 0.8);
    const startY = Math.floor(120 * 0.1);
    const endY = Math.floor(120 * 0.7);

    let skinPixels = 0;
    let totalPixels = 0;
    let skinWeightedX = 0;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * 160 + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];

        // Skin tone detection (RGB-based heuristic — works across skin tones)
        const isSkin = r > 60 && g > 40 && b > 20 &&
          r > g && r > b &&
          (r - g) > 10 &&
          Math.abs(r - g) < 150 &&
          (r + g + b) > 150 &&
          (r + g + b) < 700;

        totalPixels++;
        if (isSkin) {
          skinPixels++;
          skinWeightedX += x;
        }
      }
    }

    const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;

    // No face: very few skin pixels
    if (skinRatio < 0.04) return 'no_face';

    // Gaze estimation: if the center of skin mass is heavily offset, student is looking away
    if (skinPixels > 0) {
      const avgX = skinWeightedX / skinPixels;
      const centerX = 80; // half of 160
      const offset = Math.abs(avgX - centerX) / 80; // normalized 0-1
      if (offset > 0.45) return 'looking_away';
    }

    return 'ok';
  }, []);

  // ── Main monitoring loop ────────────────────────────────────
  useEffect(() => {
    if (!enabled || !hasMedia || !stream) return;

    let frameId;
    let noFaceCount = 0;
    let lookAwayCount = 0;
    let highAudioCount = 0;
    const FACE_THRESHOLD = 5;   // 5 consecutive bad frames ≈ 2.5s
    const AUDIO_THRESHOLD = 8;  // 8 consecutive loud frames ≈ 4s

    const loop = () => {
      // ── Face analysis ──
      const status = analyzeFace();
      setFaceStatus(status);

      if (status === 'no_face') {
        noFaceCount++;
        lookAwayCount = 0;
        if (noFaceCount >= FACE_THRESHOLD) {
          const now = Date.now();
          if (now - lastViolationRef.current.face > 10000) { // cooldown 10s
            onViolation('FACE_NOT_DETECTED', 'HIGH');
            setCameraScore(s => Math.max(0, s - 5));
            lastViolationRef.current.face = now;
          }
          noFaceCount = 0;
        }
      } else if (status === 'looking_away') {
        lookAwayCount++;
        noFaceCount = 0;
        if (lookAwayCount >= FACE_THRESHOLD) {
          const now = Date.now();
          if (now - lastViolationRef.current.face > 10000) {
            onViolation('GAZE_AWAY', 'MEDIUM');
            setCameraScore(s => Math.max(0, s - 3));
            lastViolationRef.current.face = now;
          }
          lookAwayCount = 0;
        }
      } else {
        noFaceCount = Math.max(0, noFaceCount - 1);
        lookAwayCount = Math.max(0, lookAwayCount - 1);
      }

      // ── Audio analysis ──
      if (analyserRef.current) {
        const bufLen = analyserRef.current.frequencyBinCount;
        const dataArr = new Uint8Array(bufLen);
        analyserRef.current.getByteFrequencyData(dataArr);

        let sum = 0;
        for (let i = 0; i < bufLen; i++) sum += dataArr[i];
        const avg = sum / bufLen;
        const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalizedLevel);

        if (avg > 70) { // loud ambient noise
          highAudioCount++;
          if (highAudioCount >= AUDIO_THRESHOLD) {
            const now = Date.now();
            if (now - lastViolationRef.current.audio > 15000) { // cooldown 15s
              onViolation('LOUD_AUDIO_DETECTED', 'MEDIUM');
              setAudioScore(s => Math.max(0, s - 4));
              lastViolationRef.current.audio = now;
            }
            highAudioCount = 0;
          }
        } else {
          highAudioCount = Math.max(0, highAudioCount - 1);
        }
      }

      frameId = setTimeout(loop, 500); // analyze every 500ms
    };

    loop();
    return () => clearTimeout(frameId);
  }, [enabled, hasMedia, stream, analyzeFace, onViolation]);

  if (!hasMedia || !enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col items-end gap-2">
      {/* Camera Preview */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#001D39] bg-black"
           style={{ width: 180, height: 135 }}>
        <video ref={videoRef} muted playsInline autoPlay
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} className="hidden" />

        {/* Face status indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${
            faceStatus === 'ok' ? 'bg-green-400 animate-pulse' :
            faceStatus === 'looking_away' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-500 animate-ping'
          }`} />
          <span className="text-white text-[9px] font-black uppercase tracking-wider drop-shadow-lg">
            {faceStatus === 'ok' ? 'FACE OK' :
             faceStatus === 'looking_away' ? 'LOOK AT SCREEN' :
             'NO FACE'}
          </span>
        </div>

        {/* Camera score */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5">
          <span className={`text-[10px] font-black tabular-nums ${cameraScore > 70 ? 'text-green-400' : cameraScore > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            CAM {cameraScore}
          </span>
        </div>

        {/* PROCTORED label */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#4E8EA2]">PROCTORED</span>
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
      </div>

      {/* Audio level bar */}
      <div className="bg-[#001D39] rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg border border-[#4E8EA2]/30"
           style={{ width: 180 }}>
        <svg className="w-3.5 h-3.5 text-[#4E8EA2] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <div className="flex-1 h-1.5 bg-[#0A4174] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              audioLevel > 60 ? 'bg-red-500' : audioLevel > 35 ? 'bg-yellow-400' : 'bg-green-400'
            }`}
            style={{ width: `${audioLevel}%` }}
          />
        </div>
        <span className={`text-[9px] font-black tabular-nums ${audioScore > 70 ? 'text-green-400' : audioScore > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
          MIC {audioScore}
        </span>
      </div>
    </div>
  );
}
