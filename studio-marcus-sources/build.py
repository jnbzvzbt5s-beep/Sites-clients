#!/usr/bin/env python3
"""Assemble src/* en un seul index.html autonome."""
import base64, os, re, sys, json

R = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(R, 'src')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, '..', 'index.html')
NB = ' '

def lire(n, defaut=''):
    p = os.path.join(S, n)
    return open(p, encoding='utf-8').read() if os.path.exists(p) else defaut

def typo(t):
    t = t.replace("'", '’')
    t = re.sub(r'« ', '«' + NB, t)
    t = re.sub(r' ([;:!?»])', NB + r'\1', t)
    t = re.sub(r'(\d) €', r'\1' + NB + '€', t)
    t = re.sub(r'(\d) (h|km|ans|places|min)\b', r'\1' + NB + r'\2', t)
    t = re.sub(r'\bh (\d\d)\b', 'h' + NB + r'\1', t)
    t = re.sub(r'(\d) (\d\d\d)\b', r'\1' + NB + r'\2', t)
    return t

def typo_html(h):
    # texte hors balises, hors script/style
    parts = re.split(r'(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)', h, flags=re.S)
    out = []
    for p in parts:
        if p.startswith('<'):
            if not (p.startswith('<script') or p.startswith('<style')):
                p = re.sub(r'\b(aria-label|placeholder|title|alt|data-t-fr)="([^"]*)"',
                           lambda m: m.group(1) + '="' + typo(m.group(2)) + '"', p)
            out.append(p)
        else:
            out.append(typo(p))
    return ''.join(out)

VT = [
 dict(id='kremer', nom='Boulangerie Kremer', f='f-kremer', ens='bois', lum='#E1A04B', cote='g',
      lieu='Boulangerie à Esch-sur-Alzette', formule='Vitrine', prix='299 €', n=1,
      desc="Une seule page, composée comme une affiche : les pains et leurs prix, les horaires, le plan. Tout se lit en dix secondes, sur un téléphone, avant d'aller chercher sa baguette.",
      essai="Essayez : descendez jusqu'au ticket des horaires."),
 dict(id='reuter', nom='Reuter & Associés', f='f-reuter', ens='laiton', lum='#C9A566', cote='d',
      lieu="Cabinet d'avocats à Luxembourg-Ville", formule='Vitrine', prix='299 €', n=1,
      desc="Une page sobre, mise en page comme un beau livre : les domaines d'intervention, l'équipe, le premier entretien. La confiance s'installe avant le premier appel.",
      essai="Essayez : lisez l'ouverture et sa lettrine."),
 dict(id='schmit', nom='Garage Schmit', f='f-schmit', ens='led', lum='#F2A33A', cote='g',
      lieu='Garage à Differdange', formule='Vitrine Pro', prix='449 €', n=2,
      desc="Quatre pages qui s'enchaînent : l'atelier, les services, les occasions, les avis. Les chiffres se comptent, l'aiguille monte, la voiture se dessine.",
      essai="Essayez : passez d'une page à l'autre."),
 dict(id='nova', nom='Studio Nova', f='f-nova', ens='rose', lum='#D47F95', cote='d',
      lieu='Salon de coiffure à Esch-sur-Alzette', formule='Vitrine Pro', prix='449 €', n=2,
      desc="Un site qui ondule comme une chevelure : la couleur bouge derrière le titre, la galerie défile en profondeur, l'équipe se présente.",
      essai="Essayez : faites défiler la galerie."),
 dict(id='comptoir', nom='Le Comptoir', f='f-comptoir', ens='rouge', lum='#D0503F', cote='g',
      lieu='Restaurant à Esch-sur-Alzette', formule='Sur-mesure', prix='599 €', n=3,
      desc="La salle en trois dimensions, reliée à la réservation : on choisit le jour, l'heure, puis sa table. En français, en allemand, en anglais et en portugais.",
      essai="Essayez : choisissez une table."),
 dict(id='fleurs', nom='Fleurs & Cie', f='f-fleurs', ens='email', lum='#6E9A5B', cote='d',
      lieu='Fleuriste à Dudelange', formule='Sur-mesure', prix='599 €', n=3,
      desc="Le client compose son bouquet tige par tige, choisit l'emballage, écrit un mot et voit le prix en direct. La commande arrive prête à livrer.",
      essai="Essayez : composez un bouquet."),
]

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def enseigne(v):
    t = esc(v['nom'])
    if v['ens'] in ('rose', 'rouge'):
        etoile = '<svg class="ens-etoile" viewBox="0 0 20 20"><path d="M10 1l2.6 6.2L19 8l-5 4.3 1.6 6.7L10 15.4 4.4 19 6 12.3 1 8l6.4-.8z"/></svg>' if v['ens'] == 'rouge' else ''
        return f'<div class="ens ens--neon ens--{v["ens"]}" aria-hidden="true"><span class="neon ens-t"><span>{t}</span><span class="neon-lum">{t}</span></span>{etoile}</div>'
    extra = '<span class="ens-volet"></span>' if v['ens'] == 'led' else ''
    return f'<div class="ens ens--{v["ens"]}" aria-hidden="true"><span class="ens-t">{t}</span>{extra}<span class="ens-projo"></span></div>'

