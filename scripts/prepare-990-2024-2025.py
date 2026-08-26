"""Create the public Form 990 copy; preserve the complete source privately."""
import hashlib
from pathlib import Path
from pypdf import PdfReader, PdfWriter

source = Path('/Users/kj/Downloads/2024-25.990.pdf')
output = Path('/Users/kj/Documents/Codex/2026-08-25/for-my-website-2/outputs/Form-990-FY-2024-2025-public.pdf')
original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
reader = PdfReader(source)
assert len(reader.pages) == 34
writer = PdfWriter()
# Visually verified: source pages 3–32 are Form 990 and Schedules A, D, O, R.
# Exclude Form 8879-TE (contains filing PINs), Form 8868, and Illinois AG990-IL.
for page in reader.pages[2:32]:
    writer.add_page(page)
writer.add_metadata({'/Title': 'Millstadt Ambulance Service Form 990 — FY 2024–2025', '/Subject': 'Public copy: Form 990 and schedules; May 1, 2024 through April 30, 2025'})
with output.open('wb') as destination:
    writer.write(destination)
public_copy = PdfReader(output)
assert len(public_copy.pages) == 30
for original_page, public_page in zip(reader.pages[2:32], public_copy.pages, strict=True):
    assert original_page.get_contents().get_data() == public_page.get_contents().get_data()
    assert [hashlib.sha256(image.data).hexdigest() for image in original_page.images] == [hashlib.sha256(image.data).hexdigest() for image in public_page.images]
assert hashlib.sha256(source.read_bytes()).hexdigest() == original_hash
print(f'Original unchanged: {original_hash}')
print(f'Public copy: 30 pages, all selected page streams and images unchanged, SHA-256 {hashlib.sha256(output.read_bytes()).hexdigest()}')
