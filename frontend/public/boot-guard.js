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
      '<pre style="white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Menlo,monospace;margin:0;padding:10px;border-radius:8px;background:' +
      (dark ? "#141B20" : "#EBF1F3") + '"></pre></div>';
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
    if (!box && document.body && ((errors.length && seconds >= 4) || seconds >= 25)) show();
  }, 1000);
})();
