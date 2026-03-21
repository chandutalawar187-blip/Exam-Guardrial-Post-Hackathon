import os
import sys
import json
import time
import httpx
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox
import platform

__version__ = "1.6.5"

# ── PATH SETUP ──────────────────────────────────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))

# Support for PyInstaller _MEIPASS
if hasattr(sys, '_MEIPASS'):
    _base_path = sys._MEIPASS
else:
    _base_path = _here

# ── ICON HELPER ─────────────────────────────────────────────────────────────
def set_window_icon(window):
    """Set the window icon for any tk window or toplevel."""
    ico_path = os.path.join(_base_path, "icon.ico")
    png_path = os.path.join(_base_path, "icon.png")
    try:
        if platform.system() == "Windows" and os.path.exists(ico_path):
            window.iconbitmap(ico_path)
        if os.path.exists(png_path):
            window._icon_img = tk.PhotoImage(file=png_path)
            window.iconphoto(True, window._icon_img)
    except:
        pass

# ── SHARED CONSTANTS (Sync with main app) ───────────────────────────────────
C = {
    "bg":        "#F5F3EF",
    "surface":   "#FFFFFF",
    "text":      "#1A1A1A",
    "text_dim":  "#6B6661",
    "green":     "#28a745",
    "border":    "#D1CDC7",
}

# ── LOGIC ───────────────────────────────────────────────────────────────────

class ExamGuardrailUpdater:
    def __init__(self, root, download_url, target_version):
        self.root = root
        self.download_url = download_url
        self.target_version = target_version
        set_window_icon(self.root)
        self.root.title(f"ExamGuardrail Update v{__version__}")
        self.root.geometry("500x400")
        self.root.configure(bg=C["bg"])
        self.root.resizable(False, False)
        
        self.is_cancelled = False
        self._setup_ui()
        
        # Start download thread
        self.thread = threading.Thread(target=self._run_update, daemon=True)
        self.thread.start()

    def _setup_ui(self):
        # Header
        self.header = tk.Label(self.root, text="Downloading updates...", font=("Segoe UI", 11), bg=C["bg"], fg=C["text"])
        self.header.pack(anchor="w", padx=20, pady=(20, 10))
        
        # Progress Bar
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TProgressbar", thickness=20, background=C["green"], bordercolor=C["border"], lightcolor=C["green"], darkcolor=C["green"])
        self.progress = ttk.Progressbar(self.root, length=460, mode='determinate', style="TProgressbar")
        self.progress.pack(padx=20, pady=10)
        
        # Buttons Frame
        btn_frame = tk.Frame(self.root, bg=C["bg"])
        btn_frame.pack(fill="x", padx=20, pady=10)
        
        self.btn_log = tk.Button(btn_frame, text="Hide Log", command=self._toggle_log, relief="flat", bg=C["surface"], fg=C["text"], highlightthickness=1, highlightbackground=C["border"], padx=10)
        self.btn_log.pack(side="left")
        
        self.btn_cancel = tk.Button(btn_frame, text="Cancel", command=self._on_cancel, relief="flat", bg=C["surface"], fg=C["text"], highlightthickness=1, highlightbackground=C["border"], padx=10)
        self.btn_cancel.pack(side="right")
        
        # Log Area
        self.log_visible = True
        self.log_container = tk.Frame(self.root, bg=C["surface"], highlightthickness=1, highlightbackground=C["border"])
        self.log_container.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        self.log_text = tk.Text(self.log_container, bg=C["surface"], fg=C["text"], font=("Consolas", 9), relief="flat", state="disabled")
        self.log_scrollbar = ttk.Scrollbar(self.log_container, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=self.log_scrollbar.set)
        
        self.log_text.pack(side="left", fill="both", expand=True)
        self.log_scrollbar.pack(side="right", fill="y")

    def _add_log(self, text):
        self.log_text.config(state="normal")
        self.log_text.insert("end", f"{text}\n")
        self.log_text.see("end")
        self.log_text.config(state="disabled")

    def _toggle_log(self):
        if self.log_visible:
            self.log_container.pack_forget()
            self.btn_log.config(text="Show Log")
            self.root.geometry("500x150")
        else:
            self.log_container.pack(fill="both", expand=True, padx=20, pady=(0, 20))
            self.btn_log.config(text="Hide Log")
            self.root.geometry("500x400")
        self.log_visible = not self.log_visible

    def _on_cancel(self):
        if messagebox.askyesno("Cancel Update", "Are you sure you want to cancel the update?"):
            self.is_cancelled = True
            self.root.destroy()
            sys.exit(0)

    def _run_update(self):
        try:
            temp_exe = os.path.join(os.environ.get("TEMP", "."), f"ExamGuardrailSetup_{self.target_version}.exe")
            self._add_log(f"Initializing update to v{self.target_version}...")
            self._add_log(f"Downloading from: {self.download_url}")
            
            with httpx.stream("GET", self.download_url, follow_redirects=True) as response:
                total_size = int(response.headers.get("Content-Length", 0))
                downloaded = 0
                
                with open(temp_exe, "wb") as f:
                    for chunk in response.iter_bytes(chunk_size=8192):
                        if self.is_cancelled: break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            self.progress['value'] = percent
                            if downloaded % (8192 * 10) == 0: # Log every few chunks to avoid flooding
                                self._add_log(f"Downloading: {downloaded}/{total_size} bytes ({percent:.1f}%)")
                        self.root.update_idletasks()
            
            if self.is_cancelled: return
            
            self._add_log("Download complete. Launching installer...")
            time.sleep(1) # Visual pause
            
            # Launch installer and exit
            if platform.system() == "Windows":
                # Use standard Windows ShellExecute for native flow
                os.startfile(temp_exe)
            else:
                subprocess.Popen(["xdg-open", temp_exe])
            
            self.root.after(500, self.root.destroy)
            
        except Exception as e:
            self._add_log(f"ERROR: {e}")
            messagebox.showerror("Update Failed", f"An error occurred during update: {e}")

if __name__ == "__main__":
    # Expects [download_url, target_version]
    if len(sys.argv) < 3:
        # For testing
        url = "https://github.com/chandutalawar187-blip/Exam-Guardrial-Post-Hackathon/releases/download/v1.5.6/ExamGuardrailSetup.exe"
        ver = "1.5.6"
    else:
        url = sys.argv[1]
        ver = sys.argv[2]
        
    root = tk.Tk()
    app = ExamGuardrailUpdater(root, url, ver)
    root.mainloop()
