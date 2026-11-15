/* Page de connexion : écran d'entrée (le grand engrenage Admin est dessiné par login.js) */
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
})();
