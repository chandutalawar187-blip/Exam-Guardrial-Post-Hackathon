// dashboard/src/components/LauncherComponent.jsx

import { useState } from 'react';

// ── EXTENSION ID ──────────────────────────────────────────────
// The ID of the ExamGuardrail Sentinel extension loaded from
// C:\Exam-guardrial-middleware\browser-extension (unpacked).
// Find it at chrome://extensions/ with Developer mode ON.
const EXTENSION_ID = 'kciolgkhjpgoffpdpbannjfmjgepkbdi';

export default function LauncherComponent() {
  const [inputUrl,          setInputUrl]          = useState('');
  const [errorType,         setErrorType]         = useState(null);   // null | 'not_found' | 'timeout' | 'invalid_url'
  const [isLoading,         setIsLoading]         = useState(false);
  const [isLaunched,        setIsLaunched]        = useState(false);
  const [showRedirectNotice, setShowRedirectNotice] = useState(false);

  // ── URL VALIDATION ────────────────────────────────────────
  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ── LAUNCH HANDLER ────────────────────────────────────────
  function handleLaunch() {
    // Reset all state
    setErrorType(null);
    setIsLaunched(false);
    setShowRedirectNotice(false);

    // Validate URL
    const trimmed = inputUrl.trim();
    if (!trimmed || !isValidUrl(trimmed)) {
      setErrorType('invalid_url');
      return;
    }

    // FIX RC1 UX: Inform student that forms.gle redirects to docs.google.com — expected behaviour
    if (trimmed.includes('forms.gle')) {
      setShowRedirectNotice(true);
    }

    // Check chrome.runtime is available
    if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage) {
      setErrorType('not_found');
      return;
    }

    setIsLoading(true);

    // 5-second timeout in case extension doesn't respond
    const timer = setTimeout(() => {
      setIsLoading(false);
      setErrorType('timeout');
    }, 5000);

    // Send LAUNCH_EXAM to extension via external messaging
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: 'LAUNCH_EXAM', url: trimmed },
      (response) => {
        clearTimeout(timer);
        setIsLoading(false);

        if (chrome.runtime.lastError) {
          setErrorType('not_found');
          return;
        }

        if (response?.success) {
          setIsLaunched(true);
        } else {
          setErrorType('not_found');
        }
      }
    );
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🛡️</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ExamGuardrail Launcher
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Enter the exam URL below. It will open in a secure, proctored fullscreen window.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl space-y-4">

          {/* ── SUCCESS BANNER ── */}
          {isLaunched && (
            <div className="p-4 bg-green-950 border border-green-700 rounded-lg flex items-start gap-3">
              <span className="text-green-400 text-xl mt-0.5">✅</span>
              <div>
                <p className="text-green-300 font-semibold text-sm">
                  Exam launched in protected fullscreen window
                </p>
                <p className="text-green-400 text-xs mt-1 opacity-80">
                  Sentinel is now active. All activity is being monitored and recorded.
                </p>
              </div>
            </div>
          )}

          {/* ── REDIRECT NOTICE (forms.gle) ── */}
          {showRedirectNotice && !isLaunched && (
            <div className="p-3 bg-blue-950 border border-blue-700 rounded-lg flex items-start gap-3">
              <span className="text-blue-400 text-base mt-0.5">ℹ️</span>
              <p className="text-blue-300 text-xs">
                <span className="font-semibold">Short URL detected.</span> The exam will open on{' '}
                <span className="font-mono">docs.google.com</span> — this is expected and not a violation.
              </p>
            </div>
          )}

          {/* ── NOT FOUND ERROR ── */}
          {errorType === 'not_found' && (
            <div className="p-4 bg-red-950 border border-red-700 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-xl mt-0.5">⚠️</span>
                <div>
                  <p className="text-red-300 font-semibold text-sm">
                    Sentinel Client not found
                  </p>
                  <p className="text-red-400 text-xs mt-1 opacity-80">
                    Please install the Chrome Extension or reload it from chrome://extensions
                  </p>
                  <a
                    href="chrome://extensions/"
                    className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText('chrome://extensions/'); alert('URL copied! Paste it in your address bar.'); }}
                  >
                    🧩 Open chrome://extensions/
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── TIMEOUT ERROR ── */}
          {errorType === 'timeout' && (
            <div className="p-4 bg-amber-950 border border-amber-700 rounded-lg flex items-start gap-3">
              <span className="text-amber-400 text-xl mt-0.5">⏱️</span>
              <div>
                <p className="text-amber-300 font-semibold text-sm">
                  Extension did not respond
                </p>
                <p className="text-amber-400 text-xs mt-1 opacity-80">
                  Try reloading the extension from chrome://extensions and refreshing this page.
                </p>
              </div>
            </div>
          )}

          {/* ── URL INPUT ── */}
          <div>
            <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              Exam URL
            </label>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
              placeholder="https://docs.google.com/forms/... or https://forms.gle/..."
              disabled={isLoading || isLaunched}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-colors font-mono"
            />
            {/* Inline invalid URL message */}
            {errorType === 'invalid_url' && (
              <p className="text-red-400 text-xs mt-1 ml-1">
                ❌ Please enter a valid exam URL (must start with http:// or https://)
              </p>
            )}
          </div>

          {/* ── LAUNCH BUTTON ── */}
          <button
            onClick={handleLaunch}
            disabled={isLoading || isLaunched}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold text-sm rounded-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Launching…
              </span>
            ) : isLaunched ? (
              '✅ Exam Running'
            ) : (
              '▶ Start Exam'
            )}
          </button>

          <p className="text-gray-600 text-xs text-center">
            The exam will open in a fullscreen, proctored browser window.
          </p>
        </div>

        <p className="text-gray-700 text-xs text-center mt-6">
          ExamGuardrail Sentinel v2.2 — Secure Launcher Middleware
        </p>
      </div>
    </div>
  );
}