def vitrine(v, mq):
    amp = ''.join('<i class="on"></i>' if i < v['n'] else '<i></i>' for i in range(3))
    return f'''<article class="vt vt--{v['cote']} grille" id="voir-{v['id']}" data-vt="{v['id']}" style="--lum:{v['lum']}">
  <div class="vt-devanture">
    {enseigne(v)}
    <div class="vt-cadre" role="button" tabindex="0" data-ouvrir="{v['id']}" aria-label="Entrer dans la boutique {esc(v['nom'])}, commerce imaginaire">
      <div class="vt-vitre"><div class="vt-ecran" data-ecran><div class="mq-hote" inert>{mq}</div></div><span class="vt-nuit"></span><a class="vt-lien" href="#voir-{v['id']}" data-ouvrir="{v['id']}" tabindex="-1" aria-hidden="true"></a><span class="vt-reflet" aria-hidden="true"></span></div>
    </div>
    <div class="vt-trottoir" aria-hidden="true"></div>
    <p class="vt-sortir"><span>{esc(v['nom'])}, commerce imaginaire</span><a href="#rue">Sortir</a></p>
  </div>
  <div class="vt-plaque">
    <h3 class="vt-nom {v['f']}" data-vt-nom>{esc(v['nom'])}</h3>
    <p class="vt-lieu">{v['lieu']}</p>
    <p class="vt-formule"><span>{v['formule']}, {v['prix']}</span><span class="ampoules" role="img" aria-label="Niveau {v['n']} sur 3">{amp}</span></p>
    <p class="vt-desc">{v['desc']}</p>
    <p class="vt-essai">{v['essai']}</p>
    <a class="btn btn--trait" href="#voir-{v['id']}" data-ouvrir="{v['id']}">Entrer dans la boutique</a>
  </div>
</article>'''

FAQ = [
 ("Je n'y connais rien en informatique. C'est un problème ?", "Aucun. Vous me parlez de votre commerce, je m'occupe du reste, et vous validez chaque étape."),
 ("Dois-je payer quelque chose avant ?", "Non. Vous payez une fois le site en ligne et validé par vous."),
 ("À qui appartient le site ?", "À vous. Le nom de domaine est enregistré à votre nom, et je vous remets tous les accès."),
 ("Et si je veux changer un horaire ou un prix plus tard ?", "Avec la maintenance, c'est fait sous 48 heures. Sans elle, je vous annonce le prix de la modification avant de la faire."),
 ("Combien de temps faut-il ?", "De 7 à 14 jours selon la formule, à partir du moment où j'ai vos photos et vos textes."),
 ("Et après la première année ?", "Il ne reste que le renouvellement du nom de domaine. Je vous en donne le prix exact avant de commencer."),
 ("Pourquoi vous plutôt qu'une grande agence ?", "Un seul interlocuteur, un prix fixe annoncé d'avance, et un site conçu pour votre commerce."),
]

