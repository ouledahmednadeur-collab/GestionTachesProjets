/* Page de connexion : écran d'entrée + train d'engrenages synchronisé (purement décoratif) */
(() => {
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. écran d'entrée (une fois par onglet) ---------- */
  const loader = document.getElementById('loader');
  let dejaVu = false;
  try { dejaVu = sessionStorage.getItem('loaderVu') === '1'; sessionStorage.setItem('loaderVu', '1'); } catch {}
  if (loader) {
    if (reduit || dejaVu) loader.remove();                  // retiré avant le premier affichage
    else {
      document.documentElement.classList.add('with-loader'); // la carte attend la fin du loader
      setTimeout(() => loader.classList.add('out'), 900);    // fondu de 300 ms
      setTimeout(() => loader.remove(), 1200);               // 1,2 s au total
    }
  }

  /* ---------- 2. train d'engrenages entraîné par l'Admin ---------- */
  addEventListener('DOMContentLoaded', () => {               // common.js est chargé : colorOf(), initials()
    const cv = document.createElement('canvas');
    cv.className = 'gears'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const ctx = cv.getContext('2d');
    const NOMS = ['Amira', 'Bilel', 'Chloé', 'Driss', 'Emma', 'Farah', 'Gabriel', 'Hana',
      'Inès', 'Jules', 'Karim', 'Léa', 'Malek', 'Nour', 'Omar', 'Rania'];   // membres fictifs
    const N_ADMIN = 28, MOTIF = [18, 10, 14, 10];           // dents : Admin, puis grand, petit, moyen, petit…
    const BASE = 0.3;                                        // vitesse de base de l'Admin (rad/s)
    let W = 0, H = 0, m = 8, admin = null, gears = [], coul = {};
    let theta = 0, v = BASE, sens = 1, boost = 0;           // horloge unique : theta = angle de l'Admin
    const souris = { x: -1e4, y: -1e4 };                     // très loin = pas de survol
    let curseur = '';

    // Lit les couleurs du thème (variables CSS) : les engrenages suivent le mode clair / sombre.
    const lireCouleurs = () => {
      const s = getComputedStyle(document.documentElement), c = n => s.getPropertyValue(n).trim();
      coul = { dent: c('--line'), bord: c('--muted'), texte: c('--text'), accent: c('--accent') };
    };
    // Les deux teintes du dégradé de colorOf(), au format du canvas.
    const teintes = nom => colorOf(nom).match(/hsl\([^)]*\)/g).map(c => c.replace(/\s+/g, ','));

    /* zone d'animation : mêmes seuils que le CSS (640 px et 900 px), sous le header de 60 px */
    const zone = () => W < 640 ? { x: 0, y: 60, w: W, h: 140, bande: true }
      : { x: 0, y: 60, w: W * (W < 900 ? .45 : .58), h: H - 60, bande: false };

    /* disposition : Admin à gauche, puis 2 rangées (1 en mobile) qui s'emboîtent de proche en proche */
    const placer = () => {
      const z = zone();
      m = z.bande ? (z.h - 16) / 30 : Math.min(z.w / 100, (z.h - 40) / 50);   // module = échelle
      const R = n => n * m / 2;                              // rayon primitif
      admin = { n: N_ADMIN, r: R(N_ADMIN), x: z.x + 16 + R(N_ADMIN) + m, y: z.y + z.h / 2 };
      gears = [];
      const rangees = z.bande ? [0] : [-15 * m, 15 * m];     // décalage vertical des rangées
      let i = 0;
      for (const dy of rangees) {
        let p = admin, k = 0;
        for (;;) {
          const n = MOTIF[k % MOTIF.length], r = R(n), y = admin.y + dy;
          const x = p === admin ? admin.x + Math.sqrt((admin.r + r) ** 2 - dy * dy)   // touche l'Admin
                                : p.x + p.r + r;                                    // touche le précédent
          if (x + r + m > z.x + z.w - 16) break;             // on s'arrête au bord de la zone
          const nom = NOMS[i++ % NOMS.length];
          gears.push({ n, r, x, y, p, nom, lettre: initials(nom), deg: teintes(nom),
            t: Math.atan2(y - p.y, x - p.x) });              // angle de la ligne des centres
          p = gears[gears.length - 1]; k++;
        }
      }
    };

    /* angles absolus calculés depuis theta seul : sens inverse, rapport N_parent/N, décalage d'une demi-dent */
    const angles = () => {
      admin.a = theta;
      for (const g of gears)                                 // le parent est toujours calculé avant l'enfant
        g.a = g.t + Math.PI - Math.PI / g.n + (g.t - g.p.a) * g.p.n / g.n;
    };

    // Adapte le canvas à la fenêtre et à la densité de pixels,
    // puis replace les engrenages.
    const taille = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);        // plafonné à 2
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      placer();
    };

    /* contour denté : dent k centrée sur l'angle a + k × 2π/N */
    const chemin = g => {
      const pas = 2 * Math.PI / g.n, ext = g.r + m, int = g.r - 1.2 * m;
      const pt = (rr, an) => ctx.lineTo(g.x + Math.cos(an) * rr, g.y + Math.sin(an) * rr);
      ctx.beginPath();
      for (let k = 0; k < g.n; k++) {
        const c = g.a + k * pas;
        pt(int, c - pas * .28); pt(ext, c - pas * .15); pt(ext, c + pas * .15); pt(int, c + pas * .28);
      }
      ctx.closePath();
    };
    // Cercle lumineux autour d'un engrenage (l'Admin, ou celui sous la souris).
    const halo = (g, alpha) => {
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r + m + 6, 0, Math.PI * 2);
      ctx.globalAlpha = alpha; ctx.strokeStyle = coul.accent; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
    };
    // Dessine un engrenage : contour denté, disque central coloré, initiale (ou « Admin »),
    // et son prénom quand la souris est dessus.
    const dessiner = (g, estAdmin, proche) => {
      ctx.save();
      if (proche) { ctx.translate(g.x, g.y); ctx.scale(1.08, 1.08); ctx.translate(-g.x, -g.y); }   // style seulement
      chemin(g);
      if (estAdmin) { ctx.globalAlpha = .3; ctx.fillStyle = coul.accent; ctx.fill(); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = coul.dent; ctx.fill(); }
      ctx.strokeStyle = estAdmin ? coul.accent : coul.bord; ctx.lineWidth = estAdmin ? 2 : 1.5; ctx.stroke();
      if (estAdmin || proche) halo(g, estAdmin ? .45 : .3);
      const rd = g.r * .5;                                   // disque central (ne tourne pas)
      ctx.beginPath(); ctx.arc(g.x, g.y, rd, 0, Math.PI * 2);
      if (estAdmin) ctx.fillStyle = coul.accent;
      else { const gr = ctx.createLinearGradient(g.x - rd, g.y - rd, g.x + rd, g.y + rd);
        gr.addColorStop(0, g.deg[0]); gr.addColorStop(1, g.deg[1]); ctx.fillStyle = gr; }
      ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(estAdmin ? rd * .42 : rd * .8)}px system-ui,sans-serif`;
      ctx.fillText(estAdmin ? 'Admin' : g.lettre, g.x, g.y + 1);
      ctx.restore();
      if (proche) {                                          // prénom, côté intérieur de la rangée
        const dessous = g.y <= admin.y;
        ctx.fillStyle = coul.texte; ctx.font = '600 12px system-ui,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(g.nom, g.x, g.y + (dessous ? 1 : -1) * ((g.r + m) * 1.08 + 14));
      }
    };

    /* une image : dt en secondes (0 = rendu statique) */
    const rendu = dt => {
      const actif = souris.x > -1e3;
      const ox = actif ? (souris.x / W - .5) * -8 : 0, oy = actif ? (souris.y / H - .5) * -8 : 0;   // parallaxe commune
      const mx = souris.x - ox, my = souris.y - oy;          // souris dans le repère des engrenages
      const dA = Math.hypot(mx - admin.x, my - admin.y);
      const cible = BASE * sens * (dA < admin.r + m + 60 || boost > 0 ? 3 : 1);
      v += (cible - v) * Math.min(1, dt * 2);                // accélère / ralentit / s'inverse en douceur
      boost = Math.max(0, boost - dt);
      theta += v * dt;                                       // seule variable qui avance avec le temps
      angles();
      const c = dA < admin.r + m ? 'pointer' : '';
      if (c !== curseur) document.body.style.cursor = curseur = c;

      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(ox, oy);
      dessiner(admin, true, false);
      for (const g of gears) dessiner(g, false, Math.hypot(mx - g.x, my - g.y) < g.r + m);
      ctx.restore();
    };

    /* ---------- 3. démarrage, boucle d'animation et événements ---------- */
    // Premier calcul ; on recalcule si le thème ou la taille de la fenêtre change.
    lireCouleurs(); taille();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { lireCouleurs(); if (reduit) rendu(0); });
    addEventListener('resize', () => { taille(); if (reduit) rendu(0); });
    if (reduit) { rendu(0); return; }                         // moins d'animations : image fixe, mais emboîtée

    // Boucle d'animation : une image par rafraîchissement de l'écran (requestAnimationFrame).
    let last = 0, raf = 0;
    // dt = temps écoulé depuis l'image précédente, plafonné à 50 ms (ex. après une pause).
    const frame = t => {
      const dt = last ? Math.min((t - last) / 1000, .05) : 0; last = t;
      rendu(dt); raf = requestAnimationFrame(frame);
    };
    // (Re)lance la boucle ; arrêtée quand l'onglet est caché (économie de processeur).
    const demarrer = () => { last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    document.addEventListener('visibilitychange', () => document.hidden ? cancelAnimationFrame(raf) : demarrer());

    /* le canvas ignore la souris (pointer-events:none) : on écoute window */
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { souris.x = e.clientX; souris.y = e.clientY; } });
    document.addEventListener('mouseleave', () => { souris.x = souris.y = -1e4; });
    addEventListener('pointerdown', e => {                     // clic / appui sur l'Admin : accélère et inverse le train
      const actif = souris.x > -1e3;
      const ox = actif ? (souris.x / W - .5) * -8 : 0, oy = actif ? (souris.y / H - .5) * -8 : 0;
      if (Math.hypot(e.clientX - ox - admin.x, e.clientY - oy - admin.y) < admin.r + m) { sens = -sens; boost = 1.5; }
    });
    if (!document.hidden) demarrer();
  });
})();
