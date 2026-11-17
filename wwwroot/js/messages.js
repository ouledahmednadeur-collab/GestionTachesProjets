/* =====================================================================
 * messages.js : messagerie privée (messages.html, messages.html?avec=<id>)
 * À gauche : mes conversations (recherche, pagination, « Nouveau message ») ;
 * à droite : la discussion choisie en bulles, l'historique par pages et la saisie.
 * L'expéditeur n'est jamais envoyé : le backend le déduit du token. Tout texte est
 * échappé avec esc() avant d'être inséré dans la page.
 * L'Admin (compte sans fiche Membre) participe avec l'identifiant 0, affiché « Administrateur »
 * avec un badge Admin : un membre peut lui écrire, et l'Admin peut écrire à tout membre.
 * ===================================================================== */

/* ---------- État de la page ---------- */

const s = session();
const TAILLE = 20;        // messages par page d'historique
const ADMIN_ID = 0;       // identifiant de l'Administrateur dans l'API des messages
let moiId = null;         // ma fiche Membre (ADMIN_ID pour l'Admin)
let membres = [];         // tous les membres (noms, nouveau message)
let convs = [];           // mes conversations (résumés)
let pageConvs = 1;        // page de la liste des conversations
// interlocuteur de la discussion ouverte (?avec=0 : l'Administrateur)
let avec = param('avec') ? +param('avec') : null;
let msgs = [], totalMsgs = 0, pagesChargees = 0;   // discussion ouverte

/* ---------- Petits rendus ---------- */

const ligneVide = t => `<p class="stat-vide">${t}</p>`;
const nomDe = id => id === ADMIN_ID ? 'Administrateur' : membres.find(m => m.id === id)?.nom || 'Membre ' + id;
// badge « Admin » (même style que la barre du haut) à côté de l'Administrateur
const badgeAdmin = id => id === ADMIN_ID ? ' <span class="role-pill admin">Admin</span>' : '';
// lien vers le profil, sauf pour l'Administrateur (pas de fiche Membre)
const lienProfil = (id, html) => memberLink(id === ADMIN_ID ? null : id, html);
const date = d => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/* ---------- Liste des conversations (gauche) ---------- */

function dessinerConvs() {
  const q = norm($('#q').value);
  const f = convs.filter(c => norm(c.nom).includes(q));
  const r = paginer(f, PAGE_SIZE, pageConvs);
  pageConvs = r.page;
  $('#convs').innerHTML = !f.length ? ligneVide(convs.length ? 'Aucun résultat' : 'Aucune conversation')
    : r.items.map(c => `<button class="conv ${c.interlocuteurId === avec ? 'on' : ''}" data-avec="${c.interlocuteurId}">
          ${icon(c.nom)}
          <span class="conv-txt">
            <span class="meta"><b>${esc(c.nom)}${badgeAdmin(c.interlocuteurId)}</b><span>${date(c.dateDernierMessage)}</span></span>
            <span class="sub">${esc(c.extrait)}</span>
          </span>
          ${c.nonLus ? `<span class="nav-badge">${c.nonLus}</span>` : ''}
        </button>`).join('') + r.html;
  brancherPager($('#convs'), d => { pageConvs += d; dessinerConvs(); });
  document.querySelectorAll('#convs [data-avec]').forEach(b => b.onclick = () => ouvrir(+b.dataset.avec));
}

const chargerConvs = async () => {
  convs = await toutes('/api/Messages/conversations');
  dessinerConvs();
};

/* ---------- Discussion (droite) ---------- */