def faq():
    o = []
    for i, (q, r) in enumerate(FAQ):
        o.append(f'<div class="faq-item"><h3 class="faq-q"><button type="button" class="faq-b" aria-expanded="false" aria-controls="faq-r{i}" id="faq-q{i}">{q}<span class="faq-signe" aria-hidden="true"></span></button></h3>'
                 f'<div class="faq-r" id="faq-r{i}" role="region" aria-labelledby="faq-q{i}"><div><p>{r}</p></div></div></div>')
    return '\n'.join(o)

def b64(n):
    return base64.b64encode(open(os.path.join(R, 'fonts', n), 'rb').read()).decode()

FONTS = f'''@font-face{{font-family:'Instrument Serif';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,{b64('iserif.woff2')}) format('woff2')}}
@font-face{{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,{b64('iserif-i.woff2')}) format('woff2')}}
@font-face{{font-family:'Instrument Sans';font-style:normal;font-weight:400 700;font-stretch:75% 100%;font-display:swap;src:url(data:font/woff2;base64,{b64('isans.woff2')}) format('woff2')}}
@font-face{{font-family:'Fraunces';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,{b64('fraunces.woff2')}) format('woff2')}}'''

MQS = ['kremer', 'reuter', 'schmit', 'nova', 'comptoir', 'fleurs']
NUM = dict(kremer='m1', reuter='m2', schmit='m3', nova='m4', comptoir='m5', fleurs='m6')

import math
def jauge():
    cx, cy, r = 150, 150, 118
    o = []
    def pt(a, rr):
        a = math.radians(a); return cx + rr*math.cos(a), cy + rr*math.sin(a)
    x1, y1 = pt(150, r); x2, y2 = pt(30, r)
    o.append(f'<path d="M{x1:.1f} {y1:.1f}A{r} {r} 0 1 1 {x2:.1f} {y2:.1f}" fill="none" stroke="#2C3137" stroke-width="10" stroke-linecap="round"/>')
    xa, ya = pt(150 + 60/80*240, r)
    o.append(f'<path d="M{xa:.1f} {ya:.1f}A{r} {r} 0 0 1 {x2:.1f} {y2:.1f}" fill="none" stroke="#E0492F" stroke-width="10" stroke-linecap="round"/>')
    for v in range(0, 81, 5):
        a = 150 + v/80*240; big = v % 10 == 0
        xa, ya = pt(a, r - 14); xb, yb = pt(a, r - (30 if big else 22))
        o.append(f'<path d="M{xa:.1f} {ya:.1f}L{xb:.1f} {yb:.1f}" stroke="#EEF0F2" stroke-opacity="{1 if big else .45}" stroke-width="{2.2 if big else 1.2}"/>')
        if big:
            xt, yt = pt(a, r - 46)
            o.append(f'<text x="{xt:.1f}" y="{yt+5:.1f}" text-anchor="middle" font-size="14" fill="#8F969E" font-family="Instrument Sans,sans-serif">{v}</text>')
    o.append('<g class="s-aiguille"><path d="M146 150L262 147.5v5z" fill="#F2A33A"/><circle cx="150" cy="150" r="11" fill="#1E2227" stroke="#F2A33A" stroke-width="3"/></g>')
    o.append('<text x="150" y="214" text-anchor="middle" font-size="12" fill="#8F969E" font-family="Instrument Sans,sans-serif" letter-spacing="2">ANS</text>')
    return ''.join(o)

def occasions():
    autos = [('#D8C3A0', 'Volkswagen Golf 1.5 TSI', '2021', '38 500 km', '21 900 €'),
             ('#6E2B34', 'Peugeot 3008 Allure', '2020', '52 000 km', '23 400 €'),
             ('#3B3B3A', 'Škoda Octavia Combi', '2022', '29 800 km', '24 700 €')]
    o = []
    for i, (c, n, a, km, px) in enumerate(autos):
        o.append(f'''<li class="s-occ s-c" style="--i:{i+2}"><div class="s-occ-img"><svg viewBox="0 0 300 140" aria-hidden="true"><ellipse cx="150" cy="118" rx="130" ry="7" fill="#000" opacity=".35"/><path d="M22 104V92q2-10 18-12l48-6q24-22 62-26h44q26 1 48 22l34 6q16 4 18 16v12z" fill="{c}"/><path d="M98 76q18-16 50-18h40q20 1 38 18z" fill="#1E2227" opacity=".8"/><path d="M160 58v18" stroke="{c}" stroke-width="3"/><circle cx="80" cy="104" r="17" fill="#0E1012"/><circle cx="80" cy="104" r="7" fill="#8F969E"/><circle cx="234" cy="104" r="17" fill="#0E1012"/><circle cx="234" cy="104" r="7" fill="#8F969E"/><path d="M266 84l10 2v5l-10-1z" fill="#F2A33A"/></svg></div>
<h3>{n}</h3><p>{a}, {km}, essence</p><span class="s-prix">{px}</span></li>''')
    return '\n'.join(o)

