"""Builds the reader page for the rest / cinematics brief: summary, full brief, and interactive questions.
PYTHONPATH=../pylib python3 build_page.py -> descansos.html"""
import html
import json
import re
import markdown

SRC = 'brief_final.md'
OUT = 'descansos.html'
md = open(SRC, encoding='utf-8').read()

# --- cut the two question lists out of the markdown; they become interactive cards
q_start = md.index('## 5. Preguntas para el dueño')
annex_start = md.index('## Anexo: ideas para tu sesión de historia')
h_start = md.index('### A.6 Preguntas para la sesión de historia')
main_q_md = md[q_start:annex_start]
h_q_md = md[h_start:]
body_md = md[:q_start] + md[annex_start:h_start]


def inline(s):
    """minimal inline markdown for question text: **bold**, *italic*, `code`."""
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
    return s


def parse_questions(text, prefix=''):
    qs = []
    cur = None
    for line in text.splitlines():
        m = re.match(r'^(?:- )?\*\*(H?\d+)\.\s*(.+?)\*\*\s*(.*)$', line.strip()) if not line.startswith('   ') else None
        m2 = re.match(r'^(\d+)\.\s+\*\*(.+?)\*\*\s*(.*)$', line)
        if m2:
            cur = {'id': m2.group(1), 'title': m2.group(2).strip(), 'extra': m2.group(3).strip(), 'opts': [], 'notes': []}
            qs.append(cur)
            continue
        if m and m.group(1).startswith('H'):
            cur = {'id': m.group(1), 'title': m.group(2).strip(), 'extra': m.group(3).strip(), 'opts': [], 'notes': []}
            qs.append(cur)
            continue
        mo = re.match(r'^\s+- ([a-d])\)\s+(.+)$', line)
        if mo and cur:
            txt = mo.group(2).strip()
            rec = txt.endswith('★')
            cur['opts'].append({'k': mo.group(1), 'text': txt.rstrip('★').strip(), 'rec': rec})
            continue
        mn = re.match(r'^\s+\*(.+)\*\s*$', line)
        if mn and cur:
            cur['notes'].append(mn.group(1).strip())
    return qs


main_qs = parse_questions(main_q_md)
h_qs = parse_questions(h_q_md)
assert len(main_qs) == 21, len(main_qs)
assert len(h_qs) == 5, len(h_qs)
for q in main_qs + h_qs:
    assert 2 <= len(q['opts']) <= 4, q
    assert sum(o['rec'] for o in q['opts']) == 1, q['id']
h_intro = re.search(r'No hace falta responderlas ahora\..*', h_q_md).group(0)

# --- the brief body
conv = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc', 'sane_lists'], extension_configs={'toc': {'toc_depth': '2-3'}})
body_html = conv.convert(body_md)
body_html = re.sub(r'<table>', '<div class="table-wrap"><table>', body_html)
body_html = body_html.replace('</table>', '</table></div>')
body_html = body_html.replace('<h1', '<h2 class="doc-title"').replace('</h1>', '</h2>')
# drop the document's own title + intro (the page header repeats them)
body_html = re.sub(r'^<h2 class="doc-title".*?</h2>\s*', '', body_html, flags=re.S)
toc = [(t['id'], t['name']) for t in conv.toc_tokens[0]['children']] if conv.toc_tokens and conv.toc_tokens[0]['level'] == 1 else [(t['id'], t['name']) for t in conv.toc_tokens if t['level'] == 2]


def card(q, group):
    opts = []
    for o in q['opts']:
        oid = f"q{q['id']}{o['k']}"
        badge = '<span class="rec">★ recomendada</span>' if o['rec'] else ''
        opts.append(f'''<label class="opt{' is-rec' if o['rec'] else ''}" for="{oid}"><input type="radio" id="{oid}" name="q{q['id']}" value="{o['k']}" data-rec="{1 if o['rec'] else 0}"><span class="key">{o['k']}</span><span class="otext">{inline(o['text'])}{badge}</span></label>''')
    notes = ''.join(f'<p class="qnote">{inline(n)}</p>' for n in q['notes'])
    extra = f' <span class="qextra">{inline(q["extra"])}</span>' if q['extra'] else ''
    return f'''<fieldset class="q" data-q="{q['id']}" data-group="{group}"><legend><span class="qnum">{q['id']}</span><span class="qtitle">{inline(q['title'])}{extra}</span></legend><div class="opts">{''.join(opts)}</div>{notes}</fieldset>'''


main_cards = '\n'.join(card(q, 'main') for q in main_qs)
h_cards = '\n'.join(card(q, 'story') for q in h_qs)
toc_html = ''.join(f'<li><a href="#{i}">{html.escape(n)}</a></li>' for i, n in toc) + '<li><a href="#preguntas">Preguntas</a></li>'

page = open('page_template.html', encoding='utf-8').read()
page = page.replace('{{TOC}}', toc_html).replace('{{BODY}}', body_html).replace('{{MAIN_CARDS}}', main_cards)
page = page.replace('{{H_CARDS}}', h_cards).replace('{{H_INTRO}}', inline(h_intro)).replace('{{NMAIN}}', str(len(main_qs)))
open(OUT, 'w', encoding='utf-8').write(page)
print('ok', len(page), 'bytes;', len(main_qs), 'questions +', len(h_qs), 'story; toc', [n for _, n in toc])
