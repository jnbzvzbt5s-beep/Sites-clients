/* Rui’s Barber Studio — trois modules indépendants, chacun dans son try/catch. */
(function () {
  "use strict";
  var CFG = {{jsconfig}};
  var NBSP = " ";
  var reduit = false;
  try { reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- 1. Module de rendez-vous ---------- */
  try {
    (function () {
      var form = document.getElementById("module");
      var jours = document.getElementById("jours");
      var apercu = document.getElementById("apercu");
      var prenom = document.getElementById("prenom");
      var envoyer = document.getElementById("envoyer");
      var copierBtn = document.getElementById("copier");
      var statut = document.getElementById("statut");
      if (!form || !jours || !apercu) return;

      var TZ = "Europe/Luxembourg";
      var JOUR_MS = 86400000;

      // « Aujourd’hui » à l’heure du Luxembourg, ou fixé par ?date=AAAA-MM-JJ (tests).
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
        // Midi UTC : toujours le même jour civil au Luxembourg (UTC+1 ou UTC+2).
        return Date.UTC(+p.year, +p.month - 1, +p.day, 12);
      }

      var fmtLong = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
      var fmtCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

      function formater(fmt, t) {
        var p = {};
        fmt.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
        var jour = p.day === "1" ? "1er" : p.day;
        return p.weekday + " " + jour + " " + p.month;
      }

      function puce(nom, valeur, texte, detail) {
        var label = document.createElement("label");
        label.className = "puce";
        var input = document.createElement("input");
        input.type = "radio";
        input.name = nom;
        input.value = valeur;
        var span = document.createElement("span");
        span.appendChild(document.createTextNode(texte));
        if (detail) {
          var small = document.createElement("small");
          small.textContent = detail;
          span.appendChild(small);
        }
        label.appendChild(input);
        label.appendChild(span);
        return label;
      }

      var base = aujourdhui();
      for (var i = 0; i < 7; i++) {
        var t = base + i * JOUR_MS;
        var long = formater(fmtLong, t);
        var court = formater(fmtCourt, t);
        var el;
        if (i === 0) el = puce("jour", long, "Aujourd’hui", court);
        else if (i === 1) el = puce("jour", long, "Demain", court);
        else el = puce("jour", long, court, null);
        el.querySelector("input").setAttribute("data-date", new Date(t).toISOString().slice(0, 10));
        jours.appendChild(el);
      }
      jours.appendChild(puce("jour", "peu importe", "Peu importe", null));

      function choix(nom) {
        var c = form.querySelector('input[name="' + nom + '"]:checked');
        return c ? c.value : null;
      }

      function nettoyer(s) {
        return String(s || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
      }

      function message() {
        var lignes = [
          "Bonjour " + CFG.barbier + NBSP + "! Je voudrais un rendez-vous pour une " + CFG.prestation + ".",
          "Jour" + NBSP + ": " + (choix("jour") || "peu importe"),
          "Moment" + NBSP + ": " + (choix("moment") || "je suis flexible")
        ];
        var p = nettoyer(prenom && prenom.value);
        if (p) lignes.push("Prénom" + NBSP + ": " + p);
        lignes.push("Merci" + NBSP + "!");
        return lignes.join("\n");
      }

      function afficher(anime) {
        var m = message();
        if (apercu.value === m) return;
        apercu.value = m;
        apercu.rows = m.split("\n").length;
        ajuster();
        if (anime && !reduit) {
          apercu.classList.remove("apercu--maj");
          void apercu.offsetWidth;
          apercu.classList.add("apercu--maj");
        }
        dire("", false);
      }

      // Le champ prend la hauteur exacte du message (aucune barre de défilement).
      function ajuster() {
        apercu.style.height = "auto";
        apercu.style.height = (apercu.scrollHeight + 2) + "px";
      }
      window.addEventListener("resize", ajuster);

      function dire(texte, erreur) {
        statut.textContent = texte;
        statut.classList.toggle("est-erreur", !!erreur);
        // Le message de résultat ne doit jamais rester caché sous la barre d’action.
        if (texte) {
          try { statut.scrollIntoView({ block: "nearest", behavior: reduit ? "auto" : "smooth" }); } catch (e) {}
        }
      }

      // Repli : sélection du champ + execCommand (navigateurs intégrés sans API Clipboard).
      function copieRepli() {
        try {
          apercu.focus({ preventScroll: true });
          apercu.select();
          apercu.setSelectionRange(0, apercu.value.length);
          var ok = document.execCommand && document.execCommand("copy");
          return !!ok;
        } catch (e) {
          return false;
        }
      }

      function copier(texte) {
        var cb = navigator.clipboard;
        if (cb && typeof cb.writeText === "function") {
          try {
            return cb.writeText(texte).then(function () { return true; }, function () { return copieRepli(); });
          } catch (e) { /* on tente le repli */ }
        }
        return Promise.resolve(copieRepli());
      }

      function resultat(ok) {
        if (ok) {
          dire("Message copié" + NBSP + ": collez-le dans la conversation.", false);
        } else {
          dire("Copie impossible" + NBSP + ": sélectionnez le message et copiez-le.", true);
          try { apercu.focus({ preventScroll: true }); apercu.select(); } catch (e) {}
        }
      }

      form.addEventListener("change", function () { afficher(true); });
      if (prenom) prenom.addEventListener("input", function () { afficher(true); });
      form.addEventListener("submit", function (e) { e.preventDefault(); });

      // Le lien reste un vrai lien : la copie ne bloque jamais l’ouverture d’Instagram.
      envoyer.addEventListener("click", function () {
        var m = message();
        copier(m).then(resultat, function () { resultat(false); });
      });
      copierBtn.addEventListener("click", function () {
        copier(message()).then(resultat, function () { resultat(false); });
      });

      form.hidden = false;
      afficher(false);
      ajuster();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
    })();
  } catch (e) {
    try { document.getElementById("module").hidden = true; } catch (x) {}
  }

  /* ---------- 2. Visionneuse ---------- */
  try {
    (function () {
      var dlg = document.getElementById("visionneuse");
      var vignettes = Array.prototype.slice.call(document.querySelectorAll(".vignette"));
      if (!dlg || typeof dlg.showModal !== "function" || !vignettes.length) {
        vignettes.forEach(function (v) { v.style.cursor = "default"; });
        return;
      }
      var img = document.getElementById("vis-img");
      var legende = document.getElementById("vis-legende");
      var compteur = document.getElementById("vis-compteur");
      var index = 0;
      var origine = null;

      function montrer(i) {
        index = (i + vignettes.length) % vignettes.length;
        var source = vignettes[index].querySelector("img");
        img.src = source.currentSrc || source.src;
        img.alt = source.alt;
        img.width = source.naturalWidth || source.width;
        img.height = source.naturalHeight || source.height;
        legende.textContent = vignettes[index].getAttribute("data-legende") || "";
        compteur.textContent = (index + 1) + " sur " + vignettes.length;
      }

      vignettes.forEach(function (v, i) {
        v.addEventListener("click", function () {
          origine = v;
          montrer(i);
          dlg.showModal();
        });
      });

      document.getElementById("vis-prec").addEventListener("click", function () { montrer(index - 1); });
      document.getElementById("vis-suiv").addEventListener("click", function () { montrer(index + 1); });
      document.getElementById("vis-fermer").addEventListener("click", function () { dlg.close(); });

      dlg.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); montrer(index - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); montrer(index + 1); }
      });

      // Toucher hors de la photo : ferme.
      dlg.addEventListener("click", function (e) {
        var t = e.target;
        if (t === dlg || (t.classList && (t.classList.contains("visionneuse__cadre") || t.classList.contains("visionneuse__nav") || t.classList.contains("visionneuse__figure")))) {
          dlg.close();
        }
      });

      // Balayage au doigt.
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

  /* ---------- 3. Défilement doux vers les ancres ---------- */
  try {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      var cible = id ? document.getElementById(id) : null;
      if (!cible) return;
      e.preventDefault();
      if (id === "haut") {
        window.scrollTo({ top: 0, behavior: reduit ? "auto" : "smooth" });
      } else {
        cible.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
        if (cible.hasAttribute("tabindex")) {
          try { cible.focus({ preventScroll: true }); } catch (x) {}
        }
      }
      try { history.replaceState(null, "", "#" + id); } catch (x) {}
    });
  } catch (e) {}
})();
