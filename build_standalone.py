import base64
import io
import os
from PIL import Image

BASE_DIR = "/usr/local/google/home/imasa/.gemini/jetski/brain/eb1ea50e-a996-4a13-abf2-7e4b2f84571f/scratch/agi-economics-lab"
IMG_DIR = os.path.join(BASE_DIR, "static/images")

def get_data_uri(filename):
    path = os.path.join(IMG_DIR, filename)
    img = Image.open(path).convert("RGB")
    # Resize portraits to 240x240, editorial plates to max width 880
    if filename in ("hero_etching.jpg", "dual_engine_science.jpg", "economics_of_intelligence.jpg"):
        w, h = img.size
        if w > 880:
            new_h = int(h * (880 / w))
            img = img.resize((880, new_h), Image.Resampling.LANCZOS)
        quality = 80
    else:
        img = img.resize((240, 240), Image.Resampling.LANCZOS)
        quality = 82
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"

def main():
    with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()
    with open(os.path.join(BASE_DIR, "static/css/styles.css"), "r", encoding="utf-8") as f:
        css = f.read()
    with open(os.path.join(BASE_DIR, "static/js/data.js"), "r", encoding="utf-8") as f:
        data_js = f.read()
    with open(os.path.join(BASE_DIR, "static/js/app.js"), "r", encoding="utf-8") as f:
        app_js = f.read()

    # Replace all static/images/*.jpg references with embedded base64 data URIs
    for fname in sorted(os.listdir(IMG_DIR)):
        if fname.endswith(".jpg"):
            rel_path = f"static/images/{fname}"
            uri = get_data_uri(fname)
            html = html.replace(rel_path, uri)
            data_js = data_js.replace(rel_path, uri)

    # Inline CSS and JS
    html = html.replace(
        '<link rel="stylesheet" href="static/css/styles.css" />',
        f"<style>\n{css}\n</style>"
    )
    html = html.replace(
        '<script src="static/js/data.js"></script>\n  <script src="static/js/app.js"></script>',
        f"<script>\n{data_js}\n</script>\n<script>\n{app_js}\n</script>"
    )

    os.makedirs(os.path.join(BASE_DIR, "dist"), exist_ok=True)
    out_paths = [
        os.path.join(BASE_DIR, "dist/index.html"),
        "/google/data/rw/users/im/imasa/agi-economics/index.html",
        "/google/data/rw/users/im/imasa/www/agi-economics/index.html",
        "/google/data/rw/users/im/imasa/agi-economics.html",
        "/google/data/rw/users/im/imasa/www/agi-economics.html",
    ]
    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(html)
        os.chmod(p, 0o644)
        print(f"Wrote {p} ({len(html)} bytes)")

if __name__ == "__main__":
    main()
