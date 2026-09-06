from pathlib import Path

path = Path("app/globals.css")
if not path.exists():
    raise SystemExit("Could not find app/globals.css. Run this from the Orbit repository root.")

css = path.read_text(encoding="utf-8")

old = '.brand-characters{position:absolute;left:18px;bottom:8px;width:clamp(190px,18vw,270px);max-height:92px;object-fit:contain;pointer-events:none;z-index:1}'
new = '.brand-characters{position:absolute;right:18px;left:auto;bottom:8px;width:clamp(150px,14vw,205px);max-height:82px;object-fit:contain;object-position:right bottom;pointer-events:none;z-index:1}'

if old in css:
    css = css.replace(old, new, 1)
elif 'right:18px;left:auto;bottom:8px' not in css:
    raise SystemExit("Could not locate the current .brand-characters CSS rule.")

# Keep mobile placement on the right too, but slightly smaller.
old_mobile = '.brand-characters{width:175px;max-height:72px}'
new_mobile = '.brand-characters{right:14px;left:auto;width:150px;max-height:66px}'

if old_mobile in css:
    css = css.replace(old_mobile, new_mobile, 1)

path.write_text(css, encoding="utf-8")

print("Login mascot characters moved to the bottom-right of the white panel.")
print("UI only - no database changes.")
