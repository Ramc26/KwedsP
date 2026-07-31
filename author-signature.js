/* Author console signature — styled card + clickable portfolio; no network. */
(function (window) {
  "use strict";

  var _k = [0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x44, 0x61, 0x64, 0x64, 0x79];
  var _p = [
    "UmFtIEJpa2tpbmE=",
    "RGVzaWduZXIgwqcgRGV2ZWxvcGVyIPCfkqcgQUkgRW5naW5lZXI=",
    "aHR0cHM6Ly9yYW1idWlsZHMuaW4=",
    "RnJlZWxhbmNlciDCtyBGdWxsLVN0YWNrIEJ1aWxkZXI=",
    "UXVpZXQgY29kZS4gTG91ZCB0YXN0ZS4gQnVpbHQgd2l0aCBjYXJlLg=="
  ];
  var _busy = false;

  function _u(b) {
    try {
      if (typeof atob !== "function") return "";
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(b), function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
    } catch (e) {
      return "";
    }
  }

  function _n() {
    return String.fromCharCode.apply(null, _k);
  }

  function _host(site) {
    return String(site || "")
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "");
  }

  function _meta() {
    var d = _p.map(_u);
    return {
      name: d[0],
      site: d[2],
      line: d[4],
      host: _host(d[2]),
      quoteShort: "Quiet code. Loud taste."
    };
  }

  function projects() {
    console.log(
      "%c✦ projects()%c\n%c• KwedsP — wedding invite experience\n• More at https://rambuilds.in",
      "color:#7dcea0;font-weight:800;font-family:ui-monospace,Menlo,monospace;",
      "",
      "color:#d8dee9;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;line-height:1.7;"
    );
    return ["KwedsP", _meta().host];
  }

  function portfolio() {
    var m = _meta();
    console.log(
      "%c✦ portfolio()\n%cOpen → ",
      "color:#7dcea0;font-weight:800;font-family:ui-monospace,Menlo,monospace;font-size:12px;",
      "color:#d8dee9;font-size:12px;"
    );
    /* Plain URL line — DevTools makes this clickable */
    console.log(m.site);
    return m.site;
  }

  function skills() {
    console.log(
      "%c✦ skills()%c\n%c• Design systems & UI craft\n• Full-stack product builds\n• AI-assisted engineering\n• Performance & polish",
      "color:#7dcea0;font-weight:800;font-family:ui-monospace,Menlo,monospace;",
      "",
      "color:#d8dee9;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;line-height:1.7;"
    );
    return ["Design", "Full-Stack", "AI", "Polish"];
  }

  function hire() {
    var m = _meta();
    console.log(
      "%c✦ hire()%c\n%cAvailable for select freelance work.\n%cStart → ",
      "color:#7dcea0;font-weight:800;font-family:ui-monospace,Menlo,monospace;",
      "",
      "color:#a3be8c;font-size:13px;font-weight:600;",
      "color:#f2b72a;font-size:12px;"
    );
    console.log(m.site);
    return { status: "available", contact: m.site };
  }

  function secret() {
    console.log(
      "%c✦ secret()%c\n%c“%c" +
        _meta().line +
        '%c”\n%cYou found the quiet room.',
      "color:#7dcea0;font-weight:800;font-family:ui-monospace,Menlo,monospace;",
      "",
      "color:#eb6f92;font-size:22px;font-weight:800;",
      "color:#e5e9f0;font-size:14px;font-style:italic;",
      "color:#eb6f92;font-size:22px;font-weight:800;",
      "color:#6b7280;font-size:11px;"
    );
    return true;
  }

  function _attachCommands() {
    var cmds = {
      projects: projects,
      portfolio: portfolio,
      skills: skills,
      hire: hire,
      secret: secret
    };
    Object.keys(cmds).forEach(function (key) {
      if (typeof window[key] === "function") return;
      Object.defineProperty(window, key, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: Object.freeze(cmds[key])
      });
    });
  }

  function _bootCard() {
    var m = _meta();
    var sans =
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
    var serif = 'font-family:Georgia,"Times New Roman",serif;';

    console.log(
      "%c✦ AUTHOR SIGNATURE",
      "color:#f2b72a;font-weight:800;font-size:11px;letter-spacing:0.2em;" + sans
    );

    console.log(
      "%c %c" + m.name + "%c  ⚡",
      "background:linear-gradient(180deg,#f2b72a,#e4a01a 40%,#a855f7);" +
        "padding:22px 3px;border-radius:4px;margin-right:12px;",
      "color:#f2b72a;font-size:28px;font-weight:800;letter-spacing:-0.02em;" +
        serif +
        "padding-left:4px;",
      "color:#f2b72a;font-size:16px;"
    );

    console.log(
      "%c %cDesigner%c • %cDeveloper%c • %cAI Engineer",
      "background:linear-gradient(180deg,#a855f7,#7c3aed);" +
        "padding:12px 3px;border-radius:0 0 4px 4px;margin-right:12px;",
      "color:#d8dee9;font-size:13px;font-weight:500;padding-left:4px;" + sans,
      "color:#f2b72a;font-weight:700;",
      "color:#d8dee9;font-size:13px;font-weight:500;" + sans,
      "color:#f2b72a;font-weight:700;",
      "color:#c4b5fd;font-size:13px;font-weight:600;" + sans
    );

    console.log(
      "%c    ─────────────────────────▶",
      "color:#f2b72a;font-size:11px;font-weight:700;letter-spacing:-0.04em;"
    );

    console.log(
      "%c🌐  %c" + m.host + "%c   ↗  click below",
      "font-size:14px;",
      "color:#7dcea0;font-size:14px;font-weight:700;font-family:ui-monospace,Menlo,monospace;",
      "color:#6b7280;font-size:11px;" + sans
    );
    /* Real URL — Chrome / Edge / Safari DevTools open on click */
    console.log(
      "%c" + m.site,
      "color:#7dcea0;font-size:13px;font-weight:700;font-family:ui-monospace,Menlo,monospace;text-decoration:underline;"
    );

    console.log(
      "%c“%c" + m.quoteShort + "%c”",
      "color:#eb6f92;font-size:24px;font-weight:800;" + serif,
      "color:#e5e9f0;font-size:15px;font-style:italic;font-weight:500;" + serif,
      "color:#eb6f92;font-size:24px;font-weight:800;" + serif
    );

    console.log(
      "%c────────────────────────────────────────",
      "color:#3b4252;font-size:10px;"
    );

    console.log(
      "%c💡 Tip: Type %cprojects()%c to see what I build. 🚀",
      "color:#9aa0a6;font-size:12px;" + sans,
      "color:#7dcea0;font-size:12px;font-weight:700;font-family:ui-monospace,Menlo,monospace;",
      "color:#9aa0a6;font-size:12px;" + sans
    );
  }

  function _sig() {
    var m = _meta();
    if (_busy) {
      return Object.freeze({
        designer: m.name,
        portfolio: m.site,
        roles: ["Freelancer", "AI Engineer", "Full-Stack Builder"],
        commands: ["projects", "portfolio", "skills", "hire", "secret"]
      });
    }

    _busy = true;
    _attachCommands();
    _bootCard();
    _busy = false;

    return Object.freeze({
      designer: m.name,
      portfolio: m.site,
      roles: ["Freelancer", "AI Engineer", "Full-Stack Builder"],
      commands: ["projects", "portfolio", "skills", "hire", "secret"]
    });
  }

  function attachAuthorSignature() {
    if (typeof window === "undefined") return;
    var key = _n();
    if (typeof window[key] === "function") return;

    Object.defineProperty(window, key, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: Object.freeze(_sig)
    });
  }

  function deferAttach() {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(attachAuthorSignature, { timeout: 2500 });
    } else {
      window.setTimeout(attachAuthorSignature, 1200);
    }
  }

  if (document.readyState === "complete") {
    deferAttach();
  } else {
    window.addEventListener("load", deferAttach, { once: true });
  }
})(window);