def galerie():
    G = [
     ('Carré plongeant', '#D47F95', '#F4C6AE', '#3A2231', '<path d="M92 150q58-90 116 0v130q-20-40-26-78-28 20-64 0-6 38-26 78z"/>'),
     ('Boucles libérées', '#8E6BB0', '#F2D6E2', '#3A2231', '<g>' + ''.join(f'<circle cx="{150+70*__import__("math").cos(a/9*6.283):.0f}" cy="{175+75*__import__("math").sin(a/9*6.283):.0f}" r="34"/>' for a in range(9)) + '</g>'),
     ('Queue haute', '#F4C6AE', '#D47F95', '#3A2231', '<path d="M98 176q0-72 52-72t52 72q-10-40-52-42-42 2-52 42z"/><path d="M170 108q60-40 70 30 6 60-30 150 20-80 0-130-10-30-40-50z"/>'),
     ('Ondulations', '#3A2231', '#D47F95', '#F4C6AE', '<path d="M96 170q54-100 108 0 10 40-6 60 18 30 0 60 10 30-10 50h-12q16-30 0-50 14-30-2-56 12-26 4-54-40-40-80 0-8 28 4 54-16 26-2 56-16 20 0 50h-12q-20-20-10-50-18-30 0-60-16-20-4-60z"/>'),
     ('Coupe courte', '#8E6BB0', '#F4C6AE', '#3A2231', '<path d="M100 170q-4-70 56-74 54 2 48 64-18-36-60-30-30 6-44 40z"/>'),
     ('Chignon bohème', '#D47F95', '#8E6BB0', '#FFF7F8', '<circle cx="150" cy="96" r="34"/><path d="M98 180q-2-64 52-66 54 2 52 66-14-34-52-36-38 2-52 36z"/>'),
    ]
    o = []
    for i, (t, a, b, h, hair) in enumerate(G):
        o.append(f'''<figure class="n-vis"><div class="n-vis-in"><svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="300" height="400" fill="{a}"/><circle cx="{60+i*37%180}" cy="{330-i*23%120}" r="150" fill="{b}" opacity=".85"/><ellipse cx="150" cy="190" rx="44" ry="56" fill="{b}"/><path d="M118 238q32 26 64 0v70h-64z" fill="{b}"/><g fill="{h}">{hair}</g><path d="M70 400q80-70 160 0" fill="{h}" opacity=".35"/></svg></div><figcaption>{t}</figcaption><span class="note-photo">Votre photo</span></figure>''')
    return '\n'.join(o)

def equipe():
    E = [('Léa', 'Coloriste', '#D47F95', '#3A2231', 'M60 92q0-48 50-50 52 2 50 50-6 30-8 70h-84q-2-40-8-70z'),
         ('Sofia', 'Coupe et brushing', '#8E6BB0', '#F4C6AE', 'M62 96q2-50 48-52 48 2 50 52-18-30-50-30-32 0-48 30z'),
         ('Marion', 'Soins du visage', '#F4C6AE', '#8E6BB0', 'M58 100q0-56 52-56t52 56q-4 40 10 70h-24q-4-40-4-60-20-26-34-26-14 0-34 26 0 20-4 60h-24q14-30 10-70z'),
         ('Inès', 'Chignons', '#D47F95', '#FFF7F8', 'M110 20a20 20 0 1 1 0 40 20 20 0 1 1 0-40zM60 104q0-48 50-50 50 2 50 50-12-28-50-30-38 2-50 30z')]
    o = []
    for n, r, a, b, d in E:
        o.append(f'<li class="n-c" style="--i:{len(o)+1}"><svg class="n-portrait" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="108" fill="{a}"/><ellipse cx="110" cy="104" rx="38" ry="46" fill="{b}" opacity=".9"/><path d="M52 220q6-60 58-62 52 2 58 62z" fill="{b}" opacity=".9"/><path d="{d}" fill="#3A2231" opacity=".92"/></svg><h3>{n}</h3><p>{r}</p></li>')
    return '\n'.join(o)

