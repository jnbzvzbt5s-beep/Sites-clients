/* Rui’s Barber Studio — modules indépendants (police, dates, ticket, vues, visionneuse, pastille, apparitions), chacun dans son try/catch. */
(function () {
  "use strict";
  var CFG = {{jsconfig}};
  var reduit = false;
  try { reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- 0. Police prête : la page s’affiche d’un bloc, sans décalage ---------- */
  try {
    var afficherPage = function () { document.documentElement.classList.remove("attente"); };
    window.setTimeout(afficherPage, 700);
    if (document.fonts && document.fonts.load) document.fonts.load('640 20px "Archivo"').then(afficherPage, afficherPage);
    else afficherPage();
  } catch (e) { document.documentElement.classList.remove("attente"); }

  /* ---------- 1. Dates : huit tuiles-calendrier, heure du Luxembourg ---------- */
  try {
    (function () {
      var tuiles = document.getElementById("tuiles");
      if (!tuiles) return;
      var TZ = "Europe/Luxembourg";
      var JOUR_MS = 86400000;

      // « Aujourd’hui » au Luxembourg, ou fixé par ?date=AAAA-MM-JJ (tests).
      function aujourdhui() {
        var m = /[?&]date=(\d{4})-(\d{2})-(\d{2})(?:&|$)/.exec(window.location.search);
        if (m) {
          var t = Date.UTC(+m[1], +m[2] - 1, +m[3], 12);
          var v = new Date(t);
          if (v.getUTCFullYear() === +m[1] && v.getUTCMonth() === +m[2] - 1 && v.getUTCDate() === +m[3]) return t;
        }
        var p = {};
        new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
          .formatToParts(new Date())
          .forEach(function (x) { p[x.type] = x.value; });
        // Midi UTC : toujours le même jour civil au Luxembourg (UTC+1 ou UTC+2), changement d’heure compris.
        return Date.UTC(+p.year, +p.month - 1, +p.day, 12);
      }

      function parties(fmt, t) {
        var p = {};
        fmt.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
        return p;
      }
      var fmtLong = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
      var fmtCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

      function el(tag, classe, texte) {
        var n = document.createElement(tag);
        if (classe) n.className = classe;
        if (texte != null) n.textContent = texte;
        return n;
      }

      function tuile(valeur, nom, rel, haut, num, mois) {
        var label = el("label", "tuile");
        var input = document.createElement("input");
        input.type = "radio";
        input.name = "jour";
        input.value = valeur;
        if (rel) input.setAttribute("data-rel", rel);
        input.setAttribute("aria-label", nom);
        var corps = el("span", "tuile__corps");
        corps.setAttribute("aria-hidden", "true");
        if (num == null) {
          label.className += " tuile--seule";
          corps.appendChild(el("span", "tuile__seul", haut));
        } else {
          corps.appendChild(el("span", "tuile__haut", haut));
          corps.appendChild(el("span", "tuile__num", num));
          corps.appendChild(el("span", "tuile__mois", mois));
        }
        label.appendChild(input);
        label.appendChild(corps);
        return label;
      }

      var base = aujourdhui();
      for (var i = 0; i < 7; i++) {
        var t = base + i * JOUR_MS;
        var l = parties(fmtLong, t);
        var c = parties(fmtCourt, t);
        var quantieme = l.day === "1" ? "1er" : l.day;
        var valeur = l.weekday + " " + quantieme + " " + l.month;
        var rel = i === 0 ? CFG.rel_aujourdhui : i === 1 ? CFG.rel_demain : "";
        var haut = i === 0 ? CFG.aujourdhui : i === 1 ? CFG.demain : c.weekday;
        tuiles.appendChild(tuile(valeur, valeur + (rel ? " " + rel : ""), rel, haut, quantieme, c.month));
      }
      tuiles.appendChild(tuile(CFG.peu_importe.toLowerCase(), CFG.peu_importe, "", CFG.peu_importe, null, null));
    })();
  } catch (e) {}

  /* ---------- 2. Ticket : aperçu en direct et copie ---------- */
  try {
    (function () {
      var form = document.getElementById("ticket");
      var apercu = document.getElementById("apercu");
      var prenom = document.getElementById("prenom");
      var envoyer = document.getElementById("envoyer");
      var copierBtn = document.getElementById("copier");
      var statut = document.getElementById("statut");
      if (!form || !apercu) return;
      var champs = {
        jour: apercu.querySelector('[data-champ="jour"]'),
        moment: apercu.querySelector('[data-champ="moment"]'),
        prenom: apercu.querySelector('[data-champ="prenom"]')
      };
      var lignePrenom = apercu.querySelector('[data-ligne="prenom"]');

      function nettoyer(s) {
        return String(s || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30).trim();
      }

      function valeurs() {
        var j = form.querySelector('input[name="jour"]:checked');
        var m = form.querySelector('input[name="moment"]:checked');
        var jour = CFG.a_convenir;
        if (j) jour = j.value + (j.getAttribute("data-rel") ? " " + j.getAttribute("data-rel") : "");
        return { jour: jour, moment: m ? m.value : CFG.a_convenir, prenom: nettoyer(prenom && prenom.value) };
      }

      function message() {
        var v = valeurs();
        var lignes = [CFG.salut, CFG.jour + " : " + v.jour, CFG.moment + " : " + v.moment];
        if (v.prenom) lignes.push(CFG.prenom + " : " + v.prenom);
        lignes.push(CFG.fin);
        return lignes.join("\n");
      }

      function afficher() {
        var v = valeurs();
        ["jour", "moment", "prenom"].forEach(function (k) {
          var b = champs[k];
          if (!b || b.textContent === v[k]) return;
          b.textContent = v[k];
          if (!reduit) {
            b.classList.remove("vient");
            void b.offsetWidth;
            b.classList.add("vient");
          }
        });
        if (lignePrenom) lignePrenom.hidden = !v.prenom;
        dire("");
      }

      function dire(texte) { statut.textContent = texte; }

      function selectionner() {
        try {
          var r = document.createRange();
          r.selectNodeContents(apercu);
          var s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
        } catch (e) {}
      }

      // Repli : sélection de l’aperçu puis execCommand (navigateurs intégrés sans API Clipboard).
      function copieRepli() {
        try {
          selectionner();
          var ok = document.execCommand && document.execCommand("copy");
          if (ok) window.getSelection().removeAllRanges();
          return !!ok;
        } catch (e) {
          return false;
        }
      }

      function reussite() { dire(CFG.statut_ok); }
      function echec() { selectionner(); dire(CFG.statut_echec); }

      // La copie part dans le même geste, sans attendre la promesse : le lien s’ouvre normalement.
      function copier(texte) {
        var cb = navigator.clipboard;
        if (cb && typeof cb.writeText === "function") {
          try {
            cb.writeText(texte).then(reussite, function () { if (copieRepli()) reussite(); else echec(); });
            return;
          } catch (e) { /* repli ci-dessous */ }
        }
        if (copieRepli()) reussite(); else echec();
      }

      form.addEventListener("change", afficher);
      if (prenom) prenom.addEventListener("input", afficher);
      form.addEventListener("submit", function (e) { e.preventDefault(); });
      envoyer.addEventListener("click", function () { copier(message()); });
      copierBtn.addEventListener("click", function () { copier(message()); });
      afficher();
    })();
  } catch (e) {}

  /* ---------- 3a. Vues : l’accueil et « Les coupes » vivent dans ce seul fichier ----------
     Sans JS, :target fait le travail. Avec JS, la classe .sur-coupes suit l’ancre (y compris le bouton Retour). */
  try {
    (function () {
      var html = document.documentElement;
      var vue = document.getElementById("les-coupes");
      if (!vue) return;
      var lienNav = document.querySelector('.entete__nav a[href="#les-coupes"]');
      function cible(h) {
        if (!h || h.length < 2) return null;
        try { return document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) { return null; }
      }
      function dansCoupes(h) {
        var el = cible(h);
        return !!el && (el === vue || vue.contains(el));
      }
      function defiler(h) {
        var el = cible(h);
        if (!el || el === vue || el.id === "haut") window.scrollTo({ top: 0, behavior: "instant" });
        else el.scrollIntoView({ behavior: "instant" });
      }
      function appliquer(h, doitDefiler) {
        var avant = html.classList.contains("sur-coupes");
        var apres = dansCoupes(h);
        html.classList.toggle("sur-coupes", apres);
        if (lienNav) { if (apres) lienNav.setAttribute("aria-current", "page"); else lienNav.removeAttribute("aria-current"); }
        if (doitDefiler && avant !== apres) defiler(h);
        return apres;
      }
      if (appliquer(window.location.hash, false) && window.location.hash === "#les-coupes") defiler("#les-coupes");

      document.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var h = a.getAttribute("href");
        var photo = /^#photo-\d+$/.test(h) ? document.querySelector(h + " .vignette") : null;
        // Vignette de l’accueil : on passe sur « Les coupes » et la visionneuse s’ouvre sur cette photo.
        if (photo && !vue.contains(a)) {
          e.preventDefault();
          try { history.pushState(null, "", "#les-coupes"); } catch (err) {}
          appliquer("#les-coupes", true);
          photo.click();
          return;
        }
        if (dansCoupes(h) === html.classList.contains("sur-coupes")) return; // même vue : navigation ordinaire
        e.preventDefault();
        try { history.pushState(null, "", h); } catch (err) { window.location.hash = h; return; }
        appliquer(h, true);
        var el = cible(h);
        if (el && el.hasAttribute("tabindex")) { try { el.focus({ preventScroll: true }); } catch (err) {} }
      });
      function suivre() { appliquer(window.location.hash, true); }
      window.addEventListener("popstate", suivre);
      window.addEventListener("hashchange", suivre);
    })();
  } catch (e) {}

  /* ---------- 3b. Visionneuse (vue « Les coupes ») ---------- */
  try {
    (function () {
      var dlg = document.getElementById("visionneuse");
      var liens = Array.prototype.slice.call(document.querySelectorAll(".galerie .vignette"));
      if (!dlg || typeof dlg.showModal !== "function" || !liens.length) return;
      var photos = liens.map(function (a) { return a.querySelector("img"); });
      var img = document.getElementById("vis-img");
      var compteur = document.getElementById("vis-compteur");
      var index = 0;
      var origine = null;

      function montrer(i) {
        index = (i + photos.length) % photos.length;
        var source = photos[index];
        img.src = source.currentSrc || source.src;
        img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; // rejoue le fondu à chaque photo
        img.alt = source.alt;
        img.width = source.naturalWidth || source.width;
        img.height = source.naturalHeight || source.height;
        compteur.textContent = (index + 1) + " sur " + photos.length;
      }
      function ouvrir(i) {
        origine = liens[i];
        montrer(i);
        if (!dlg.open) dlg.showModal();
      }
      function sansAncre() {
        if (/^#photo-\d+$/.test(window.location.hash)) {
          try { history.replaceState(null, "", "#les-coupes"); } catch (e) {}
        }
      }

      // Sans JS, chaque lien #photo-N agrandit la photo (:target) ; ici, la visionneuse prend le relais.
      liens.forEach(function (a, i) {
        a.addEventListener("click", function (e) { e.preventDefault(); ouvrir(i); });
      });
      document.getElementById("vis-prec").addEventListener("click", function () { montrer(index - 1); });
      document.getElementById("vis-suiv").addEventListener("click", function () { montrer(index + 1); });
      document.getElementById("vis-fermer").addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); montrer(index - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); montrer(index + 1); }
      });
      dlg.addEventListener("click", function (e) {
        var t = e.target;
        if (t === dlg || (t.classList && (t.classList.contains("visionneuse__cadre") || t.classList.contains("visionneuse__nav") || t.classList.contains("visionneuse__figure")))) dlg.close();
      });
      var x0 = null, y0 = null;
      var fig = dlg.querySelector(".visionneuse__figure");
      fig.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1) { x0 = null; return; }
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, { passive: true });
      fig.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        var dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) montrer(index + (dx < 0 ? 1 : -1));
      }, { passive: true });
      dlg.addEventListener("close", function () {
        sansAncre();
        if (origine) { try { origine.focus({ preventScroll: true }); } catch (e) { origine.focus(); } }
      });

      // Lien direct vers #photo-N (au chargement ou en cours de visite) : la vue « Les coupes » s’affiche et la photo s’ouvre.
      function depuisAncre() {
        var m = /^#photo-(\d+)$/.exec(window.location.hash);
        if (!m || !liens[+m[1] - 1]) return;
        var k = +m[1] - 1;
        sansAncre();
        liens[k].scrollIntoView({ block: "center" });
        ouvrir(k);
      }
      depuisAncre();
      window.addEventListener("hashchange", depuisAncre);
    })();
  } catch (e) {}

  /* ---------- 4. Pastille mobile : un seul rouge d’action visible à la fois ---------- */
  try {
    (function () {
      var pastille = document.getElementById("pastille");
      // Masquée tant qu’un autre appel à l’action est à l’écran (bouton du hero, panneau, contact, carte de fin).
      var cibles = Array.prototype.slice.call(document.querySelectorAll("[data-masque-pastille]"));
      if (!pastille || !("IntersectionObserver" in window) || !cibles.length) return;
      var visibles = new Set();
      function maj() {
        var montrer = visibles.size === 0;
        pastille.classList.toggle("est-visible", montrer);
        pastille.setAttribute("aria-hidden", montrer ? "false" : "true");
        pastille.tabIndex = montrer ? 0 : -1;
      }
      var io = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting) visibles.add(e.target); else visibles.delete(e.target);
        });
        maj();
      });
      cibles.forEach(function (c) { io.observe(c); });
    })();
  } catch (e) {}

  /* ---------- 5. Apparitions au défilement : chaque bloc monte en fondu quand il entre à l’écran ---------- */
  try {
    (function () {
      var html = document.documentElement;
      if (!("IntersectionObserver" in window) || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var sel = [".vitrine > .etiquette", ".vitrine h2", ".vitrine > .chapo", ".vitrine__carte", ".vitrine__photos li",
        ".panneau", ".etapes li", ".ticket", ".rui__carte", ".rui__texte p", ".langues li",
        ".contact > .etiquette", ".contact h2", ".profil", ".separateur",
        ".page-coupes > .etiquette", ".page-coupes__titre", ".page-coupes > .chapo", ".galerie__item", ".suite__carte"].join(",");
      var els = Array.prototype.slice.call(document.querySelectorAll(sel));
      if (!els.length) return;
      els.forEach(function (el) {
        // Décalage en cascade entre frères animés (photos, étapes, langues…)
        var rang = Array.prototype.filter.call(el.parentElement.children, function (c) { return els.indexOf(c) >= 0; }).indexOf(el);
        el.style.setProperty("--rang", Math.min(Math.max(rang, 0), 6));
        el.setAttribute("data-apparition", "");
      });
      html.classList.add("apparitions");
      var io = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("est-apparu"); io.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -6% 0px" });
      // On attend que la police soit prête (page visible) pour que les premières apparitions se voient.
      (function demarrer() {
        if (html.classList.contains("attente")) { window.setTimeout(demarrer, 40); return; }
        els.forEach(function (el) { io.observe(el); });
      })();
    })();
  } catch (e) {}
})();
