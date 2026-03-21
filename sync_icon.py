from PIL import Image
import os

# Paths
# The user mentioned icon.png in the root
source_img = r"c:\Users\chand\Desktop\POST-HACKATHON\icon.png"
target_dir = r"c:\Users\chand\Desktop\POST-HACKATHON\agent_app"
png_path = os.path.join(target_dir, "icon.png")
ico_path = os.path.join(target_dir, "icon.ico")

if os.path.exists(source_img):
    img = Image.open(source_img)
    
    # Save as PNG in agent_app
    img.save(png_path)
    print(f"Synced PNG to {png_path}")

    # Save as ICO in agent_app
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(ico_path, format="ICO", sizes=icon_sizes)
    print(f"Synced ICO to {ico_path}")
else:
    print(f"Source {source_img} not found!")
