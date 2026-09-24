/* ---------- Démarrage : chaque module dans son try/catch ---------- */
SM.mods.forEach(function(m){try{m[1]()}catch(e){if(window.console)console.warn('Module '+m[0]+' :',e)}});
})();
