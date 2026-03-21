from PIL import Image
import os

# Paths
source_img = r"C:\Users\chand\.gemini\antigravity\brain\2be12d7f-53b7-4206-87ea-f730ff7ec12f\exam_guardrail_3d_alive_icon_1774076262672.png"
target_dir = r"c:\Users\chand\Desktop\POST-HACKATHON\agent_app"
png_path = os.path.join(target_dir, "icon.png")
ico_path = os.path.join(target_dir, "icon.ico")

# Load and process
img = Image.open(source_img)

# Save as PNG
img.save(png_path)
print(f"Saved PNG to {png_path}")

# Save as ICO (multiple sizes for better display)
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(ico_path, format="ICO", sizes=icon_sizes)
print(f"Saved ICO to {ico_path}")
