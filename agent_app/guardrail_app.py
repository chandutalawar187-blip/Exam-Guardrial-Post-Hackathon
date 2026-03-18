"""
ExamGuardrail Desktop App — Beautiful Tkinter UI
=================================================
A modern, branded desktop interface for the native agent.
Students run this before their exam. It shows live status,
scan results, and sends heartbeats to the backend API.
"""

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
import webbrowser # Added by user instruction
import httpx      # Moved from try/except block by user instruction

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
try:
    import httpx
    HTTPX_OK = True
except ImportError:
    HTTPX_OK = False

try:
    import psutil
    PSUTIL_OK = True
except ImportError:
    PSUTIL_OK = False

try:
    from exam_guardrail.services.scanners.ai_agent_detector import scan_ai_agents, scan_ai_network_connections, scan_hidden_windows
    from exam_guardrail.services.scanners.screen_share_detector import scan_screen_sharing
    from exam_guardrail.services.scanners.process_blocker import scan_and_block
    from exam_guardrail.services.scanners.extension_detector import scan_extensions, restore_extensions
    SCANNERS_OK = True
except ImportError:
    SCANNERS_OK = False

DEFAULT_API_URL = "https://exam-guardrial-post-hackathon.vercel.app"

# ── COLORS & THEME ──────────────────────────────────────────────────────────
C = {
    "bg":        "#001D39",
    "surface":   "#0A2A4A",
    "card":      "#0D3155",
    "accent":    "#4E8EA2",
    "accent2":   "#7BBDE8",
    "text":      "#BDD8E9",
    "text_dim":  "#49769F",
    "green":     "#10B981",
    "amber":     "#F59E0B",
    "red":       "#EF4444",
    "white":     "#FFFFFF",
    "border":    "#1A4060",
}

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
                await asyncio.sleep(5)
                await self._heartbeat(client)
                counter += 5
                if counter >= 10:
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
        self.geometry("540x520")
        self.resizable(True, True) # Now resizable
        self.configure(bg=C["bg"])
        self.protocol("WM_DELETE_WINDOW", self._on_cancel)
        self._center()
        self._step = 0
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
        x, y = (sw - 540) // 2, (sh - 520) // 2
        self.geometry(f"540x520+{x}+{y}")

    def _on_cancel(self):
        self.destroy()
        sys.exit(0)

    def _build(self):
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Header (Fluid)
        hdr = tk.Frame(self, bg=C["surface"], height=90)
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.pack_propagate(False)
        tk.Label(hdr, text="G", font=("Arial", 28, "bold"), bg=C["accent"], fg=C["white"],
                 width=2).pack(side="left", padx=20, pady=18)
        info = tk.Frame(hdr, bg=C["surface"])
        info.pack(side="left", pady=18)
        tk.Label(info, text="ExamGuardrail Agent", font=("Arial", 16, "bold"),
                 bg=C["surface"], fg=C["white"]).pack(anchor="w")
        tk.Label(info, text="Setup Wizard", font=("Arial", 11),
                 bg=C["surface"], fg=C["text_dim"]).pack(anchor="w")

        # Content area (Scrollable)
        self._scroll = ScrollableFrame(self)
        self._scroll.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        self._content = self._scroll.scrollable_content

        # Step indicator
        self._step_bar = tk.Frame(self, bg=C["bg"])
        self._step_bar.grid(row=2, column=0, sticky="ew", padx=30, pady=(0, 10))

        # Footer nav (Fixed/Bottom)
        nav = tk.Frame(self, bg=C["surface"], height=60)
        nav.grid(row=3, column=0, sticky="ew")
        nav.pack_propagate(False)
        self._btn_back = tk.Button(nav, text="← Back", command=self._prev,
                                   font=("Arial", 11), bg=C["card"], fg=C["text_dim"],
                                   relief="flat", padx=20, cursor="hand2")
        self._btn_back.pack(side="left", padx=20, pady=12)
        self._btn_next = tk.Button(nav, text="Next →", command=self._next,
                                   font=("Arial", 11, "bold"), bg=C["accent"], fg=C["white"],
                                   relief="flat", padx=20, cursor="hand2")
        self._btn_next.pack(side="right", padx=20, pady=12)


    def _show_step(self, step):
        for w in self._content.winfo_children():
            w.destroy()
        for w in self._step_bar.winfo_children():
            w.destroy()

        steps = ["Welcome", "Session Code", "Settings", "Ready"]
        for i, s in enumerate(steps):
            dot_color = C["accent"] if i <= step else C["border"]
            tk.Label(self._step_bar, text="●", font=("Arial", 14),
                     bg=C["bg"], fg=dot_color).pack(side="left")
            if i < len(steps) - 1:
                tk.Label(self._step_bar, text="──", font=("Arial", 10),
                         bg=C["bg"], fg=C["border"]).pack(side="left", expand=True, fill="x")

        self._btn_back.configure(state="normal" if step > 0 else "disabled")
        self._btn_next.configure(text="Launch Agent" if step == 3 else "Next →")

        if step == 0:   self._step_welcome()
        elif step == 1: self._step_session()
        elif step == 2: self._step_settings()
        elif step == 3: self._step_ready()

    def _step_welcome(self):
        f = self._content
        tk.Label(f, text="👋  Welcome", font=("Arial", 20, "bold"),
                 bg=C["bg"], fg=C["white"]).pack(anchor="w", pady=(10, 6))
        tk.Label(f, text="ExamGuardrail protects the integrity of your exam by\n"
                          "monitoring your PC for AI tools and cheating software.",
                 font=("Arial", 12), bg=C["bg"], fg=C["text"], justify="left",
                 wraplength=440).pack(anchor="w", pady=(0, 20))
        for icon, label in [("🔍", "Scans for AI agents & screen sharing"), ("🛡️", "Blocks prohibited processes"),
                             ("📡", "Reports findings to your exam portal"), ("✅", "Fully reversible after exam")]:
            row = tk.Frame(f, bg=C["card"], pady=8, padx=12)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=icon, font=("Arial", 14), bg=C["card"]).pack(side="left", padx=6)
            tk.Label(row, text=label, font=("Arial", 11), bg=C["card"],
                     fg=C["text"]).pack(side="left")

    def _step_session(self):
        f = self._content
        tk.Label(f, text="🔑  Session Code", font=("Arial", 18, "bold"),
                 bg=C["bg"], fg=C["white"]).pack(anchor="w", pady=(10, 6))
        tk.Label(f, text="Enter the exam session code from your instructor OR\n"
                          "paste the direct link to your exam (HackerRank, etc.)",
                 font=("Arial", 11), bg=C["bg"], fg=C["text"], justify="left",
                 wraplength=440).pack(anchor="w", pady=(0, 20))
        
        tk.Label(f, text="SESSION CODE", font=("Arial", 9, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")
        entry = tk.Entry(f, textvariable=self._session_var, font=("Courier", 16, "bold"),
                         bg=C["card"], fg=C["accent2"], insertbackground=C["white"],
                         relief="flat", bd=12, width=24)
        entry.pack(fill="x", ipady=6, pady=(4, 12))
        entry.focus()

        tk.Label(f, text="OR PASTE EXAM URL", font=("Arial", 9, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w")
        tk.Entry(f, textvariable=self._url_var, font=("Arial", 10),
                 bg=C["card"], fg=C["text"], insertbackground=C["white"],
                 relief="flat", bd=10).pack(fill="x", ipady=6, pady=4)
        tk.Label(f, text="Example: https://hackerrank.com/test-1", font=("Arial", 9),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", pady=(0, 4))

    def _step_settings(self):
        f = self._content
        tk.Label(f, text="⚙️  Settings", font=("Arial", 18, "bold"),
                 bg=C["bg"], fg=C["white"]).pack(anchor="w", pady=(10, 6))
        tk.Label(f, text="API URL", font=("Arial", 9, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", pady=(10, 2))
        tk.Entry(f, textvariable=self._api_var, font=("Arial", 10),
                 bg=C["card"], fg=C["text"], insertbackground=C["white"],
                 relief="flat", bd=10).pack(fill="x", ipady=6)
        tk.Label(f, text="Leave default unless your instructor specified a different URL.",
                 font=("Arial", 9), bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", pady=4)

        tk.Label(f, text="YOUR FULL NAME", font=("Arial", 9, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", pady=(10, 2))
        tk.Entry(f, textvariable=self._student_name_var, font=("Arial", 10),
                 bg=C["card"], fg=C["text"], insertbackground=C["white"],
                 relief="flat", bd=10).pack(fill="x", ipady=6)

        tk.Label(f, text="ADMIN EMAIL (Optional)", font=("Arial", 9, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", pady=(10, 2))
        tk.Entry(f, textvariable=self._admin_email_var, font=("Arial", 10),
                 bg=C["card"], fg=C["text"], insertbackground=C["white"],
                 relief="flat", bd=10).pack(fill="x", ipady=6)
        tk.Label(f, text="Reports will be sent here if provided.",
                 font=("Arial", 9), bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", pady=4)

        blk = tk.Frame(f, bg=C["card"], pady=12, padx=14)
        blk.pack(fill="x", pady=(16, 0))
        cb = tk.Checkbutton(blk, variable=self._block_var, bg=C["card"],
                             activebackground=C["card"], selectcolor=C["accent"],
                             relief="flat", cursor="hand2")
        cb.pack(side="left")
        inner = tk.Frame(blk, bg=C["card"])
        inner.pack(side="left", padx=6)
        tk.Label(inner, text="Enable Active Blocking (Recommended)", font=("Arial", 11, "bold"),
                 bg=C["card"], fg=C["white"]).pack(anchor="w")
        tk.Label(inner, text="Terminates detected AI tools and blocks cheating extensions.",
                 font=("Arial", 9), bg=C["card"], fg=C["text_dim"]).pack(anchor="w")

    def _step_ready(self):
        f = self._content
        code = self._session_var.get().strip().upper() or "—"
        tk.Label(f, text="🚀  Ready to Launch", font=("Arial", 18, "bold"),
                 bg=C["bg"], fg=C["white"]).pack(anchor="w", pady=(10, 4))
        tk.Label(f, text="Your agent will start monitoring when you click Launch Agent.",
                 font=("Arial", 11), bg=C["bg"], fg=C["text"]).pack(anchor="w", pady=(0, 16))
        for label, value in [("Session Code", code),
                               ("API URL", self._api_var.get()),
                               ("Active Blocking", "ON ✅" if self._block_var.get() else "OFF ⚠️"),
                               ("Platform", f"{platform.system()} {platform.release()}")]:
            row = tk.Frame(f, bg=C["card"], pady=8, padx=14)
            row.pack(fill="x", pady=2)
            tk.Label(row, text=label, font=("Arial", 9, "bold"), width=16, anchor="w",
                     bg=C["card"], fg=C["text_dim"]).pack(side="left")
            tk.Label(row, text=value, font=("Arial", 10), bg=C["card"],
                     fg=C["accent2"]).pack(side="left")

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
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._build_ui()
        self._set_icon()
        self._center()
        # Start wizard after window shown
        self.after(200, self._launch_wizard)

    def _set_icon(self):
        """Set the window icon if available."""
        icon_path = os.path.join(_here, "icon.png")
        if os.path.exists(icon_path):
            try:
                img = tk.PhotoImage(file=icon_path)
                self.iconphoto(True, img)
            except Exception as e:
                logging.warning(f"Failed to set icon: {e}")

    def _center(self):
        self.update_idletasks()
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        x, y = (sw - 680) // 2, (sh - 600) // 2
        self.geometry(f"680x600+{x}+{y}")

    def _build_ui(self):
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # ── Header (Fluid height)
        hdr = tk.Frame(self, bg=C["surface"], pady=15)
        hdr.grid(row=0, column=0, sticky="ew")
        logo_frame = tk.Frame(hdr, bg=C["accent"], width=52, height=52)
        logo_frame.pack(side="left", padx=(20, 14), pady=14)
        logo_frame.pack_propagate(False)
        tk.Label(logo_frame, text="G", font=("Arial", 22, "bold"),
                 bg=C["accent"], fg=C["white"]).place(relx=.5, rely=.5, anchor="center")
        title_f = tk.Frame(hdr, bg=C["surface"])
        title_f.pack(side="left", pady=14)
        tk.Label(title_f, text="ExamGuardrail Agent", font=("Arial", 16, "bold"),
                 bg=C["surface"], fg=C["white"]).pack(anchor="w")
        self._subtitle = tk.Label(title_f, text="Not started", font=("Arial", 10),
                                  bg=C["surface"], fg=C["text_dim"])
        self._subtitle.pack(anchor="w")

        # status dot
        self._dot = tk.Label(hdr, text="●", font=("Arial", 22),
                              bg=C["surface"], fg=C["text_dim"])
        self._dot.pack(side="right", padx=20)

        # ── Scrollable Body
        self._main_scroll = ScrollableFrame(self)
        self._main_scroll.grid(row=1, column=0, rowspan=2, sticky="nsew", padx=10, pady=10)
        body = self._main_scroll.scrollable_content

        # ── Status card
        sc = tk.Frame(body, bg=C["card"], pady=18, padx=20)
        sc.pack(fill="x", padx=10, pady=12)
        # row 1
        r1 = tk.Frame(sc, bg=C["card"])
        r1.pack(fill="x")
        self._status_lbl = tk.Label(r1, text="Waiting for setup...", font=("Arial", 13, "bold"),
                                    bg=C["card"], fg=C["text"])
        self._status_lbl.pack(side="left")
        self._heartbeat_lbl = tk.Label(r1, text="", font=("Arial", 9),
                                       bg=C["card"], fg=C["text_dim"])
        self._heartbeat_lbl.pack(side="right")
        # session info
        self._session_lbl = tk.Label(sc, text="", font=("Courier", 10),
                                     bg=C["card"], fg=C["text_dim"])
        self._session_lbl.pack(anchor="w", pady=(4, 0))

        # ── Stats bar
        sb = tk.Frame(body, bg=C["surface"])
        sb.pack(fill="x", padx=10)
        self._stat_labels = {}
        for key, icon, label in [("scans", "🔍", "Scans"), ("findings", "⚠️", "Threats"),
                                   ("blocked", "🚫", "Blocked"), ("heartbeats", "💓", "Heartbeats")]:
            col = tk.Frame(sb, bg=C["surface"], pady=10)
            col.pack(side="left", expand=True, fill="x")
            tk.Label(col, text=icon, font=("Arial", 14), bg=C["surface"]).pack()
            vl = tk.Label(col, text="0", font=("Arial", 16, "bold"),
                          bg=C["surface"], fg=C["white"])
            vl.pack()
            tk.Label(col, text=label, font=("Arial", 8), bg=C["surface"],
                     fg=C["text_dim"]).pack()
            self._stat_labels[key] = vl

        # ── Findings feed
        tk.Label(body, text="DETECTION LOG", font=("Arial", 8, "bold"),
                 bg=C["bg"], fg=C["text_dim"]).pack(anchor="w", padx=12, pady=(10, 2))
        feed_frame = tk.Frame(body, bg=C["bg"])
        feed_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        scrollbar = tk.Scrollbar(feed_frame, bg=C["border"], troughcolor=C["bg"])
        scrollbar.pack(side="right", fill="y")

        self._feed = tk.Text(feed_frame, bg=C["surface"], fg=C["text"],
                             font=("Courier", 9), relief="flat", wrap="word",
                             yscrollcommand=scrollbar.set, state="disabled",
                             insertbackground=C["white"], padx=10, pady=8)
        self._feed.pack(fill="both", expand=True)
        scrollbar.config(command=self._feed.yview)

        self._feed.tag_configure("ts", foreground=C["text_dim"])
        self._feed.tag_configure("ok", foreground=C["green"])
        self._feed.tag_configure("warn", foreground=C["amber"])
        self._feed.tag_configure("threat", foreground=C["red"])
        self._feed.tag_configure("dim", foreground=C["text_dim"])
        self._append_log("Agent initialized. Waiting for session setup...", "dim")

        # ── Bottom bar (Fixed)
        bot = tk.Frame(self, bg=C["surface"], height=46)
        bot.grid(row=3, column=0, sticky="ew")
        bot.pack_propagate(False)
        self._stop_btn = tk.Button(bot, text="Stop Agent", command=self._stop_agent,
                                   font=("Arial", 10, "bold"), bg=C["red"], fg=C["white"],
                                   relief="flat", padx=16, cursor="hand2", state="disabled")
        self._stop_btn.pack(side="right", padx=14, pady=8)
        tk.Label(bot, text=f"Platform: {platform.system()} {platform.release()}",
                 font=("Arial", 8), bg=C["surface"], fg=C["text_dim"]).pack(side="left", padx=14, pady=12)

    def _append_log(self, msg, tag="ok"):
        self._feed.configure(state="normal")
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        self._feed.insert("end", f"[{ts}] ", "ts")
        self._feed.insert("end", msg + "\n", tag)
        self._feed.see("end")
        self._feed.configure(state="disabled")

    def _launch_wizard(self):
        wiz = InstallWizard(self, self._on_wizard_complete)
        # Attempt to set wizard icon too
        icon_path = os.path.join(_here, "icon.png")
        if os.path.exists(icon_path):
            try:
                img = tk.PhotoImage(file=icon_path)
                wiz.iconphoto(True, img)
            except: pass
        wiz.show()

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
        self._append_log(f"Session code: {session_id}", "ok")
        if student_name:
            self._append_log(f"Student: {student_name}", "ok")
        if exam_url:
            self._append_log(f"Exam Link: {exam_url}", "ok")
        self._append_log(f"API: {api_url}", "dim")
        
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
                    if exam_url:
                        self.after(0, lambda: self._append_log(f"Target Exam: {exam_url}", "ok"))
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
                self._dot.configure(fg=C["green"])
                self._status_lbl.configure(text="🛡️  Agent Running — Monitoring Active", fg=C["green"])
                self._append_log("Agent started. Monitoring active.", "ok")
            else:
                self._dot.configure(fg=C["text_dim"])
                self._status_lbl.configure(text="Agent stopped.", fg=C["text_dim"])
                self._append_log("Agent stopped.", "dim")
        self.after(0, _upd)

    def _on_heartbeat(self, ok):
        def _upd():
            if ok:
                self._heartbeat_lbl.configure(text="💓 Heartbeat OK", fg=C["green"])
            else:
                self._heartbeat_lbl.configure(text="⚠️ Heartbeat Failed", fg=C["amber"])
        self.after(0, _upd)

    def _on_finding(self, f):
        def _upd():
            etype = f.get("event_type", "UNKNOWN")
            sev = f.get("severity", "medium").upper()
            tag = "threat" if sev in ("CRITICAL", "HIGH") else "warn"
            reason = f.get("metadata", {}).get("reason", "")
            self._append_log(f"[{sev}] {etype}  {reason}", tag)
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
