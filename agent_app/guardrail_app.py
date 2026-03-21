import asyncio
import sys
import os
import threading
import platform
import datetime
import logging
import tkinter as tk
from tkinter import font as tkfont, messagebox
import random
import string
import time
import webbrowser
import httpx
import psutil

__version__ = "1.5.6"

# ── PATH SETUP ──────────────────────────────────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)
for _p in [_here, _root]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── LOGGING ─────────────────────────────────────────────────────────────────
_IS_WINDOWED = sys.stdout is None
_log_file = os.path.join(os.path.expanduser("~"), "ExamGuardrailAgent.log")
_handlers = [logging.FileHandler(_log_file, encoding="utf-8")]
if not _IS_WINDOWED:
    _handlers.append(logging.StreamHandler())
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S", handlers=_handlers)
log = logging.getLogger("guardrail_app")

# ── IMPORTS ─────────────────────────────────────────────────────────────────
# No additional try/except needed, dependencies now managed in requirements.
SCANNERS_OK = True
try:
    from exam_guardrail.services.scanners.ai_agent_detector import scan_ai_agents, scan_ai_network_connections, scan_hidden_windows
    from exam_guardrail.services.scanners.screen_share_detector import scan_screen_sharing
    from exam_guardrail.services.scanners.process_blocker import scan_and_block
    from exam_guardrail.services.scanners.extension_detector import scan_extensions, restore_extensions
except Exception as e:
    import traceback
    logging.error(f"SCANNER IMPORT FAILED: {str(e)}")
    logging.error(traceback.format_exc())
    SCANNERS_OK = False

DEFAULT_API_URL = "https://exam-guardrial-post-hackathon.vercel.app"

# ── COLORS & THEME (Sōl Haus Aesthetic) ──────────────────────────────────────
C = {
    "bg":        "#F5F3EF", # Warm Off-White / Beige
    "surface":   "#FFFFFF", # Pure White
    "card":      "#FFFFFF",
    "accent":    "#2D2D2D", # Dark Charcoal
    "accent2":   "#1A1A1A", 
    "text":      "#1A1A1A", # Graphite
    "text_dim":  "#6B6661", # Muted Stone
    "green":     "#28a745", # Success Green
    "amber":     "#ffc107", # Warning Yellow
    "red":       "#A52A2A", # Deep Muted Clay
    "white":     "#FFFFFF",
    "border":    "#D1CDC7", # Light Sand / Stone
}

# ── ICON HELPER ─────────────────────────────────────────────────────────────
def set_window_icon(window):
    """Set the window icon for any tk window or toplevel."""
    ico_path = os.path.join(_here, "icon.ico")
    png_path = os.path.join(_here, "icon.png")
    try:
        if platform.system() == "Windows" and os.path.exists(ico_path):
            window.iconbitmap(ico_path)
        if os.path.exists(png_path):
            # PhotoImage keeps a reference internally or via instance attribute
            window._icon_img = tk.PhotoImage(file=png_path)
            window.iconphoto(True, window._icon_img)
    except Exception as e:
        log.warning(f"Failed to set icon for {window}: {e}")

