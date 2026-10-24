# LEEWAY HEADER — DO NOT REMOVE
# REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
# TAG: LEEWAY.STDLIB_OFFLINE_PDF_TEXT_RENDERER_V1
# WHO: LeeWay Industries, creator-authorized.
# WHAT: Bounded, self-contained PDF 1.4 plain-text document output.
# WHEN: 2026-10-24; WHERE: apps/desktop/pdf-renderer.py.
# WHY: Avoid nonportable optional dependencies or paid external PDF services.
# HOW: Escaped WinAnsi PDF strings, multi-page text, correct xref/trailer offsets.
# AUTHORITY: HOST_LOCAL_RENDER_ONLY; production Bridge admission required upstream.
# LICENSE: MIT
import json
import sys
import textwrap

PAGE_WIDTH=612
PAGE_HEIGHT=792
TOP=738
MARGIN=52
LINE_HEIGHT=14
LINES_PER_PAGE=46
MAX_PAGES=80

def pdf_text(value):
    out=bytearray()
    for b in value.encode('cp1252',errors='replace'):
        if b in (40,41,92): out+=b'\\'+bytes([b])
        elif b<32 or b>=127: out+=('\\%03o'%b).encode('ascii')
        else: out.append(b)
    return b'('+bytes(out)+b')'

def make_stream(title,lines,page_number,total_pages):
    parts=[b'BT',
        b'/F1 13 Tf',
        b'1 0 0 1 52 765 Tm',
        pdf_text(title)+b' Tj',
        b'/F1 10 Tf',
        b'1 0 0 1 52 738 Tm']
    for index,line in enumerate(lines):
        if index>0:parts.append(b'0 -14 Td')
        parts.append(pdf_text(line)+b' Tj')
    parts.extend([b'/F1 9 Tf',
        b'1 0 0 1 520 32 Tm',
        pdf_text('Page %d / %d'%(page_number,total_pages))+b' Tj',b'ET'])
    return b'\n'.join(parts)+b'\n'

def pdf_bytes(title,text):
    wrapped=[]
    for row in text.replace('\r\n','\n').replace('\r','\n').split('\n'):
        if not row:
            wrapped.append('')
            continue
        # Fixed-width text layout is a deliberately limited renderer.
        for subline in textwrap.wrap(row,width=90,break_long_words=True,
            break_on_hyphens=False,replace_whitespace=False,drop_whitespace=False):
            wrapped.append(subline)
    pages=[wrapped[i:i+LINES_PER_PAGE] for i in range(0,len(wrapped),LINES_PER_PAGE)]
    if not pages:pages=[[]]
    if len(pages)>MAX_PAGES:raise ValueError('PDF_PAGE_LIMIT')
    count=len(pages)
    objects=[]
    objects.append(b'<< /Type /Catalog /Pages 2 0 R >>')
    kids=b' '.join(('%d 0 R'%(4+i*2)).encode('ascii') for i in range(count))
    objects.append(b'<< /Type /Pages /Kids ['+kids+b'] /Count '+str(count).encode('ascii')+b' >>')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    for i,lines in enumerate(pages):
        page_id=4+2*i
        content_id=5+2*i
        objects.append((
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
            b'/Resources << /Font << /F1 3 0 R >> >> '
            b'/Contents '+str(content_id).encode('ascii')+b' 0 R >>'
        ))
        stream=make_stream(title,lines,i+1,count)
        objects.append(b'<< /Length '+str(len(stream)).encode('ascii')+b' >>\nstream\n'+
            stream+b'endstream')
    result=bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets=[0]
    for i,contents in enumerate(objects,1):
        offsets.append(len(result))
        result+=('%d 0 obj\n'%i).encode('ascii')+contents+b'\nendobj\n'
    xref=len(result)
    result+=('xref\n0 %d\n'%(len(objects)+1)).encode('ascii')
    result+=b'0000000000 65535 f \n'
    for off in offsets[1:]:
        result+=('%010d 00000 n \n'%off).encode('ascii')
    result+=(b'trailer\n<< /Size '+str(len(objects)+1).encode('ascii')+
      b' /Root 1 0 R >>\nstartxref\n'+str(xref).encode('ascii')+b'\n%%EOF\n')
    return bytes(result)

def main():
    raw=sys.stdin.buffer.read(70001)
    if len(raw)>70000: raise ValueError('PDF_INPUT_TOO_LARGE')
    payload=json.loads(raw.decode('utf-8'))
    if not isinstance(payload,dict) or set(payload)!={'title','text'}:
        raise ValueError('PDF_INVALID_INPUT')
    title,text=payload['title'],payload['text']
    if not isinstance(title,str) or not isinstance(text,str):
        raise ValueError('PDF_INVALID_INPUT')
    if len(title)>200 or len(text)>32768 or not text or '\x00' in text or '\x00' in title:
        raise ValueError('PDF_INVALID_INPUT')
    output=pdf_bytes(title or 'LeeWay Document',text)
    if not output.startswith(b'%PDF-') or not output.endswith(b'%%EOF\n') or len(output)>4*1024*1024:
        raise ValueError('PDF_INVALID_OUTPUT')
    sys.stdout.buffer.write(output)

if __name__=='__main__':
    try:main()
    except Exception as exc:
        sys.stderr.write(str(exc)[:180]+'\n')
        sys.exit(2)
