from PIL import Image
import os

# Source
source_img = r"c:\Users\chand\Desktop\POST-HACKATHON\icon.png"

# Target: Browser Extension Icons
ext_icons_dir = r"c:\Users\chand\Desktop\POST-HACKATHON\browser-extension\icons"
os.makedirs(ext_icons_dir, exist_ok=True)

sizes = [16, 48, 128]
img = Image.open(source_img)

for size in sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    target_path = os.path.join(ext_icons_dir, f"icon_{size}.png")
    resized.save(target_path)
    print(f"Generated Extension Icon: {target_path}")

# Target: Dashboard Favicon (ICO)
public_dir = r"c:\Users\chand\Desktop\POST-HACKATHON\dashboard\public"
favicon_path = os.path.join(public_dir, "favicon.ico")
img.save(favicon_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print(f"Generated Dashboard Favicon: {favicon_path}")
