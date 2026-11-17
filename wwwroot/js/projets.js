/* =====================================================================
 * projets.js : page de tous les projets (projets.html)
 * Affiche les projets en carreaux (nom, description, nombre de tâches,
 * avancement), avec recherche par nom et pagination.
 * - Admin  : GET /api/Projets paginé côté serveur ;
 * - Membre : ses projets (GET /api/projets/mes-projets), paginés en mémoire.
 * ===================================================================== */

/* ---------- Constantes et état de la page ---------- */

const admin = session().admin;
const SIZE = PAGE_SIZE;  // nombre de projets par page (constante commune)
let page = 1;            // page courante
let tous = null;         // tous les projets, chargés seulement si nécessaire (null = pas encore)

/* ---------- Chargement des données ---------- */

// Charge une seule fois la liste complète des projets :
// - Membre : mes-projets renvoie déjà toute sa liste ;
// - Admin  : on parcourt les pages de /api/Projets (50 au plus par page).
async function chargerTous() {
  if (tous) return tous;
  if (!admin) return (tous = list(await api('/api/projets/mes-projets')));
  const res = [];
  for (let p = 1; ; p++) {
    const d = await api(`/api/Projets?page=${p}&pageSize=50`);
    res.push(...list(d));
    if (!list(d).length || res.length >= total(d)) break;
  }
  return (tous = res);
}

// Renvoie les projets de la page courante et le nombre total de résultats.
// Admin sans recherche : pagination serveur ; sinon filtrage et découpage en mémoire.
async function pageCourante(q) {
  if (admin && !q) {
    const d = await api(`/api/Projets?page=${page}&pageSize=${SIZE}`);
    return { items: list(d), tot: total(d) };
  }
  const f = (await chargerTous()).filter(p => norm(p.nom).includes(q));
  return { items: f.slice((page - 1) * SIZE, page * SIZE), tot: f.length };
}

// Nombre de tâches (total de la liste paginée) et avancement d'un projet.
// Une erreur donne null : le carreau s'affiche quand même, sans cette information.
const details = p => Promise.all([
  api(`/api/projets/${p.id}/taches?page=1&pageSize=1`).then(total).catch(() => null),
  api(`/api/projets/${p.id}/avancement`).then(pct).catch(() => null)]);

/* ---------- Rendu ---------- */

// Carreau d'un projet (mêmes classes que les cartes de tâches de projet.js).
// d = mes droits (mesDroits()) : pastille de mon rôle dans ce projet, s'il y en a un.
const carte = (p, [n, v], d) => `
  <a class="card" href="projet.html?id=${p.id}">
    <div class="head">
      ${icon(p.nom)}
      <div>
        <h3>${esc(p.nom)}</h3>
        <span class="sub">${n == null ? '' : `${n} tâche${n > 1 ? 's' : ''}`}</span>
        ${droitsProjet(d, p.id).roles.map(r => `<span class="role-pill metier"
          title="${esc(survolPrivileges(droitsProjet(d, p.id).privileges))}">${esc(r)}</span>`).join(' ')}
      </div>
    </div>
    <div class="desc">${esc(p.description || 'Aucune description')}</div>
    <div>${avHtml(v)}</div>
  </a>`;

// Charge la page courante (filtrée par la recherche) puis dessine carreaux et pagination.
let tour = 0;   // évite qu'une réponse lente écrase une recherche plus récente
async function draw() {
  const moi = ++tour, q = norm($('#q').value);
  $('#out').innerHTML = skeleton(3);
  try {
    const { items, tot } = await pageCourante(q);
    const [infos, d] = await Promise.all([Promise.all(items.map(details)), mesDroits()]);
    if (moi !== tour) return;
    const pages = Math.max(1, Math.ceil(tot / SIZE));

    $('#out').innerHTML = items.length
      ? `<div class="grid">${items.map((p, i) => carte(p, infos[i], d)).join('')}</div>
        ${pages > 1 ? `<div class="pager">
          <button class="btn" id="prev" ${page <= 1 ? 'disabled' : ''}>← Précédent</button>
          <span>Page ${page} / ${pages}</span>
          <button class="btn" id="next" ${page >= pages ? 'disabled' : ''}>Suivant →</button>
        </div>` : ''}`
      : emptyBox('📁', q
        ? 'Aucun projet ne correspond à votre recherche.'
        : 'Aucun projet trouvé.');

    // Pagination : boutons présents seulement s'il y a plusieurs pages.
    const pv = $('#prev'), nx = $('#next');
    if (pv) pv.onclick = () => { page--; draw(); };
    if (nx) nx.onclick = () => { page++; draw(); };
  } catch (e) {
    if (moi === tour) $('#out').innerHTML = emptyBox('⚠️', esc(e.message));
  }
}

/* ---------- Initialisation ---------- */

view(`<div class="sec"><h2>${admin ? 'Tous les projets' : 'Mes projets'}</h2></div>
  ${bar('q')}
  <div id="out" style="margin-top:20px">${skeleton(3)}</div>`);

// Recherche : on revient à la page 1 à chaque saisie.
$('#q').oninput = () => { page = 1; draw(); };

draw();