TABLES = [(1,'rond',2,70,110),(2,'rond',2,70,225),(3,'rond',2,70,340),
 (4,'carre',4,210,130),(5,'carre',4,340,130),(6,'carre',4,210,260),(7,'carre',4,340,260),(8,'carre',4,210,390),(9,'carre',4,340,390),
 (10,'rond',2,560,110),(11,'grande',8,560,300)]
RESERVEES = {2, 6, 10}
AD = ' aria-disabled="true"'
def tables():
    o = []
    dims = {'rond': (52, 52), 'carre': (66, 66), 'grande': (74, 210)}
    nch = {'rond': 2, 'carre': 4, 'grande': 8}
    for n, t, p, x, y in TABLES:
        w, h = dims[t]
        st = f'left:{(x-w/2)/640*100:.3f}%;top:{(y-h/2)/460*100:.3f}%;width:{w/640*100:.3f}%;height:{h/460*100:.3f}%'
        res = n in RESERVEES
        lab = f'Table {n}, {p} places' + (', déjà réservée' if res else '') if t != 'grande' else 'Table 11, salon privé, 8 à 10 places'
        ch = ''.join('<span class="c-ch"></span>' for _ in range(nch[t]))
        o.append(f'<button type="button" class="c-table c-table--{t}{" c-table--prise" if res else ""}" data-table="{n}" data-places="{10 if t=="grande" else p}" style="{st}" aria-label="{lab}"{AD if res else ""}>{ch}<span class="c-plateau">{n}</span></button>')
    return '\n'.join(o)

PFR = {'plat1': ('Filet de sandre, beurre au riesling', 'Sandre de la Moselle, pommes de terre fondantes, riesling de Remich.'),
       'plat2': ('Bacalhau à Brás, oignons confits', 'Morue effilochée, pommes paille, œuf coulant et olives noires.'),
       'plat3': ('Judd mat Gaardebounen', 'Collet de porc fumé, fèves des marais à la crème, pommes de terre sautées.')}
def plats():
    P = [('#F4E8DF', '<ellipse cx="60" cy="58" rx="26" ry="14" fill="#E9C9A2" transform="rotate(-20 60 58)"/><path d="M40 70q20 8 40-6" stroke="#E3A33B" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="74" cy="44" r="6" fill="#8A9A5B"/><circle cx="46" cy="46" r="4" fill="#8A9A5B"/>', 'plat1', '28 €'),
         ('#EFE2D6', '<circle cx="60" cy="60" r="24" fill="#F2D38A"/><g stroke="#C8453B" stroke-width="3" stroke-linecap="round"><path d="M46 52l8 4M62 46l6 8M52 68l10-2M68 64l6 6"/></g><circle cx="58" cy="58" r="3" fill="#6B7F3A"/><circle cx="70" cy="56" r="2.5" fill="#6B7F3A"/>', 'plat2', '24 €'),
         ('#F4E8DF', '<path d="M38 64q4-24 26-26 20 2 20 22-6 20-24 20-20-2-22-16z" fill="#B0625A"/><path d="M44 62q8-10 18-12" stroke="#E7B7A4" stroke-width="3" fill="none"/><g fill="#7C9A4E"><ellipse cx="78" cy="74" rx="6" ry="4"/><ellipse cx="84" cy="64" rx="6" ry="4"/><ellipse cx="72" cy="84" rx="6" ry="4"/></g>', 'plat3', '26 €')]
    o = []
    for i, (c, f, k, px) in enumerate(P):
        o.append(f'<li class="c-plat"><svg class="c-assiette" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="{c}"/><circle cx="60" cy="60" r="44" fill="none" stroke="#B08D57" stroke-width="1" opacity=".5"/><circle cx="60" cy="60" r="56" fill="none" stroke="#B08D57" stroke-width="1.5"/>{f}</svg><h3 data-t="{k}">{PFR[k][0]}</h3><p data-t="{k}_d">{PFR[k][1]}</p><b>{px}</b></li>')
    return '\n'.join(o)

