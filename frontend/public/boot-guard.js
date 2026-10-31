/* Shown when the app cannot start, instead of a blank white page.
 *
 * Deliberately plain ES5 in its own file: it has to run in exactly the browsers the app's own
 * bundle fails in (an old iPhone, a broken cache), and the site's CSP only allows scripts from
 * its own origin. React fills #root within a second or two; if it is still empty long after
 * that — or something threw and it is still empty a few seconds later — this says so, in
 * Dutch, with the errors it saw so a screenshot is enough to diagnose. It disappears again if
 * the app does start after all (a slow connection is not a failure). */
(function () {
  var errors = [];
  var startedAt = new Date().getTime();
  var box = null;
  // Same list as src/constants/chemistryJokes.ts; this file can't import it.
  var jokes = [
    "Waarom heeft de bioloog het uitgemaakt met de natuurkundige? Ze hadden geen chemie.",
    "Waar zijn de virussen gebleven? Ze griep weg.",
    "Een heliumatoom loopt een bar binnen. De barman zegt: \"Sorry, we schenken geen edelgas.\" Het heliumatoom reageert niet.",
    "Wat gebeurt er als elektronen hun energie verliezen? Ze krijgen Bohr'ed.",
    "Waarom maakte de fractie zich zorgen over het trouwen met de komma? Omdat hij zich zou moeten bekeren.",
    "Wat is het favoriete type wiskunde van een vogel? OWL-gebra.",
    "Waarom was de meetkundeleraar niet op school? Omdat ze haar hoek verstuikte!!",
    "Waarom loste de ijsbeer op in water? Omdat hij polair was!",
    "Wat moet je doen met een dode scheikundige? Barium!"
  ];

  function note(text) {
    if (errors.length < 6 && text) errors.push(String(text).slice(0, 300));
  }

  window.addEventListener("error", function (e) {
    var where = e.filename ? " (" + String(e.filename).split("/").pop() + ":" + (e.lineno || 0) + ")" : "";
    note((e.message || "Fout") + where);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    note("Belofte geweigerd: " + (r && r.message ? r.message : r));
  });

  function appStarted() {
    var root = document.getElementById("root");
    return !!root && root.childNodes.length > 0;
  }

  // A copy of the app that will not start is often the phone's own stale one (an old shell asking for scripts that are gone,
  // or a worker that left the page waiting). Starting over without it is what pulling the page down does by hand, so it is
  // done once before the message below: the worker and its caches are removed and the page is loaded again. Remembered for
  // ten minutes, so a phone that really cannot start gets the message instead of a loop of reloads.
  var RECOVER_KEY = "ankerd-boot-recovered";
  var recovering = false;
  function recoveredRecently() {
    try {
      var at = Number(sessionStorage.getItem(RECOVER_KEY));
      return !!at && new Date().getTime() - at < 10 * 60 * 1000;
    } catch (e) {
      return true; // no storage to remember it in: never risk a loop
    }
  }
  function recover() {
    try {
      sessionStorage.setItem(RECOVER_KEY, String(new Date().getTime()));
    } catch (e) {
      return false;
    }
    recovering = true;
    var work = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        work.push(
          navigator.serviceWorker.getRegistrations().then(function (list) {
            return Promise.all(list.map(function (r) { return r.unregister(); }));
          }),
        );
      }
      if (window.caches && window.caches.keys) {
        work.push(
          window.caches.keys().then(function (names) {
            return Promise.all(names.map(function (n) { return window.caches.delete(n); }));
          }),
        );
      }
    } catch (e) {
      // carry on with whatever could be started
    }
    var done = false;
    function reload() {
      if (done) return;
      done = true;
      window.location.reload();
    }
    setTimeout(reload, 4000); // whatever is stuck must not hold the reload back
    if (window.Promise) window.Promise.all(work).then(reload, reload);
    else reload();
    return true;
  }

  function show() {
    if (box) return;
    var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    box = document.createElement("div");
    box.setAttribute("role", "alert");
    box.style.cssText =
      "position:fixed;left:0;right:0;top:0;bottom:0;z-index:2147483647;overflow:auto;padding:24px 20px;" +
      "font:15px/1.5 -apple-system,system-ui,Segoe UI,sans-serif;" +
      "background:" + (dark ? "#0D1216" : "#F5F8F9") + ";color:" + (dark ? "#E6F0F3" : "#0F1519") + ";";
    var details = errors.length ? errors.join("\n") : "Geen foutmelding ontvangen";
    box.innerHTML =
      '<div style="max-width:420px;margin:0 auto">' +
      '<h1 style="font-size:22px;margin:0 0 8px">Ankerd Con kan niet starten</h1>' +
      '<p style="margin:0 0 12px">Dit gebeurt meestal door een verouderde iOS- of browserversie, of een ' +
      "verouderde opgeslagen kopie van de site. Probeer het volgende:</p>" +
      '<ol style="margin:0 0 12px;padding-left:20px">' +
      "<li>Sluit de app of het tabblad helemaal en open de site opnieuw.</li>" +
      "<li>iPhone: Instellingen → Safari → Wis geschiedenis en websitegegevens.</li>" +
      "<li>Update iOS (Instellingen → Algemeen → Software-update) en gebruik Safari in plaats van een ander programma.</li>" +
      "</ol>" +
      '<p style="margin:0 0 12px">Werkt het nog steeds niet? Stuur een screenshot van dit scherm naar een beheerder.</p>' +
      '<p class="joke" style="margin:0 0 12px;font-size:13px;opacity:.65"></p>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Menlo,monospace;margin:0;padding:10px;border-radius:8px;background:' +
      (dark ? "#141B20" : "#EBF1F3") + '"></pre></div>';
    var joke = box.getElementsByTagName("p");
    joke[joke.length - 1].appendChild(
      document.createTextNode("Scheikundemop: " + jokes[Math.floor(Math.random() * jokes.length)]),
    );
    var pre = box.getElementsByTagName("pre")[0];
    pre.appendChild(
      document.createTextNode(details + "\n\n" + navigator.userAgent + "\n" + window.innerWidth + "x" + window.innerHeight),
    );
    document.body.appendChild(box);
  }

  function hide() {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null;
  }

  var timer = setInterval(function () {
    var seconds = (new Date().getTime() - startedAt) / 1000;
    if (appStarted()) {
      hide();
      // Started: stop watching once it has had a moment to settle.
      if (seconds > 30) clearInterval(timer);
      return;
    }
    if (box || recovering || !document.body) return;
    var failed = errors.length && seconds >= 4;
    // Nothing started and nothing said for 20 seconds is a request that hangs: try starting over once before giving up.
    if ((failed || seconds >= 20) && !recoveredRecently() && recover()) return;
    if (failed || seconds >= 25) show();
  }, 1000);
})();