# ── AGENT LOGIC ─────────────────────────────────────────────────────────────
class AgentCore:
    def __init__(self, session_id, api_url, block=True, student_name='', admin_email='', exam_url='', on_status=None, on_finding=None, on_heartbeat=None):
        self.session_id = session_id
        self.api_base = api_url.rstrip("/")
        self.block = block
        self.student_name = student_name
        self.admin_email = admin_email
        self.exam_url = exam_url
        self.on_status = on_status or (lambda s: None)
        self.on_finding = on_finding or (lambda f: None)
        self.on_heartbeat = on_heartbeat or (lambda ok: None)
        self._running = False
        self.stats = {"scans": 0, "findings": 0, "blocked": 0, "heartbeats": 0}

    async def run(self):
        self._running = True
        self.on_status("running")

        # AUTO-LAUNCH BROWSER: If exam_url is provided, open it now that monitoring is active
        if self.exam_url and self.exam_url.startswith('http'):
            try: webbrowser.open(self.exam_url)
            except: pass

        async with httpx.AsyncClient(timeout=10.0) as client:
            await self._heartbeat(client)
            counter = 0
            while self._running:
                await asyncio.sleep(2.5)
                await self._heartbeat(client)
                counter += 2.5
                if counter >= 5.0:
                    counter = 0
                    await self._scan(client)
        self.on_status("stopped")
        await self._send_report()

    async def _send_report(self):
        """Trigger an email report from the backend."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(f"{self.api_base}/api/native-agent/send-report", json={
                    "session_id": self.session_id,
                    "admin_email": self.admin_email,
                })
        except: pass

    async def _heartbeat(self, client):
        try:
            r = await client.post(f"{self.api_base}/api/native-agent/heartbeat", json={
                "session_id": self.session_id,
                "student_name": self.student_name,
                "admin_email": self.admin_email,
                "platform": f"{platform.system()} {platform.release()}",
                "exam_url": self.exam_url,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "stats": self.stats,
            })
            ok = r.status_code == 200
            self.stats["heartbeats"] += 1
            self.on_heartbeat(ok)
        except Exception as e:
            self.on_heartbeat(False)

    async def _scan(self, client):
        if not SCANNERS_OK:
            return
        findings = []
        for fn in (scan_hidden_windows, scan_ai_network_connections, scan_ai_agents, scan_screen_sharing):
            try: findings.extend(fn())
            except: pass
        try: findings.extend(scan_extensions(block=self.block))
        except: pass
        if self.block:
            try:
                bl = scan_and_block()
                self.stats["blocked"] += sum(1 for b in bl if b.get("blocked"))
                findings.extend(bl)
            except: pass
        self.stats["scans"] += 1
        self.stats["findings"] += len(findings)
        for f in findings:
            self.on_finding(f)
            try:
                await client.post(f"{self.api_base}/api/native-agent/event", json={
                    "session_id": self.session_id,
                    "event_type": f.get("event_type", "UNKNOWN"),
                    "severity": f.get("severity", "medium"),
                    "layer": f.get("layer", "L4"),
                    "score_delta": f.get("score_delta", -10),
                    "metadata": f.get("metadata", {}),
                    "platform": f"{platform.system()} {platform.release()}",
                })
            except: pass

    def stop(self):
        self._running = False


# ── UI COMPONENTS ────────────────────────────────────────────────────────────
class ScrollableFrame(tk.Frame):
    """A professional scrollable container for fluid layouts."""
    def __init__(self, parent, bg=C["bg"], **kwargs):
        super().__init__(parent, bg=bg, **kwargs)
        self.canvas = tk.Canvas(self, bg=bg, highlightthickness=0, borderwidth=0)
        self.scrollbar = tk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.scrollable_content = tk.Frame(self.canvas, bg=bg)

        self.scrollable_content.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        self.canvas_window = self.canvas.create_window((0, 0), window=self.scrollable_content, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)

        self.canvas.bind("<Configure>", self._on_canvas_configure)
        
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        # Mouse wheel support
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)

    def _on_canvas_configure(self, event):
        # Update width of scrollable_content to match canvas width
        self.canvas.itemconfig(self.canvas_window, width=event.width)

    def _on_mousewheel(self, event):
        self.canvas.yview_scroll(int(-1*(event.delta/120)), "units")


# ── WIZARD WINDOW ────────────────────────────────────────────────────────────
class InstallWizard(tk.Toplevel):
    def __init__(self, parent, on_complete):
        super().__init__(parent)
        self.on_complete = on_complete
        self.title("ExamGuardrail Setup")
        self.geometry("600x650")
        self.resizable(True, True) 
        self.configure(bg=C["bg"])
        self.protocol("WM_DELETE_WINDOW", self._on_cancel)
        
        # UI state handles
        self._scroll = None
        self._content = None
        self._btn_back = None
        self._btn_next = None
        self._step = 0
        self._update_btn = None
        
        self._center()
        set_window_icon(self)
        self._session_var = tk.StringVar()
        self._url_var = tk.StringVar()
        self._api_var = tk.StringVar(value=DEFAULT_API_URL)
        self._student_name_var = tk.StringVar()
        self._admin_email_var = tk.StringVar()
        self._block_var = tk.BooleanVar(value=True)
        self._build()
        self._show_step(0)

    def _center(self):
        self.update_idletasks()
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        x, y = (sw - 600) // 2, (sh - 650) // 2
        self.geometry(f"600x650+{x}+{y}")

    def _on_cancel(self):
        self.destroy()
        sys.exit(0)

    def _build(self):
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # ── HEADER (Editorial Style) ─────────────────────────────────────────
        hdr = tk.Frame(self, bg=C["surface"], height=120)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.pack_propagate(False)

        inner_hdr = tk.Frame(hdr, bg=C["surface"])
        inner_hdr.pack(expand=True)

        tk.Label(inner_hdr, text="EXAMGUARDRAIL", font=("Georgia", 24),
                 bg=C["surface"], fg=C["text"]).pack()
        tk.Label(inner_hdr, text="AUTHENTIC SECURITY AGENT [PRODUCTION]", font=("Segoe UI", 8),
                 bg=C["surface"], fg=C["text_dim"]).pack(pady=(2, 0))
        
        self._update_container = tk.Frame(hdr, bg=C["surface"])
        self._update_container.place(relx=1.0, rely=0.0, anchor="ne", x=-20, y=20)
        
        # Thin separator
        sep = tk.Frame(self, bg=C["border"], height=1)
        sep.grid(row=0, column=0, sticky="s", padx=60)

        # ── CONTENT AREA ─────────────────────────────────────────────────────
        self._scroll = ScrollableFrame(self, bg=C["bg"])
        self._scroll.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        self._content = self._scroll.scrollable_content
        self._content.configure(bg=C["bg"])

        # ── FOOTER NAV (Minimalist Outlined) ─────────────────────────────────
        nav = tk.Frame(self, bg=C["bg"], height=80)
        nav.grid(row=3, column=0, sticky="ew")
        nav.pack_propagate(False)

        # We'll use custom styles for buttons in the steps
        self._btn_back = tk.Button(nav, text="BACK", command=self._prev,
                                   font=("Segoe UI", 9), bg=C["bg"], fg=C["text_dim"],
                                   activebackground=C["bg"], activeforeground=C["text"],
                                   relief="flat", bd=0, cursor="hand2", padx=20)
        self._btn_back.pack(side="left", padx=40, pady=12)

        self._btn_next = tk.Button(nav, text="NEXT", command=self._next,
                                   font=("Segoe UI", 9, "bold"), bg=C["accent"], fg=C["white"],
                                   activebackground=C["accent2"], activeforeground=C["white"],
                                   relief="flat", bd=0, cursor="hand2", padx=30)
        self._btn_next.pack(side="right", padx=40, pady=12)


    def _show_step(self, step):
        for w in self._content.winfo_children():
            w.destroy()
        
        self._btn_back.configure(state="normal" if step > 0 else "disabled")
        self._btn_next.configure(text="START MONITORING" if step == 3 else "NEXT")

        if step == 0:   self._step_welcome()
        elif step == 1: self._step_session()
        elif step == 2: self._step_settings()
        elif step == 3: self._step_ready()

    def show_update_btn(self, version, url):
        """Show a prominent update button in the header."""
        if self._update_btn: return
        self._update_btn = tk.Button(self._update_container, text=f"UPDATE v{version} AVAILABLE",
                                     font=("Segoe UI", 7, "bold"), bg=C["accent"], fg="white",
                                     activebackground=C["accent2"], activeforeground="white",
                                     relief="flat", bd=0, padx=10, pady=5, cursor="hand2",
                                     command=lambda: self.master._on_update_click(version, url))
        self._update_btn.pack()

    def _step_welcome(self):
        f = self._content
        # Centered Welcome
        inner = tk.Frame(f, bg=C["bg"])
        inner.pack(pady=40)
        
        tk.Label(inner, text="ESTABLISH INTEGRITY", font=("Georgia", 18),
                 bg=C["bg"], fg=C["text"]).pack(pady=(0, 10))
        
        tk.Label(inner, text="ExamGuardrail monitors your desktop environment to ensure\n"
                              "a fair and transparent testing experience for everyone.",
                 font=("Segoe UI", 10), bg=C["bg"], fg=C["text_dim"], justify="center",
                 wraplength=400).pack(pady=(0, 40))
        
        for label in ["AI detection & process integrity", "Secure screen sharing protocols", 
                      "Real-time environment reporting", "Non-intrusive monitoring"]:
            row = tk.Frame(inner, bg=C["bg"])
            row.pack(fill="x", pady=4)
            tk.Label(row, text="—", font=("Georgia", 10), bg=C["bg"], fg=C["border"]).pack(side="left", padx=(0, 10))
            tk.Label(row, text=label.upper(), font=("Segoe UI", 8), bg=C["bg"],
                     fg=C["text_dim"]).pack(side="left")

    def _step_session(self):
        f = self._content
        inner = tk.Frame(f, bg=C["bg"])
        inner.pack(pady=30, fill="x", padx=40)

        tk.Label(inner, text="AUTHENTICATION", font=("Georgia", 16),
                 bg=C["bg"], fg=C["text"]).pack(anchor="n", pady=(0, 30))
        
        tk.Label(inner, text="SESSION CODE", font=("Segoe UI", 8, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")
        
        # Minimalist Outlined Entry
        entry_frame = tk.Frame(inner, bg=C["border"], pady=1)
        entry_frame.pack(fill="x", pady=(5, 20))
        entry = tk.Entry(entry_frame, textvariable=self._session_var, font=("Segoe UI", 14),
                         bg=C["bg"], fg=C["text"], insertbackground=C["text"],
                         relief="flat", bd=10)
        entry.pack(fill="x")
        entry.focus()

        tk.Label(inner, text="EXAM URL (OPTIONAL)", font=("Segoe UI", 8, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")
        url_frame = tk.Frame(inner, bg=C["border"], pady=1)
        url_frame.pack(fill="x", pady=(5, 5))
        tk.Entry(url_frame, textvariable=self._url_var, font=("Segoe UI", 10),
                 bg=C["bg"], fg=C["text"], insertbackground=C["text"],
                 relief="flat", bd=8).pack(fill="x")
        
        tk.Label(inner, text="e.g. hackerrank.com/your-test", font=("Segoe UI", 8),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")

    def _step_settings(self):
        f = self._content
        inner = tk.Frame(f, bg=C["bg"])
        inner.pack(pady=20, fill="x", padx=40)

        tk.Label(inner, text="CONFIGURATION", font=("Georgia", 16),
                 bg=C["bg"], fg=C["text"]).pack(anchor="n", pady=(0, 20))

        tk.Label(inner, text="YOUR FULL NAME", font=("Segoe UI", 8, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")
        name_frame = tk.Frame(inner, bg=C["border"], pady=1)
        name_frame.pack(fill="x", pady=(5, 15))
        tk.Entry(name_frame, textvariable=self._student_name_var, font=("Segoe UI", 10),
                 bg=C["bg"], fg=C["text"], insertbackground=C["text"],
                 relief="flat", bd=8).pack(fill="x")

        tk.Label(inner, text="ADMIN EMAIL (OPTIONAL)", font=("Segoe UI", 8, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")
        email_frame = tk.Frame(inner, bg=C["border"], pady=1)
        email_frame.pack(fill="x", pady=(5, 15))
        tk.Entry(email_frame, textvariable=self._admin_email_var, font=("Segoe UI", 10),
                 bg=C["bg"], fg=C["text"], insertbackground=C["text"],
                 relief="flat", bd=8).pack(fill="x")

        blk = tk.Frame(inner, bg=C["bg"], pady=10)
        blk.pack(fill="x", pady=(10, 0))
        cb = tk.Checkbutton(blk, variable=self._block_var, bg=C["bg"],
                             activebackground=C["bg"], selectcolor=C["bg"],
                             relief="flat", cursor="hand2")
        cb.pack(side="left")
        tk.Label(blk, text="ENABLE ACTIVE PROTECTION", font=("Segoe UI", 8, "bold"),
                 bg=C["bg"], fg=C["text"]).pack(side="left", padx=5)

    def _step_ready(self):
        f = self._content
        inner = tk.Frame(f, bg=C["bg"])
        inner.pack(pady=30, fill="x", padx=40)

        tk.Label(inner, text="CONFIRMATION", font=("Georgia", 16),
                 bg=C["bg"], fg=C["text"]).pack(anchor="n", pady=(0, 30))

        for label, value in [("IDENTIFIER", self._session_var.get().upper() or "PENDING"),
                               ("PROTECTION", "ACTIVE" if self._block_var.get() else "LOG ONLY"),
                               ("PLATFORM", platform.system().upper())]:
            row = tk.Frame(inner, bg=C["bg"], pady=12)
            row.pack(fill="x")
            # Thin separator
            tk.Frame(inner, bg=C["border"], height=1).pack(fill="x")
            tk.Label(row, text=label, font=("Segoe UI", 8, "bold"), width=15, anchor="w",
                     bg=C["bg"], fg=C["text_dim"]).pack(side="left")
            tk.Label(row, text=value, font=("Segoe UI", 9), anchor="e",
                     bg=C["bg"], fg=C["text"]).pack(side="right", expand=True, fill="x")

    def _next(self):
        if self._step == 1:
            sid = self._session_var.get().strip()
            url = self._url_var.get().strip()
            if not sid and not url:
                messagebox.showwarning("Input Required", "Please enter a Session Code OR an Exam URL.")
                return
            if not sid:
                # Generate ad-hoc ID for link-only mode
                sid = "LIVE-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
                self._session_var.set(sid)

        if self._step == 3:
            self.destroy()
            self.on_complete(self._session_var.get().strip().upper(),
                             self._api_var.get().strip(), 
                             self._block_var.get(),
                             self._student_name_var.get().strip(),
                             self._admin_email_var.get().strip(),
                             self._url_var.get().strip())
            return
        self._step += 1
        self._show_step(self._step)

    def _prev(self):
        self._step -= 1
        self._show_step(self._step)

    def show(self):
        self.transient(self.master)
        self.grab_set()
        self.master.wait_window(self)


# ── MAIN APP WINDOW ─────────────────────────────────────────────────────────
class GuardrailApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("ExamGuardrail Agent")
        self.geometry("680x600")
        self.minsize(580, 500)
        self.resizable(True, True)
        self.configure(bg=C["bg"])
        self._agent = None
        self._loop = None
        self._thread = None
        self._session_id = None
        self._api_url = None
        self._block = True
        self._student_name = ""
        self._admin_email = ""
        self._exam_url = ""
        self._findings = []
        self._heartbeat_ok = True
        
        # UI state handles
        self._subtitle = None
        self._dot = None
        self._dot_frame = None
        self._status_val = None
        self._status_lbl = None
        self._session_lbl = None
        self._heartbeat_lbl = None
        self._stop_btn = None
        self._stat_labels = {}
        self._feed = None
        self._main_scroll = None
        self._scanner_cards = {}
        self._alert_frame = None
        self._alert_count = 0
        self._icon_img = None
        self._wiz_icon = None
        self._wiz = None # Handle to wizard
        
        # Update state
        self._update_banner = None
        self._latest_update = None # {"version": ..., "url": ...}
        self._is_updating = False
        
        # Create AppMutex for Inno Setup to detect running instance
        if platform.system() == "Windows":
            try:
                import ctypes
                # Create mutex to allow installer to detect process
                self._mutex = ctypes.windll.kernel32.CreateMutexW(None, False, "ExamGuardrailAgentMutex")
            except: pass
        
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._build_ui()
        set_window_icon(self)
        self._center()
        
        # Start update check in background
        threading.Thread(target=self._check_updates_sync, daemon=True).start()
        
        # Start wizard after window shown
        self.after(200, self._launch_wizard)

    def _center(self):
        self.update_idletasks()
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        x, y = (sw - 680) // 2, (sh - 600) // 2
        self.geometry(f"680x600+{x}+{y}")

    def _build_ui(self):
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # ── HEADER (Sōl Style) ──────────────────────────────────────────────
        hdr = tk.Frame(self, bg=C["surface"], height=100)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.pack_propagate(False)

        title_f = tk.Frame(hdr, bg=C["surface"])
        title_f.pack(side="left", padx=40, pady=20)
        
        tk.Label(title_f, text="EXAMGUARDRAIL", font=("Georgia", 20),
                 bg=C["surface"], fg=C["text"]).pack(anchor="w")
        self._subtitle = tk.Label(title_f, text="SENTINEL STANDBY", font=("Segoe UI", 8),
                                  bg=C["surface"], fg=C["text_dim"])
        self._subtitle.pack(anchor="w", pady=(2, 0))

        # Status indicator (Minimalist dot)
        self._dot_frame = tk.Frame(hdr, bg=C["surface"])
        self._dot_frame.pack(side="right", padx=40)
        self._dot = tk.Label(self._dot_frame, text="●", font=("Segoe UI", 14),
                              bg=C["surface"], fg=C["border"])
        self._dot.pack(side="left", padx=5)
        self._status_val = tk.Label(self._dot_frame, text="LOGGED OUT", font=("Segoe UI", 8, "bold"),
                                   bg=C["surface"], fg=C["text_dim"])
        self._status_val.pack(side="left")

        # Thin separator
        tk.Frame(self, bg=C["border"], height=1).grid(row=0, column=0, sticky="s", padx=40)

        # ── Scrollable Body
        self._main_scroll = ScrollableFrame(self)
        self._main_scroll.grid(row=1, column=0, rowspan=2, sticky="nsew", padx=10, pady=10)
        body = self._main_scroll.scrollable_content

        # ── STATUS & METRICS
        body_frame = tk.Frame(body, bg=C["bg"], padx=40)
        body_frame.pack(fill="x", pady=30)

        self._status_lbl = tk.Label(body_frame, text="WAITING FOR AUTHORIZATION", font=("Georgia", 14),
                                    bg=C["bg"], fg=C["text_dim"])
        self._status_lbl.pack(pady=(0, 5))
        
        self._session_lbl = tk.Label(body_frame, text="NO ACTIVE SESSION", font=("Segoe UI", 9),
                                     bg=C["bg"], fg=C["text_dim"])
        self._session_lbl.pack()

        # Heartbeat indicator
        self._heartbeat_lbl = tk.Label(body_frame, text="SYSTEM READY", font=("Segoe UI", 7, "bold"),
                                       bg=C["bg"], fg=C["border"])
        self._heartbeat_lbl.pack(pady=(15, 0))

        # ── STATS (Minimalist horizontal row)
        sb = tk.Frame(body, bg=C["bg"])
        sb.pack(fill="x", padx=40, pady=(0, 30))
        
        self._stat_labels = {}
        for key, label in [("scans", "SCANS"), ("findings", "THREATS"),
                            ("blocked", "BLOCKED"), ("heartbeats", "PULSE")]:
            col = tk.Frame(sb, bg=C["bg"])
            col.pack(side="left", expand=True)
            
            vl = tk.Label(col, text="0", font=("Georgia", 18),
                          bg=C["bg"], fg=C["text"])
            vl.pack()
            tk.Label(col, text=label, font=("Segoe UI", 7, "bold"), 
                     bg=C["bg"], fg=C["text_dim"]).pack()
            self._stat_labels[key] = vl

        # ── DETECTION STATUS (Stealth mode - no specific threats shown to student)
        tk.Label(body, text="ENVIRONMENT OPTIMIZATION", font=("Segoe UI", 7, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="n", pady=(0, 10))
        
        det_container = tk.Frame(body, bg=C["bg"], padx=40)
        det_container.pack(fill="both", expand=True)

        # Scanner status cards - simplified and stealthy
        self._scanner_cards = {}
        scanners = [
            ("ai_agents",    "AI Engine Integrity",     "Verifying system environment"),
            ("screen_share", "Secure Output Link",      "Optimizing visual rendering"),
            ("network",      "Remote Connectivity",     "Ensuring stable link integrity"),
            ("processes",    "Resource Management",     "Allocating system resources"),
            ("extensions",   "Module Verification",     "Checking core components"),
        ]
        for key, title, desc in scanners:
            card = tk.Frame(det_container, bg=C["surface"], pady=12, padx=15)
            card.pack(fill="x", pady=3)
            
            top_row = tk.Frame(card, bg=C["surface"])
            top_row.pack(fill="x")
            
            status_dot = tk.Label(top_row, text="○", font=("Segoe UI", 10),
                                  bg=C["surface"], fg=C["border"])
            status_dot.pack(side="left", padx=(0, 8))
            tk.Label(top_row, text=title.upper(), font=("Segoe UI", 9, "bold"),
                     bg=C["surface"], fg=C["text"]).pack(side="left")
            
            status_text = tk.Label(top_row, text="STANDBY", font=("Segoe UI", 7, "bold"),
                                   bg=C["surface"], fg=C["border"])
            status_text.pack(side="right")
            
            desc_lbl = tk.Label(card, text=desc, font=("Segoe UI", 8),
                                bg=C["surface"], fg=C["text_dim"], anchor="w")
            desc_lbl.pack(fill="x", padx=(22, 0), pady=(2, 0))
            
            self._scanner_cards[key] = {"dot": status_dot, "status": status_text, "desc": desc_lbl}

        # Alert frame is hidden in stealth mode
        self._alert_frame = tk.Frame(det_container, bg=C["bg"])
        self._alert_count = 0

        # ── BOTTOM BAR (Quiet Luxury)
        bot = tk.Frame(self, bg=C["surface"], height=60)
        bot.grid(row=3, column=0, sticky="ew")
        bot.pack_propagate(False)

        # Thin top border
        tk.Frame(bot, bg=C["border"], height=1).pack(fill="x")

        self._stop_btn = tk.Button(bot, text="STOP MONITORING", command=self._stop_agent,
                                   font=("Segoe UI", 8, "bold"), bg=C["bg"], fg=C["red"],
                                   activebackground=C["bg"], activeforeground=C["red"],
                                   relief="flat", bd=0, padx=20, cursor="hand2", state="disabled")
        self._stop_btn.pack(side="right", padx=40, pady=20)
        
        tk.Label(bot, text="VERIFIED SECURE ENVIRONMENT", font=("Segoe UI", 7, "bold"), 
                 bg=C["surface"], fg=C["text_dim"]).pack(side="left", padx=40)

    def _check_updates_sync(self):
        """Check GitHub for new releases. Run in thread."""
        try:
            repo = "chandutalawar187-blip/Exam-Guardrial-Post-Hackathon"
            url = f"https://api.github.com/repos/{repo}/releases/latest"
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    latest_tag = data.get("tag_name", "").lstrip('v')
                    if latest_tag and latest_tag != __version__:
                        # Find windows asset
                        for asset in data.get("assets", []):
                            if asset["name"] == "ExamGuardrailSetup.exe":
                                download_url = asset["browser_download_url"]
                                self._latest_update = {"version": latest_tag, "url": download_url}
                                self.after(100, self._apply_update_ui)
                                break
        except Exception as e:
            log.debug(f"Update check failed: {e}")

    def _apply_update_ui(self):
        if not self._latest_update: return
        v, url = self._latest_update["version"], self._latest_update["url"]
        
        # 1. Update wizard if open
        if self._wiz and self._wiz.winfo_exists():
            self._wiz.show_update_btn(v, url)
        
        # 2. Update main app header/banner
        if not self._update_banner:
            log.info(f"Showing update banner in main app: v{v}")
            # Put it in the header for visibility
            self._update_banner = tk.Frame(self, bg=C["accent"], height=30)
            self._update_banner.grid(row=0, column=0, sticky="new") # Overlay on header
            
            tk.Label(self._update_banner, text=f"UPDATE v{v} READY", 
                     font=("Segoe UI", 7, "bold"), bg=C["accent"], fg="white").pack(side="left", padx=20)
            
            btn = tk.Button(self._update_banner, text="INSTALL", font=("Segoe UI", 6, "bold"),
                            bg=C["surface"], fg=C["accent"], activebackground=C["bg"],
                            relief="flat", bd=0, padx=8, pady=1, cursor="hand2",
                            command=lambda: self._on_update_click(v, url))
            btn.pack(side="right", padx=10, pady=4)

    def _on_update_click(self, version, download_url):
        if messagebox.askyesno("ExamGuardrail Update", 
                               f"A new version (v{version}) is available.\n\n"
                               "Would you like to download and install it now?\n"
                               "The app will close and restart automatically."):
            self._start_update_flow(download_url)

    def _start_update_flow(self, download_url):
        self._is_updating = True
        
        # Show a quick confirmation that it's starting
        messagebox.showinfo("Updating", "The update is downloading in the background. "
                            "ExamGuardrail will restart shortly to apply the changes.")

        def do_download():
            try:
                import tempfile
                import subprocess
                
                temp_dir = tempfile.gettempdir()
                dest = os.path.join(temp_dir, "ExamGuardrailSetup_Update.exe")
                
                with httpx.Client(follow_redirects=True, timeout=30.0) as client:
                    resp = client.get(download_url)
                    if resp.status_code == 200:
                        with open(dest, "wb") as f:
                            f.write(resp.content)
                
                # Launch installer - use os.startfile for maximum reliability on Windows (triggers UAC correctly)
                # Note: os.startfile doesn't take arguments easily, but we can use a shortcut or ShellExecute
                log.info(f"Launching update installer: {dest}")
                
                try:
                    import ctypes
                    # Max reliability: No flags, no runas. Let the Windows shell handle it natively.
                    # This ensures it installs to the correct user AppData folder.
                    # The user will see a standard "Next, Next, Finish" wizard, which is 100% reliable.
                    os.startfile(dest)
                except Exception as e:
                    log.error(f"ShellExecute failed: {e}")
                    # Fallback to simple Popen if ShellExecute fails
                    subprocess.Popen([dest, "/SILENT"], creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
                
                # Give a small window for the installer process to spawn before killing the current one
                self.after(500, self._on_close)
            except Exception as e:
                log.error(f"Download failed: {e}")
                self.after(0, lambda: messagebox.showerror("Update Error", f"Failed to download update: {e}"))

        threading.Thread(target=do_download, daemon=True).start()

    def _update_scanner_status(self, scanner_key, status, color=None):
        """Update a detection card. In stealth mode, we hide THREAT details."""
        card = self._scanner_cards.get(scanner_key)
        if not card:
            return
        
        # Mapping for stealth: THREAT -> SCANNING (keep it professional but vague)
        if status == "CLEAR":
            card["dot"].configure(text="●", fg=C["text"])
            card["status"].configure(text="OPTIMIZED", fg=C["text"])
        elif status == "SCANNING":
            card["dot"].configure(text="◉", fg=C["amber"])
            card["status"].configure(text="VERIFYING...", fg=C["amber"])
        elif status == "THREAT":
            # Visually stay in SCANNING mode on the student side
            card["dot"].configure(text="◉", fg=C["amber"])
            card["status"].configure(text="VERIFYING...", fg=C["amber"])
        elif status == "STANDBY":
            card["dot"].configure(text="○", fg=C["border"])
            card["status"].configure(text="STANDBY", fg=C["border"])
    
    def _add_alert(self, severity, event_type, reason):
        """Silent reporting: Alerts are NOT added to the local UI in stealth mode."""
        pass

    def _launch_wizard(self):
        self._wiz = InstallWizard(self, on_complete=self._on_wizard_complete)
        # If we already found an update in the background, show it immediately
        if self._latest_update:
            self._wiz.show_update_btn(self._latest_update["version"], self._latest_update["url"])
        self._wiz.show()
        # Set wizard icon
        ico_path = os.path.join(_here, "icon.ico")
        png_path = os.path.join(_here, "icon.png")
        try:
            if platform.system() == "Windows" and os.path.exists(ico_path):
                self._wiz.iconbitmap(ico_path)
            elif os.path.exists(png_path):
                self._wiz_icon = tk.PhotoImage(file=png_path)
                self._wiz.iconphoto(True, self._wiz_icon)
        except: pass
        self._wiz.show()

    def _on_wizard_complete(self, session_id, api_url, block, student_name, admin_email, exam_url):
        self._session_id = session_id
        self._api_url = api_url
        self._block = block
        self._student_name = student_name
        self._admin_email = admin_email
        self._exam_url = exam_url
        self._subtitle.configure(text=f"Session: {session_id}")
        self._session_lbl.configure(text=f"API: {api_url}")
        self._status_lbl.configure(text="Starting agent...", fg=C["amber"])
        self._dot.configure(fg=C["amber"])
        
        # Resolve the code to find if there is an exam_url attached (if not already provided)
        if not exam_url:
            thread = threading.Thread(target=self._resolve_and_start, args=(session_id, api_url, block, student_name, admin_email))
            thread.daemon = True
            thread.start()
        else:
            self._start_agent(session_id, api_url, block, student_name, admin_email, exam_url)

    def _resolve_and_start(self, session_id, api_url, block, student_name, admin_email):
        """Fetch exam details (like URL) from backend before starting agent."""
        exam_url = ''
        try:
            r = httpx.get(f"{api_url}/api/native-agent/resolve-code/{session_id}")
            if r.status_code == 200:
                data = r.json()
                if data.get('status') == 'ok':
                    exam_url = data.get('exam_url', '')
        except: pass
        
        self.after(0, lambda: self._start_agent(session_id, api_url, block, student_name, admin_email, exam_url))

    def _start_agent(self, session_id, api_url, block, student_name, admin_email, exam_url=''):
        self._agent = AgentCore(session_id, api_url, block, student_name, admin_email, exam_url,
                                on_status=self._on_status,
                                on_finding=self._on_finding,
                                on_heartbeat=self._on_heartbeat)
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        self._stop_btn.configure(state="normal")
        self._update_stats_loop()

    def _run_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._agent.run())

    def _on_status(self, status):
        def _upd():
            if status == "running":
                self._dot.configure(text="●", fg=C["green"])
                self._status_val.configure(text="MONITORING ACTIVE", fg=C["green"])
                self._status_lbl.configure(text="SECURE ENVIRONMENT ACTIVE", fg=C["text"])
                # Activate all scanner cards
                for key in self._scanner_cards:
                    self._update_scanner_status(key, "SCANNING")
            else:
                self._dot.configure(fg=C["text_dim"])
                self._status_val.configure(text="SESSION ENDED", fg=C["text_dim"])
                self._status_lbl.configure(text="AGENT STOPPED", fg=C["text_dim"])
                for key in self._scanner_cards:
                    self._update_scanner_status(key, "STANDBY")
        self.after(0, _upd)

    def _on_heartbeat(self, ok):
        def _upd():
            if ok:
                self._dot.configure(fg=C["green"])
                self._status_val.configure(text="MONITORING ACTIVE", fg=C["green"])
                self._heartbeat_lbl.configure(text="REMOTE LINK ACTIVE", fg=C["text_dim"])
                # After a successful scan cycle, mark scanners as clear
                for key in self._scanner_cards:
                    card = self._scanner_cards[key]
                    if card["status"].cget("text") == "SCANNING...":
                        self._update_scanner_status(key, "CLEAR")
            else:
                self._dot.configure(fg=C["amber"])
                self._status_val.configure(text="CONNECTION WEAK", fg=C["amber"])
                self._heartbeat_lbl.configure(text="CONNECTION INTERRUPTED", fg=C["amber"])
        self.after(0, _upd)

    def _on_finding(self, f):
        def _upd():
            etype = f.get("event_type", "UNKNOWN")
            sev = f.get("severity", "medium").upper()
            reason = f.get("metadata", {}).get("reason", "")
            
            # Map finding to scanner card
            scanner_map = {
                "AI_AGENT": "ai_agents", "AI_NETWORK": "network",
                "HIDDEN_WINDOW": "ai_agents", "SCREEN_SHARE": "screen_share",
                "BLOCKED_PROCESS": "processes", "BROWSER_EXTENSION": "extensions",
            }
            key = scanner_map.get(etype, "processes")
            self._update_scanner_status(key, "THREAT")
            
            # Add user-friendly alert
            self._add_alert(sev, etype, reason)
        self.after(0, _upd)

    def _update_stats_loop(self):
        if self._agent:
            for key, lbl in self._stat_labels.items():
                lbl.configure(text=str(self._agent.stats.get(key, 0)))
        self.after(1000, self._update_stats_loop)

    def _stop_agent(self):
        if self._agent:
            self._agent.stop()
            self._stop_btn.configure(state="disabled")
            self._agent = None
            # Reset UI and re-launch wizard after a brief delay
            self.after(1500, self._reset_and_relaunch)

    def _reset_and_relaunch(self):
        """Reset the UI to its initial state and re-open the setup wizard."""
        self._subtitle.configure(text="SENTINEL STANDBY")
        self._dot.configure(fg=C["border"])
        self._status_val.configure(text="LOGGED OUT", fg=C["text_dim"])
        self._status_lbl.configure(text="WAITING FOR AUTHORIZATION", fg=C["text_dim"])
        self._session_lbl.configure(text="NO ACTIVE SESSION")
        self._heartbeat_lbl.configure(text="SYSTEM READY", fg=C["border"])
        # Reset stats
        for key, lbl in self._stat_labels.items():
            lbl.configure(text="0")
        # Reset scanner cards
        for key in self._scanner_cards:
            self._update_scanner_status(key, "STANDBY")
        # Clear alerts
        for child in self._alert_frame.winfo_children():
            child.destroy()
        self._alert_count = 0
        # Re-open wizard
        self._launch_wizard()

    def _on_close(self):
        if self._agent:
            self._agent.stop()
        self.destroy()

# ── ENTRY POINT ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Suppress tkinter messagebox usage check warning
    import tkinter.messagebox
    app = GuardrailApp()
    app.mainloop()