import math as _m
def _petales(n, r, rx, ry, col, cx=30, cy=30, rot=0):
    return ''.join(f'<ellipse class="f-pet" style="--p:{k}" cx="{cx}" cy="{cy-r}" rx="{rx}" ry="{ry}" fill="{col}" transform="rotate({rot+k*360/n:.0f} {cx} {cy})"/>' for k in range(n))
FL = {
 'pivoine': _petales(8, 13, 11, 13, '#E7899E') + _petales(6, 7, 8, 9, '#D96C86', rot=30) + '<circle cx="30" cy="30" r="7" fill="#C2566F"/><circle cx="30" cy="30" r="3" fill="#F2D48A"/>',
 'rose': '<circle cx="30" cy="30" r="20" fill="#C9506B"/>' + _petales(5, 10, 10, 11, '#DA6A83', rot=10) + '<path d="M30 30m-8 0a8 8 0 1 1 8 8M30 30a4 4 0 1 0-4-4" fill="none" stroke="#9E3550" stroke-width="2" stroke-linecap="round"/>',
 'renoncule': '<circle cx="30" cy="30" r="20" fill="#F0A07C"/><circle class="f-pet" style="--p:1" cx="30" cy="30" r="15" fill="#F4B596"/><circle class="f-pet" style="--p:2" cx="30" cy="30" r="10" fill="#F7C9B0"/><circle class="f-pet" style="--p:3" cx="30" cy="30" r="5" fill="#8A5A44"/>',
 'tulipe': '<path class="f-pet" style="--p:0" d="M16 26q0 22 14 24 14-2 14-24-7 6-14-4-7 10-14 4z" fill="#F2D48A"/><path class="f-pet" style="--p:2" d="M22 24q8-16 8-16t8 16q-4 18-8 18t-8-18z" fill="#E9BF5E"/>',
 'eucalyptus': ''.join(f'<ellipse class="f-pet" style="--p:{k}" cx="{30+(9 if k%2 else -9)}" cy="{12+k*8}" rx="8" ry="6" fill="#86AE92"/>' for k in range(5)) + '<path d="M30 8v44" stroke="#5E8467" stroke-width="2"/>',
 'gypsophile': ''.join(f'<circle class="f-pet" style="--p:{k%5}" cx="{30+16*_m.cos(k*2.4):.1f}" cy="{30+16*_m.sin(k*2.4)*.8:.1f}" r="{3.2 if k%3 else 4}" fill="#FFFFFF" stroke="#DCDCCB" stroke-width=".8"/>' for k in range(14)) + '<path d="M30 30l-10-10M30 30l12-8M30 30l-4 14M30 30l14 6M30 30l-14 4" stroke="#8FAE7E" stroke-width="1"/>',
}
FLN = [('pivoine','Pivoine',6),('rose','Rose',4),('renoncule','Renoncule',3.5),('tulipe','Tulipe',3),('eucalyptus','Eucalyptus',2.5),('gypsophile','Gypsophile',2)]
def fsvg(k, cls='f-tete'):
    return f'<svg class="{cls}" viewBox="0 0 60 60" aria-hidden="true">{FL[k]}</svg>'
def prix_fr(p):
    return (f'{p:.2f}'.replace('.', ',') if p % 1 else f'{p:.0f}') + ' €'
def palette():
    return '\n'.join(f'<li><button type="button" class="f-choix" data-fleur="{k}" data-prix="{p}" aria-label="Ajouter au bouquet : {n}, {prix_fr(p)}">{fsvg(k)}<span class="f-choix-nom">{n}</span><span class="f-choix-prix">{prix_fr(p)}</span></button></li>' for k, n, p in FLN)
