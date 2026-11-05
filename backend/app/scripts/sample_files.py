"""Generate small public-domain sample PDF/EPUB files and cover images for the seed script."""

import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def make_cover(
    path: Path,
    title: str,
    author: str,
    top: tuple,
    bottom: tuple,
    size: tuple[int, int] = (600, 900),
    center_title: bool = False,
) -> None:
    width, height = size
    image = Image.new("RGB", (width, height), top)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / height
        color = tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    draw.ellipse([width - 200, height - 260, width + 120, height + 60], outline=(255, 255, 255, 35), width=2)
    draw.rectangle([48, 48, width - 48, height - 48], outline=(255, 255, 255, 90), width=2)

    bold_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
    ]
    regular_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    font_path = next((item for item in bold_candidates if Path(item).exists()), None)
    small_path = next((item for item in regular_candidates if Path(item).exists()), None)
    try:
        title_font = ImageFont.truetype(font_path, 46)
        author_font = ImageFont.truetype(small_path, 24)
        label_font = ImageFont.truetype(small_path, 18)
    except (OSError, TypeError):
        title_font = author_font = label_font = ImageFont.load_default()

    def centered(text: str, font, y: int) -> None:
        width_text = draw.textlength(text, font=font)
        draw.text(((width - width_text) / 2, y), text, font=font, fill=(255, 255, 255, 225))

    if center_title:
        centered("ENGLISH ARENA", label_font, 64)
    else:
        draw.text((72, 110), "ENGLISH ARENA", font=label_font, fill=(255, 255, 255, 200))
    words = title.split()
    lines, current = [], ""
    for word in words:
        test = f"{current} {word}".strip()
        if len(test) > 18:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    y = height // 2 - (len(lines) * 58) // 2 if center_title else 300
    for line in lines:
        if center_title:
            centered(line, title_font, y)
        else:
            draw.text((72, y), line, font=title_font, fill=(255, 255, 255))
        y += 58
    if center_title:
        centered(author, author_font, height - 110)
    else:
        draw.text((72, height - 150), author, font=author_font, fill=(255, 255, 255, 220))
    image.save(path, format="WEBP", quality=90)


def _escape_pdf(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(path: Path, title: str, pages: list[list[str]]) -> None:
    objects: list[bytes] = []
    page_ids = [3 + i * 2 for i in range(len(pages))]
    font_id = 3 + len(pages) * 2
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode())

    for index, lines in enumerate(pages):
        page_id = page_ids[index]
        content_id = page_id + 1
        objects.append(
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>"
            ).encode()
        )
        commands = ["BT", "/F1 13 Tf", "18 TL", "1 0 0 1 62 780 Tm"]
        first = True
        for line in lines:
            if not first:
                commands.append("T*")
            if line.startswith("# "):
                commands.append("/F1 24 Tf")
                commands.append(f"({_escape_pdf(line[2:])}) Tj")
                commands.append("/F1 13 Tf")
                commands.append("T*")
            else:
                commands.append(f"({_escape_pdf(line)}) Tj")
            first = False
        commands.append("ET")
        commands.append(f"BT /F1 9 Tf 1 0 0 1 62 40 Tm (English Arena  |  {index + 1} / {len(pages)}) Tj ET")
        stream = "\n".join(commands).encode("latin-1", "replace")
        objects.append(
            f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream"
        )

    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    buffer = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, body in enumerate(objects, start=1):
        offsets.append(len(buffer))
        buffer += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_position = len(buffer)
    buffer += f"xref\n0 {len(objects) + 1}\n".encode()
    buffer += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        buffer += f"{offset:010d} 00000 n \n".encode()
    buffer += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_position}\n%%EOF\n"
    ).encode()
    path.write_bytes(buffer)


def make_epub(path: Path, title: str, author: str, chapters: list[tuple[str, list[str]]]) -> None:
    book_id = "urn:uuid:english-arena-sample"
    manifest_items = []
    spine_items = []
    nav_items = []
    for index, (chapter_title, _) in enumerate(chapters, start=1):
        manifest_items.append(
            f'<item id="ch{index}" href="ch{index}.xhtml" media-type="application/xhtml+xml"/>'
        )
        spine_items.append(f'<itemref idref="ch{index}"/>')
        nav_items.append(f'<li><a href="ch{index}.xhtml">{chapter_title}</a></li>')

    container = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""

    opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">{book_id}</dc:identifier>
    <dc:title>{title}</dc:title>
    <dc:creator>{author}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
    {''.join(manifest_items)}
  </manifest>
  <spine>{''.join(spine_items)}</spine>
</package>"""

    nav = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>{title}</title></head>
<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>{''.join(nav_items)}</ol></nav></body>
</html>"""

    style = """body { font-family: Georgia, serif; line-height: 1.7; padding: 8%; color: #1a1a1a; }
h1 { font-size: 2em; margin-bottom: 0.6em; } p { margin: 0 0 1em 0; }"""

    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr("META-INF/container.xml", container, compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr("OEBPS/content.opf", opf, compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr("OEBPS/nav.xhtml", nav, compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr("OEBPS/style.css", style, compress_type=zipfile.ZIP_DEFLATED)
        for index, (chapter_title, paragraphs) in enumerate(chapters, start=1):
            body = "\n".join(f"<p>{_escape_xml(p)}</p>" for p in paragraphs)
            chapter = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>{_escape_xml(chapter_title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h1>{_escape_xml(chapter_title)}</h1>{body}</body></html>"""
            archive.writestr(
                f"OEBPS/ch{index}.xhtml", chapter, compress_type=zipfile.ZIP_DEFLATED
            )


def _escape_xml(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