// Bulles : les miennes à droite (bleu), celles de l'interlocuteur à gauche (gris) ;
// bouton « Supprimer » seulement sur les miennes.
function dessinerDiscussion(enBas) {
  const zone = $('#bulles'), basAvant = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 40;
  zone.innerHTML = (pagesChargees * TAILLE < totalMsgs
      ? '<button class="btn small plus-ancien" id="plusAncien">Charger les messages précédents</button>' : '')
    + (msgs.length ? msgs.map(m => {
      const mien = m.expediteurId === moiId;
      return `<div class="bulle ${mien ? 'moi' : 'autre'}">
          <div class="bulle-txt">${esc(m.contenu)}</div>
          <div class="bulle-date">${date(m.dateEnvoi)}${mien
            ? ` · <button class="bulle-suppr" data-suppr="${m.id}">Supprimer</button>` : ''}</div>
        </div>`;
    }).join('') : ligneVide('Aucun message, écrivez le premier'));
  if (enBas || basAvant) zone.scrollTop = zone.scrollHeight;   // défilement vers le dernier message
  const pa = $('#plusAncien');
  if (pa) pa.onclick = async () => {
    const h = zone.scrollHeight;
    await chargerDiscussion(pagesChargees + 1);
    zone.scrollTop = zone.scrollHeight - h;   // garde la position de lecture
  };
  document.querySelectorAll('#bulles [data-suppr]').forEach(b => b.onclick = () =>
    confirmDo('Supprimer ce message ? Il disparaîtra aussi pour votre interlocuteur.', async () => {
      try {
        await api(`/api/Messages/${b.dataset.suppr}`, 'DELETE');
        toast('Message supprimé');
        await rafraichir();
      } catch (e) {
        toast(e.message, true);
      }
    }));
}

// Charge les pages 1..n de l'historique (page 1 = les plus récents) et les remet dans l'ordre.
async function chargerDiscussion(n, enBas) {
  const pages = await Promise.all([...Array(n)].map((_, i) =>
    api(`/api/Messages/conversation/${avec}?page=${i + 1}&pageSize=${TAILLE}`)));
  totalMsgs = pages[0].total;
  msgs = pages.reverse().flatMap(list);
  pagesChargees = n;
  dessinerDiscussion(enBas);
}

// Ouvre la discussion avec le membre id (depuis la liste, ?avec=, ou « Nouveau message »).
async function ouvrir(id) {
  avec = id;
  history.replaceState(null, '', `messages.html?avec=${id}`);
  $('#discussion').innerHTML = `<div class="disc-tete">
      <button class="btn small retour" id="retour">← Conversations</button>
      ${lienProfil(id, icon(nomDe(id)))}
      <b>${lienProfil(id, esc(nomDe(id)))}</b>${badgeAdmin(id)}
    </div>
    <div class="bulles" id="bulles">${skeleton(1)}</div>
    <form class="saisie" id="saisie">
      <textarea id="texte" rows="2" maxlength="1000" placeholder="Votre message… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"></textarea>
      <div class="saisie-pied">
        <span class="sub" id="compteur">0 / 1000</span>
        <button class="btn primary">Envoyer</button>
      </div>
    </form>`;
  $('.msg-page').classList.add('voir-discussion');   // mobile : on passe à la discussion
  $('#retour').onclick = () => $('.msg-page').classList.remove('voir-discussion');
  const t = $('#texte');
  t.oninput = () => { $('#compteur').textContent = `${t.value.length} / 1000`; };
  t.onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#saisie').requestSubmit(); }
  };
  $('#saisie').onsubmit = envoyer;
  dessinerConvs();
  try {
    await chargerDiscussion(1, true);
    await chargerConvs();   // les messages reçus viennent d'être marqués lus
    majMessages('messages');
  } catch (e) {
    toast(e.message, true);
    $('#bulles').innerHTML = ligneVide('Discussion indisponible');
  }
  t.focus();
}

// Envoi : validation côté client (1 à 1000 caractères, pas seulement des espaces).
async function envoyer(e) {
  e.preventDefault();
  const t = $('#texte'), contenu = t.value;
  if (!contenu.trim()) return toast('Le message est vide', true);
  if (contenu.length > 1000) return toast('1000 caractères au maximum', true);
  try {
    await api('/api/Messages', 'POST', { destinataireId: avec, contenu });
    t.value = '';
    t.oninput();
    await chargerDiscussion(Math.max(1, pagesChargees), true);
    await chargerConvs();
  } catch (er) {
    toast(er.message, true);
  }
}