SLOTS6 = [[0,270],[-11,250],[11,252],[-22,228],[22,226],[-5,205],[6,200],[-31,200],[31,198],[-16,178],[16,176],[0,160]]
PREMIERES = [('pivoine',6),('eucalyptus',2.5),('rose',4),('renoncule',3.5),('gypsophile',2)]
def tiges():
    noms = dict((k, n) for k, n, p in FLN)
    o = []
    for i, (f, p) in enumerate(PREMIERES):
        a, h = SLOTS6[i]
        o.append(f'<div class="f-tige" data-fleur="{f}" data-prix="{p}" data-slot="{i}" style="--a:{a}deg;--h:calc({h}px * var(--sc,1));z-index:{20-i}"><span class="f-tige-trait"></span><span class="f-tige-feuille"></span><button type="button" class="f-tige-fleur" aria-label="Retirer du bouquet : {noms[f]}">{fsvg(f)}</button></div>')
    return ''.join(o)
def compositions():
    C = [('Le Marché', 'Renoncules, tulipes et gypsophile', 32, ['tulipe','renoncule','gypsophile','renoncule','tulipe']),
         ('Pivoines et eucalyptus', 'Le bouquet signature de l\'atelier', 45, ['eucalyptus','pivoine','pivoine','eucalyptus','pivoine']),
         ('Le Champêtre', 'Roses, eucalyptus et fleurs des champs', 28, ['gypsophile','rose','eucalyptus','rose','gypsophile'])]
    o = []
    for n, d, p, fl in C:
        heads = ''.join(f'<g transform="translate({20+i*24} {30+abs(2-i)*14}) scale(.8)">{FL[f]}</g>' for i, f in enumerate(fl))
        stems = ''.join(f'<path d="M{44+i*24} {70+abs(2-i)*14}L90 150" stroke="#6E9A5B" stroke-width="2"/>' for i in range(5))
        o.append(f'<li class="f-compo"><svg viewBox="0 0 180 190" aria-hidden="true"><circle cx="90" cy="95" r="88" fill="#F1EEDF"/>{stems}{heads}<path d="M60 140l30 44 30-44z" fill="#C9A27C"/><path d="M60 140h60" stroke="#8A5A44" stroke-width="2"/></svg><h3>{n}</h3><p>{d}</p><b>{prix_fr(p)}</b></li>')
    return '\n'.join(o)

def mockup(i):
    h = lire(NUM[i] + '.html').replace('{{JAUGE}}', jauge()).replace('{{OCCASIONS}}', occasions()).replace('{{GALERIE}}', galerie()).replace('{{EQUIPE}}', equipe()).replace('{{TABLES}}', tables()).replace('{{PLATS}}', plats()).replace('{{PALETTE}}', palette()).replace('{{COMPOS}}', compositions()).replace('{{TIGES}}', tiges())
    return h if h else f'<div class="mq" data-mq="{i}"><p style="padding:40px">{i}</p></div>'

def build(out=OUT):
    body = lire('body.html')
    for v in VT:
        body = body.replace('{{VT:%s}}' % v['id'], vitrine(v, mockup(v['id'])))
    body = body.replace('{{CAMELEON}}', lire('cameleon.html')).replace('{{VIEUX}}', lire('vieux.html')).replace('{{FAQ}}', faq())
    body = typo_html(body)
    css = '\n'.join(lire(n) for n in ['ecrin.css', 'mq.css', 'm1.css', 'm2.css', 'm3.css', 'm4.css', 'm5.css', 'm6.css', 'cameleon.css', 'vieux.css', 'print.css'])
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\n\s*', '\n', css)
    js = '\n'.join(lire(n) for n in ['app.js', 'm3.js', 'm4.js', 'm5.js', 'm6.js', 'conf.js', 'visite.js', 'fin.js'])
    head = typo_html(lire('head.html'))
    html = f'''<!doctype html>
<html lang="fr">
<head>
{head}
<style>
{FONTS}
{css}
</style>
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
'''
    open(out, 'w', encoding='utf-8').write(html)
    print(out, len(html.encode('utf-8')) // 1024, 'Ko')

if __name__ == '__main__':
    build()
