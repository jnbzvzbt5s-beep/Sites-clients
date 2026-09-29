/* Rui’s Barber Studio — quatre modules indépendants (dates, ticket, visionneuse, pastille), chacun dans son try/catch. */
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

  /* ---------- 3. Visionneuse ---------- */
  try {
    (function () {
      var dlg = document.getElementById("visionneuse");
      var photos = Array.prototype.slice.call(document.querySelectorAll(".galerie .photo img"));
      if (!dlg || typeof dlg.showModal !== "function" || !photos.length) return;
      var img = document.getElementById("vis-img");
      var compteur = document.getElementById("vis-compteur");
      var index = 0;
      var origine = null;
      var boutons = [];

      function montrer(i) {
        index = (i + photos.length) % photos.length;
        var source = photos[index];
        img.src = source.currentSrc || source.src;
        img.alt = source.alt;
        img.width = source.naturalWidth || source.width;
        img.height = source.naturalHeight || source.height;
        compteur.textContent = (index + 1) + " sur " + photos.length;
      }

      // Sans JS, les vignettes restent de simples images ; ici, chacune devient un bouton.
      photos.forEach(function (p, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "vignette";
        b.setAttribute("aria-haspopup", "dialog");
        b.setAttribute("aria-label", "Agrandir la photo " + (i + 1) + " sur " + photos.length + " : " + p.alt);
        p.parentNode.insertBefore(b, p);
        b.appendChild(p);
        b.addEventListener("click", function () {
          origine = b;
          montrer(i);
          dlg.showModal();
        });
        boutons.push(b);
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
        if (origine) { try { origine.focus({ preventScroll: true }); } catch (e) { origine.focus(); } }
      });
    })();
  } catch (e) {}

  /* ---------- 4. Pastille mobile : un seul rouge d’action visible à la fois ---------- */
  try {
    (function () {
      var pastille = document.getElementById("pastille");
      // Masquée tant que le bouton du hero, le panneau ou les boutons du contact sont à l’écran.
      var cibles = [document.getElementById("cta-heros"), document.querySelector(".panneau"), document.querySelector(".profil__boutons")];
      if (!pastille || !("IntersectionObserver" in window) || !cibles[0] || !cibles[1]) return;
      cibles = cibles.filter(Boolean);
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
})();