// Rafraîchissement léger : discussion ouverte, liste et badge (sans recharger la page).
async function rafraichir() {
  try {
    if (avec) await chargerDiscussion(Math.max(1, pagesChargees));
    await chargerConvs();
    majMessages('messages');
  } catch {}
}

/* ---------- Nouveau message : liste filtrable des membres (comme sur la page Rôles) ---------- */

function nouveauMessage() {
  const box = $('#nouveau');
  box.hidden = !box.hidden;
  if (box.hidden) return;
  const inp = $('#mIn');
  let props = [], actif = -1;
  const afficher = () => {
    $('#mList').innerHTML = props.length ? props.map((m, i) =>
      `<li data-i="${i}" class="${i === actif ? 'on' : ''}">${esc(m.nom)}${m.email ? ' · ' + esc(m.email) : ''}${badgeAdmin(m.id)}</li>`).join('')
      : '<li class="vide">Aucun membre</li>';
    $('#mList').hidden = false;
    $('#mList .on')?.scrollIntoView({ block: 'nearest' });
  };
  const filtrer = () => {
    const q = norm(inp.value);
    // contacts : pour un membre, l'Administrateur puis les autres membres ; pour l'Admin, tous les membres
    const contacts = (s?.admin ? [] : [{ id: ADMIN_ID, nom: 'Administrateur', email: '' }]).concat(membres);
    props = contacts.filter(m => m.id !== moiId && norm(m.nom + ' ' + m.email + (m.id === ADMIN_ID ? ' admin' : '')).includes(q));
    actif = -1;
    afficher();
  };
  const choisir = i => {
    if (!props[i]) return;
    inp.value = '';
    $('#mList').hidden = true;
    box.hidden = true;
    ouvrir(props[i].id);
  };
  inp.onfocus = inp.oninput = filtrer;
  inp.onkeydown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      actif = e.key === 'ArrowDown' ? Math.min(actif + 1, props.length - 1) : Math.max(actif - 1, 0);
      afficher();
    } else if (e.key === 'Enter') { e.preventDefault(); choisir(actif < 0 ? 0 : actif); }
    else if (e.key === 'Escape') $('#mList').hidden = true;
  };
  $('#mList').onmousedown = e => {
    e.preventDefault();
    const li = e.target.closest('[data-i]');
    if (li) choisir(+li.dataset.i);
  };
  inp.focus();
}

/* ---------- Initialisation ---------- */

view(`<div class="sec"><h2>Messages</h2></div>
  <div class="msg-page">
    <section class="panel msg-liste">
      <div class="sec" style="margin:0 0 10px">
        <h3 style="margin:0">Conversations</h3>
        <button class="btn primary small" id="btnNouveau">+ Nouveau message</button>
      </div>
      <div id="nouveau" class="combo" hidden>
        <input id="mIn" placeholder="Nom ou email du membre…" autocomplete="off">
        <ul class="combo-list" id="mList" hidden></ul>
      </div>
      <section class="col">${bar('q', 'Rechercher par nom…')}</section>
      <div id="convs">${skeleton(1)}</div>
    </section>
    <section class="panel msg-discussion" id="discussion">
      ${ligneVide('Choisissez une conversation ou écrivez un nouveau message.')}
    </section>
  </div>`);

(async () => {
  try {
    membres = await toutes('/api/Membres');
    moiId = s?.admin ? ADMIN_ID : membres.find(m => norm(m.email) === norm(s?.name))?.id ?? null;
    if (moiId == null) {
      view(emptyBox('🔒', 'La messagerie est réservée aux comptes qui ont une fiche membre.'));
      return;
    }
    $('#btnNouveau').onclick = nouveauMessage;
    $('#q').oninput = () => { pageConvs = 1; dessinerConvs(); };
    await chargerConvs();
    if (avec != null && avec !== moiId) await ouvrir(avec);

    // Toutes les 15 s, seulement si la page est visible.
    setInterval(() => { if (document.visibilityState === 'visible') rafraichir(); }, 15000);
  } catch (e) {
    toast(e.message, true);
    $('#convs').innerHTML = ligneVide('Conversations indisponibles');
  }
})();
