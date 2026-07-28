$(function () {
  var data = null;
  var muted = true;

  var $gate = $("#gate");
  var $audio = $("#bgAudio");
  var $mute = $("#muteBtn");
  var audioEl = $audio[0];
  var $blessings = $("#blessingsBar");
  var $blessingsStage = $("#blessingsStage");
  var iconTimer = null;
  var heroIcons = [
    "/hero-icons/web/icon1.png",
    "/hero-icons/web/icon2.png",
    "/hero-icons/web/icon3.png",
    "/hero-icons/web/icon4.png",
    "/hero-icons/web/icon5.png",
    "/hero-icons/web/icon6.png",
    "/hero-icons/web/icon7.png"
  ];
  var iconIndex = 0;
  var iconTurn = 0;
  var inviteType = "full";

  if (audioEl) {
    audioEl.muted = true;
  }

  /** Root-absolute paths so /i/... invite URLs still load assets. */
  function assetUrl(path) {
    if (!path) return "";
    if (/^(https?:|data:|blob:)/i.test(path) || path.charAt(0) === "/") return path;
    return "/" + path;
  }

  function cssUrl(path) {
    var u = assetUrl(path);
    // Single quotes inside url() — safe in style="..." HTML attributes.
    return u ? "url('" + String(u).replace(/'/g, "%27") + "')" : "";
  }

  function resolveInviteCode(d) {
    var modes = (d && d.inviteModes) || {};
    var codes = modes.codes || {};
    var paramName = modes.param || "c";

    if (window.__KWEDS_INVITE_CODE__) {
      var forced = String(window.__KWEDS_INVITE_CODE__).toLowerCase();
      if (codes[forced]) return { code: forced, type: codes[forced] };
    }

    var params = new URLSearchParams(window.location.search);
    var q = String(params.get(paramName) || params.get("code") || "").toLowerCase();
    if (q && codes[q]) return { code: q, type: codes[q] };

    var path = String(window.location.pathname || "")
      .replace(/\/+$/, "")
      .toLowerCase();
    var match = path.match(/\/i\/([a-z0-9-]+)$/);
    if (match && codes[match[1]]) {
      return { code: match[1], type: codes[match[1]] };
    }

    // Legacy private HTML entry (reception.html) still works via forced code
    if (window.__KWEDS_INVITE__ === "reception") {
      var rx = Object.keys(codes).find(function (k) {
        return codes[k] === "reception";
      });
      if (rx) return { code: rx, type: "reception" };
    }
    if (window.__KWEDS_INVITE__ === "full") {
      var full = Object.keys(codes).find(function (k) {
        return codes[k] === "full";
      });
      if (full) return { code: full, type: "full" };
    }

    return { code: null, type: null };
  }

  function getInviteType(d) {
    return resolveInviteCode(d).type;
  }

  function showInviteLocked() {
    $("body").attr("data-invite", "locked").addClass("invite-locked");
    $("#gateMood").prop("hidden", true);
    setField("welcome.sanskrit", "॥ शुभम् ॥");
    setField("welcome.title", "Swagatam");
    setField("welcome.telugu", "స్వాగతం");
    setField("welcome.greeting", "Please open the personal invite link shared with you to continue.");
    $("#openInvitation")
      .prop("disabled", true)
      .text("Invite link required")
      .addClass("is-disabled");
    $("#gate").attr("aria-hidden", "false").removeClass("is-open");
    $("body").addClass("is-locked");
  }

  function applyInviteMode(raw) {
    var d = $.extend(true, {}, raw);
    var access = resolveInviteCode(d);
    inviteType = access.type;
    var modes = d.inviteModes || {};
    var mode = (inviteType && modes[inviteType]) || null;

    d.inviteType = inviteType;
    d.inviteCode = access.code;

    if (!inviteType || !mode) {
      d.inviteLocked = true;
      return d;
    }

    d.inviteLocked = false;

    if (mode.meta) {
      d.meta = $.extend({}, d.meta || {}, mode.meta);
    }
    if (mode.description) d.description = mode.description;
    if (mode.brand) d.brand = mode.brand;
    if (mode.datetime) d.datetime = mode.datetime;
    if (mode.dateLabel) d.dateLabel = mode.dateLabel;
    if (mode.muhurtham) d.muhurtham = mode.muhurtham;
    if (mode.venuesSummary) d.venuesSummary = mode.venuesSummary;
    if (mode.venuesPanelLead) d.venuesPanelLead = mode.venuesPanelLead;
    if (mode.timelineTitle) d.timelineTitle = mode.timelineTitle;
    if (mode.whenKicker) d.whenKicker = mode.whenKicker;
    if (mode.whenTitle) d.whenTitle = mode.whenTitle;
    if (mode.gateBtn) d.gateBtn = mode.gateBtn;
    if (mode.gateImage) d.gateImage = mode.gateImage;
    if (mode.gateImageAlt) d.gateImageAlt = mode.gateImageAlt;
    if (mode.shareImage) {
      d.meta = d.meta || {};
      d.meta.shareImage = mode.shareImage;
    }
    if (mode.heroImage) {
      d.images = $.extend({}, d.images || {});
      d.images.hero = mode.heroImage;
    }
    d.showWeddingVenue = mode.showWeddingVenue !== false;
    d.showTimeline = mode.showTimeline !== false;
    d.calendarTitleSuffix = mode.calendarTitleSuffix || d.brand;
    d.calendarLocationKey = mode.calendarLocationKey || "venue";

    if (mode.welcome) {
      d.welcome = $.extend({}, d.welcome || {}, mode.welcome);
    }
    if (mode.invitation) {
      d.invitation = $.extend({}, d.invitation || {}, mode.invitation);
    }

    d.celebrations = (d.celebrations || []).filter(function (ev) {
      var list = ev.invite || ["full", "reception"];
      return list.indexOf(inviteType) !== -1;
    });
    if (inviteType === "reception") {
      d.celebrations = d.celebrations.map(function (ev, i) {
        var copy = $.extend({}, ev);
        copy.highlight = i === 0;
        return copy;
      });
    }

    if (mode.useReceptionTimeline && d.receptionTimeline) {
      d.timeline = d.receptionTimeline;
    }

    if (mode.familyMessages && d.familyInvites) {
      d.familyInvites = d.familyInvites.map(function (f) {
        var copy = $.extend({}, f);
        var side = String(f.side || "").toLowerCase();
        if (side.indexOf("groom") !== -1 && mode.familyMessages.groom) {
          copy.message = mode.familyMessages.groom;
        }
        if (side.indexOf("bride") !== -1 && mode.familyMessages.bride) {
          copy.message = mode.familyMessages.bride;
        }
        return copy;
      });
    }

    $("body")
      .attr("data-invite", inviteType)
      .toggleClass("invite-reception", inviteType === "reception")
      .toggleClass("invite-full", inviteType === "full");

    return d;
  }

  function setField(path, value) {
    if (value == null || value === "") return;
    $('[data-field="' + path + '"]').text(value);
  }

  function applyMeta(d) {
    var m = d.meta || {};
    var site = (d.siteUrl || window.location.origin || "").replace(/\/$/, "");
    var tabTitle = m.tabTitle || "K♥P";
    var headline = m.shareHeadline || d.title || tabTitle;
    var tagline = m.tagline || d.description || "";
    var imgPath = m.shareImage || "og-preview.jpg";
    var imgUrl = /^https?:\/\//i.test(imgPath)
      ? imgPath
      : site + "/" + String(imgPath).replace(/^\//, "") + "?v=2";
    var pageUrl = site ? site + "/" : window.location.href;
    if (d.inviteCode && site) {
      pageUrl = site + "/i/" + d.inviteCode;
    }
    var keywords = (d.keywords || []).join(", ");

    document.title = tabTitle;
    $('meta[name="description"]').attr("content", tagline);
    if (keywords) $('meta[name="keywords"]').attr("content", keywords);
    $('meta[name="theme-color"]').attr("content", m.themeColor || "#6b1d2a");
    $('meta[name="apple-mobile-web-app-title"]').attr("content", tabTitle);
    $('meta[name="application-name"]').attr("content", tabTitle);

    $("#canonicalUrl").attr("href", pageUrl);

    $('meta[property="og:site_name"]').attr("content", m.siteName || headline);
    $('meta[property="og:locale"]').attr("content", m.locale || "en_IN");
    $('meta[property="og:url"]').attr("content", pageUrl);
    $('meta[property="og:title"]').attr("content", headline);
    $('meta[property="og:description"]').attr("content", tagline);
    $('meta[property="og:image"]').attr("content", imgUrl);
    $('meta[property="og:image:secure_url"]').attr("content", imgUrl);
    $('meta[property="og:image:alt"]').attr(
      "content",
      (d.groom && d.bride ? d.groom.displayName + " & " + d.bride.displayName : "Wedding") +
        " invitation collage"
    );
    $('meta[name="twitter:title"]').attr("content", headline);
    $('meta[name="twitter:description"]').attr("content", tagline);
    $('meta[name="twitter:image"]').attr("content", imgUrl);
    $('meta[name="twitter:image:alt"]').attr(
      "content",
      (d.groom && d.bride ? d.groom.displayName + " & " + d.bride.displayName : "Wedding") +
        " invitation"
    );
  }

  function fillStatic(d) {
    applyMeta(d);

    setField("brand", d.brand);
    setField("welcome.sanskrit", d.welcome && d.welcome.sanskrit);
    setField("welcome.title", d.welcome && d.welcome.title);
    setField("welcome.telugu", d.welcome && d.welcome.telugu);
    setField("welcome.greeting", d.welcome && d.welcome.greeting);
    if (d.gateBtn) {
      $("#openInvitation").text(d.gateBtn);
    }
    if (d.whenKicker) {
      $("#whenKicker").text(d.whenKicker);
    }
    if (d.whenTitle) {
      $("#whenTitle").text(d.whenTitle);
    }
    if (d.gateImage) {
      $("#gateMoodImg")
        .attr("src", assetUrl(d.gateImage))
        .attr("alt", d.gateImageAlt || "");
      $("#gateMood").prop("hidden", false);
    } else {
      $("#gateMood").prop("hidden", true);
    }
    setField("navigation.brand", d.navigation && d.navigation.brand);
    setField("groom.displayName", d.groom && d.groom.displayName);
    setField("bride.displayName", d.bride && d.bride.displayName);
    setField("dateLabel", d.dateLabel);
    setField("muhurtham", d.muhurtham);
    setField("groom.fullName", d.groom && d.groom.fullName);
    setField("groom.role", d.groom && d.groom.role);
    setField("groom.father", d.groom && d.groom.father);
    setField("groom.mother", d.groom && d.groom.mother);
    setField("groom.family", d.groom && d.groom.family);
    setField("bride.fullName", d.bride && d.bride.fullName);
    setField("bride.role", d.bride && d.bride.role);
    setField("bride.father", d.bride && d.bride.father);
    setField("bride.mother", d.bride && d.bride.mother);
    setField("bride.family", d.bride && d.bride.family);
    setField("venuesSummary", d.venuesSummary);
    if (d.venuesPanelLead) {
      $("#venuesPanelLead").text(d.venuesPanelLead);
    }
    if (d.timelineTitle) {
      $("#timelineTitle").text(d.timelineTitle);
    }
    $("#weddingVenueCard").toggle(!!d.showWeddingVenue);
    $("#timelineWrap").toggle(!!d.showTimeline && !!(d.timeline && d.timeline.length));

    var $rxMeta = $("#receptionEventMeta");
    if (inviteType === "reception" && d.celebrations && d.celebrations[0]) {
      var ev = d.celebrations[0];
      $rxMeta
        .text(ev.day + " · " + ev.date + " · " + ev.time)
        .prop("hidden", false)
        .addClass("is-visible");
    } else {
      $rxMeta.prop("hidden", true).removeClass("is-visible").text("");
    }

    setField("venue.label", d.venue && d.venue.label);
    setField("venue.fullAddress", d.venue && d.venue.fullAddress);
    setField("venue.name", d.venue && d.venue.name);
    setField("venueInfo.directions", d.venueInfo && d.venueInfo.directions);
    setField("venueInfo.parking", d.venueInfo && d.venueInfo.parking);
    setField("receptionVenue.label", d.receptionVenue && d.receptionVenue.label);
    setField("receptionVenue.name", d.receptionVenue && d.receptionVenue.name);
    setField("receptionVenue.fullAddress", d.receptionVenue && d.receptionVenue.fullAddress);
    setField("receptionVenueInfo.directions", d.receptionVenueInfo && d.receptionVenueInfo.directions);
    setField("receptionVenueInfo.parking", d.receptionVenueInfo && d.receptionVenueInfo.parking);
    setField("invitation.title", d.invitation && d.invitation.title);

    if (d.invitation && d.invitation.paragraphs) {
      if (d.invitation.paragraphs[0]) $("#inviteP1").text(d.invitation.paragraphs[0]);
      if (d.invitation.paragraphs[1]) $("#inviteP2").text(d.invitation.paragraphs[1]);
    }

    if (d.venueInfo && d.venueInfo.travel) {
      $("#venueTravel").text(d.venueInfo.travel);
    }
    if (d.receptionVenueInfo && d.receptionVenueInfo.travel) {
      $("#receptionTravel").text(d.receptionVenueInfo.travel);
    }

    if (d.images) {
      if (d.images.hero) {
        $("#heroMedia")
          .css("background-image", cssUrl(d.images.hero))
          .attr(
            "aria-label",
            inviteType === "reception" ? "Reception atmosphere" : "Wedding atmosphere"
          );
      }
      if (d.images.coupleGroom) {
        $("#groomPhoto").css("background-image", cssUrl(d.images.coupleGroom));
      }
      if (d.images.coupleBride) {
        $("#bridePhoto").css("background-image", cssUrl(d.images.coupleBride));
      }
      if (d.images.venue) {
        $("#venuePhoto").css("background-image", cssUrl(d.images.venue));
      }
      var receptionPhoto =
        inviteType === "reception"
          ? d.gateImage || d.images.receptionMood || (d.images.gallery && d.images.gallery[1])
          : d.images.receptionMood || (d.images.gallery && d.images.gallery[1]);
      if (receptionPhoto) {
        $("#receptionVenuePhoto").css("background-image", cssUrl(receptionPhoto));
      }
    }

    if (d.music && d.music.src) {
      $audio.attr("src", assetUrl(d.music.src));
    }

    if (d.venue && d.venue.mapsUrl) {
      $("#mapsLink").attr("href", d.venue.mapsUrl);
    }
    if (d.venue && d.venue.mapsEmbed) {
      $("#mapsEmbed").attr("src", d.venue.mapsEmbed);
    }
    if (d.receptionVenue && d.receptionVenue.mapsUrl) {
      $("#receptionMapsLink").attr("href", d.receptionVenue.mapsUrl);
    }
    if (d.receptionVenue && d.receptionVenue.mapsEmbed) {
      $("#receptionMapsEmbed").attr("src", d.receptionVenue.mapsEmbed);
    }
  }

  function buildNav(d) {
    var items = (d.navigation && d.navigation.items) || [];
    var $ul = $("#navLinks").empty();
    items.forEach(function (item) {
      $ul.append('<li><a href="' + item.href + '">' + item.label + "</a></li>");
    });
  }

  function buildEvents(d) {
    var $rail = $("#eventsRail").empty();
    (d.celebrations || []).forEach(function (ev) {
      var maps =
        ev.mapsUrl
          ? '<a class="text-link event-maps" href="' +
            ev.mapsUrl +
            '" target="_blank" rel="noopener noreferrer">View on Maps <i class="bi bi-arrow-up-right"></i></a>'
          : "";
      $rail.append(
        '<article class="event-item reveal ' + (ev.highlight ? "is-highlight" : "") + '">' +
          '<div class="event-icon">' + (ev.icon || "") + "</div>" +
          "<h3>" + ev.title + "</h3>" +
          '<p class="event-meta">' + ev.day + " · " + ev.date + " · " + ev.time + "</p>" +
          "<p>" + ev.description + "</p>" +
          "<p>" + ev.location + "</p>" +
          maps +
        "</article>"
      );
    });
  }

  function buildTimeline(d) {
    var $tl = $("#timeline").empty();
    (d.timeline || []).forEach(function (item) {
      $tl.append(
        '<li class="' + (item.highlight ? "is-highlight" : "") + '">' +
          '<div class="timeline-time">' + item.time + "</div>" +
          "<h4>" + (item.icon || "") + " " + item.title + "</h4>" +
          "<p>" + item.description + "</p>" +
        "</li>"
      );
    });
  }

  function buildGallery(d) {
    var images = (d.images && d.images.gallery) || [];
    var $inner = $("#galleryInner").empty();
    images.forEach(function (src, i) {
      $inner.append(
        '<div class="carousel-item ' + (i === 0 ? "active" : "") + '">' +
          '<img src="' + assetUrl(src) + '" alt="Celebration moment ' + (i + 1) + '" loading="lazy">' +
        "</div>"
      );
    });
  }

  function buildFamily(d) {
    var $grid = $("#familyGrid").empty();
    (d.familyInvites || []).forEach(function (f) {
      var photo = f.image
        ? '<div class="family-photo" style="background-image:' + cssUrl(f.image) + '"></div>'
        : "";
      $grid.append(
        '<article class="family-item reveal">' +
          photo +
          '<p class="family-side">' + f.side + "</p>" +
          "<h3>" + f.names + "</h3>" +
          "<p>" + f.message + "</p>" +
          '<p class="person-family">' + (f.family || "") + "</p>" +
        "</article>"
      );
    });
  }

  function buildContacts(d) {
    var $grid = $("#contactGrid").empty();
    var sides = [];
    if (d.contacts && d.contacts.groomSide) sides.push(d.contacts.groomSide);
    if (d.contacts && d.contacts.brideSide) sides.push(d.contacts.brideSide);
    sides.forEach(function (c) {
      $grid.append(
        '<article class="contact-item reveal">' +
          '<p class="label">' + c.label + "</p>" +
          "<h3>" + c.name + "</h3>" +
          '<p><a href="' + c.phoneHref + '">' + c.phone + "</a></p>" +
          "<p>" + (c.location || "") + "</p>" +
          '<a class="wa-btn" href="' + c.whatsapp + '" target="_blank" rel="noopener noreferrer">' +
            '<i class="bi bi-whatsapp"></i> WhatsApp' +
          "</a>" +
        "</article>"
      );
    });
  }

  function toGoogleDate(date) {
    function pad(n) {
      return String(n).padStart(2, "0");
    }
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      "T" +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      "Z"
    );
  }

  function buildCalendar(d) {
    var start = new Date(d.datetime);
    if (isNaN(start.getTime())) return;

    var end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    var names =
      ((d.groom && d.groom.displayName) || "") +
      " & " +
      ((d.bride && d.bride.displayName) || "");
    var title = encodeURIComponent(
      names + " — " + (d.calendarTitleSuffix || d.brand || "Wedding")
    );
    var details = encodeURIComponent(d.description || "");
    var locObj =
      d.calendarLocationKey === "receptionVenue" ? d.receptionVenue : d.venue;
    var location = encodeURIComponent((locObj && locObj.fullAddress) || "");
    var dates = toGoogleDate(start) + "/" + toGoogleDate(end);

    var googleUrl =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + title +
      "&dates=" + dates +
      "&details=" + details +
      "&location=" + location;

    $("#saveDateBtn")
      .attr("href", googleUrl)
      .attr("aria-label", "Save the date to Google Calendar");
  }

  function startCountdown(iso) {
    var target = new Date(iso).getTime();

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        $("#countdown").html('<p class="hero-meta">Muhurtham is here</p>');
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff / 3600000) % 24);
      var mins = Math.floor((diff / 60000) % 60);
      var secs = Math.floor((diff / 1000) % 60);
      $("#cdDays").text(String(days).padStart(2, "0"));
      $("#cdHours").text(String(hours).padStart(2, "0"));
      $("#cdMins").text(String(mins).padStart(2, "0"));
      $("#cdSecs").text(String(secs).padStart(2, "0"));
    }

    tick();
    setInterval(tick, 1000);
  }

  function observeReveals() {
    var els = document.querySelectorAll(".reveal");
    els.forEach(function (el, i) {
      el.style.setProperty("--delay", (i % 4) * 90 + "ms");
    });
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            e.target.classList.remove("is-away");
          } else {
            e.target.classList.remove("is-visible");
            e.target.classList.add("is-away");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -2% 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  function observeSections() {
    var sections = document.querySelectorAll(".section-focus:not(#hero)");
    if (!("IntersectionObserver" in window)) {
      sections.forEach(function (el) {
        el.classList.add("is-inview");
        stampFocusOrder(el);
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-inview");
            e.target.classList.remove("is-outview");
            stampFocusOrder(e.target);
          } else {
            e.target.classList.remove("is-inview");
            e.target.classList.add("is-outview");
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px 0px 0px" }
    );
    sections.forEach(function (el) {
      el.classList.add("is-outview");
      io.observe(el);
    });
  }

  function stampFocusOrder(section) {
    var items = section.querySelectorAll(".focus-animate");
    items.forEach(function (el, i) {
      el.style.setProperty("--focus-i", String(i));
    });
  }

  function initNavBehavior() {
    var lastY = 0;
    var $nav = $("#siteNav");

    $(window).on("scroll", function () {
      var y = window.scrollY || 0;
      if (y > 40) $nav.addClass("is-solid");
      else $nav.removeClass("is-solid");

      if (y > 220 && y > lastY) $nav.addClass("is-hidden");
      else $nav.removeClass("is-hidden");
      lastY = y;
    });

    $("#navToggle").on("click", function () {
      $("#navLinks").toggleClass("is-open");
    });

    $("#navLinks").on("click", "a", function () {
      $("#navLinks").removeClass("is-open");
    });
  }

  function buildGlitter() {
    var $g = $("#heroGlitter").empty();
    for (var i = 0; i < 18; i++) {
      var left = Math.random() * 100;
      var top = Math.random() * 100;
      var delay = Math.random() * 1.6;
      var size = 2 + Math.random() * 4;
      $g.append(
        '<span style="left:' + left + "%;top:" + top +
          "%;width:" + size + "px;height:" + size +
          "px;animation-delay:" + delay + 's"></span>'
      );
    }
  }

  function buildIconWheel() {
    var $ring = $("#iconWheelRing").empty();
    var icons =
      data && data.heroIcons && data.heroIcons.length ? data.heroIcons : heroIcons;
    icons.forEach(function (src, i) {
      var $face = $(
        '<div class="icon-face"><img src="' + assetUrl(src) + '" alt=""></div>'
      );
      if (i === 0) $face.addClass("is-front");
      else $face.css({ opacity: 0, visibility: "hidden" });
      $ring.append($face);
    });
    iconIndex = 0;
    iconTurn = 0;
    $("#iconWheel").addClass("is-ready");
  }

  function startIconCycle() {
    var $faces = $("#iconWheelRing .icon-face");
    var n = $faces.length || heroIcons.length || 7;
    if (iconTimer) clearInterval(iconTimer);
    iconTimer = setInterval(function () {
      var $faces = $("#iconWheelRing .icon-face");
      var $current = $faces.eq(iconIndex);
      var next = (iconIndex + 1) % n;
      var $next = $faces.eq(next);

      $current
        .removeClass("is-spin-in is-front")
        .addClass("is-spin-out");

      $next
        .css({ opacity: "", visibility: "visible" })
        .removeClass("is-spin-out")
        .addClass("is-spin-in is-front");

      setTimeout(function () {
        $current.css({ opacity: 0, visibility: "hidden" }).removeClass("is-spin-out");
        $next.removeClass("is-spin-in");
        iconIndex = next;
        iconTurn += 1;
      }, 700);
    }, 2800);
  }

  function playHeroSequence() {
    buildGlitter();
    $("#heroGlitter").addClass("is-on");
    $("#heroEmblem").addClass("is-in");

    if (window.KwedsInteractive && window.KwedsInteractive.playRosePetals) {
      window.KwedsInteractive.playRosePetals();
    }

    setTimeout(function () {
      $(".hero-brand").addClass("is-in");
    }, 280);

    setTimeout(function () {
      $(".hero-names .name-line").first().addClass("is-in");
    }, 650);

    setTimeout(function () {
      buildIconWheel();
      $("#iconWheel").addClass("is-in");
    }, 1050);

    setTimeout(function () {
      $(".hero-names .name-line").last().addClass("is-in");
    }, 1400);

    setTimeout(function () {
      $(".hero-meta, .countdown, .cal-btn").addClass("is-in");
      startIconCycle();
    }, 1850);

    setTimeout(function () {
      $("#heroGlitter").removeClass("is-on");
    }, 4000);
  }

  function flyBlessingToSlot($el, done) {
    var slotName = $el.data("slot");
    var slotEl = document.querySelector('.bless-slot[data-slot="' + slotName + '"]');
    if (!slotEl) {
      if (done) done();
      return;
    }

    var from = $el[0].getBoundingClientRect();
    var to = slotEl.getBoundingClientRect();
    var startSize = parseFloat(window.getComputedStyle($el[0]).fontSize);
    var targetSize = parseFloat(window.getComputedStyle(slotEl).fontSize) || startSize * 0.42;
    var scale = targetSize / startSize;
    var targetW = from.width * scale;
    var targetH = from.height * scale;
    var left;

    if (slotName === "left") {
      left = to.left;
    } else if (slotName === "right") {
      left = to.right - targetW;
    } else {
      left = to.left + (to.width - targetW) / 2;
    }

    var top = to.top + Math.max(0, (to.height - targetH) / 2);
    var html = $el.html();

    var $clone = $("<div class='bless-fly-clone'></div>")
      .html(html)
      .css({
        left: from.left + "px",
        top: from.top + "px",
        fontSize: startSize + "px"
      })
      .appendTo(document.body);

    // Keep stack layout stable; original fades in place
    $el.addClass("is-sent");

    void $clone[0].offsetWidth;

    $clone.css({
      left: left + "px",
      top: top + "px",
      fontSize: targetSize + "px"
    });

    setTimeout(function () {
      $(slotEl).html(html).addClass("is-filled");
      $clone.remove();
      if (done) done();
    }, 780);
  }

  function playIntro() {
    var $flies = $blessingsStage.find(".bless-fly");

    $("body").addClass("has-blessings");
    $("#hero").addClass("is-revealed is-backdrop");
    $blessings.attr("aria-hidden", "false").addClass("is-visible");

    $blessingsStage.attr("aria-hidden", "false").addClass("is-active");

    $flies.each(function (i) {
      var $el = $(this);
      setTimeout(function () {
        $el.addClass("is-in");
      }, 120 + i * 520);
    });

    setTimeout(function () {
      flyBlessingToSlot($flies.eq(0));
    }, 1750);

    setTimeout(function () {
      flyBlessingToSlot($flies.eq(1));
    }, 2520);

    setTimeout(function () {
      flyBlessingToSlot($flies.eq(2), function () {
        $blessingsStage.addClass("is-fade").attr("aria-hidden", "true");
        $("#hero").removeClass("is-backdrop");
        setTimeout(function () {
          playHeroSequence();
          observeReveals();
          observeSections();
        }, 220);
      });
    }, 3290);
  }

  function renderAll(d) {
    data = applyInviteMode(d);
    d = data;

    if (d.inviteLocked) {
      showInviteLocked();
      return;
    }

    if (d.heroIcons && d.heroIcons.length) {
      heroIcons = d.heroIcons;
    }
    fillStatic(d);
    buildNav(d);
    buildEvents(d);
    buildTimeline(d);
    buildGallery(d);
    buildFamily(d);
    buildContacts(d);
    buildCalendar(d);
    if (d.datetime) startCountdown(d.datetime);
    if (window.KwedsInteractive && window.KwedsInteractive.init) {
      window.KwedsInteractive.init(d);
    }
  }

  function openSite() {
    if (!data || data.inviteLocked) return;
    $gate.addClass("is-open");
    $gate.attr("aria-hidden", "true");
    $("body").removeClass("is-locked");
    $mute.removeClass("d-none");

    if (audioEl && audioEl.src) {
      muted = false;
      audioEl.muted = false;
      audioEl.volume = 0.85;
      audioEl.play().catch(function () {
        muted = true;
        audioEl.muted = true;
        $mute
          .attr("aria-label", "Unmute audio")
          .find("i")
          .removeClass("bi-volume-up-fill")
          .addClass("bi-volume-mute-fill");
      });
      $mute
        .attr("aria-label", "Mute audio")
        .find("i")
        .removeClass("bi-volume-mute-fill")
        .addClass("bi-volume-up-fill");
    }

    playIntro();
  }

  $("#openInvitation").on("click", openSite);

  $mute.on("click", function () {
    muted = !muted;
    audioEl.muted = muted;
    if (!muted) {
      audioEl.play().catch(function () {});
    }
    $(this)
      .attr("aria-label", muted ? "Unmute audio" : "Mute audio")
      .find("i")
      .toggleClass("bi-volume-up-fill", !muted)
      .toggleClass("bi-volume-mute-fill", muted);
  });

  initNavBehavior();

  if (window.WEDDING_DATA) {
    renderAll(window.WEDDING_DATA);
  } else {
    $.getJSON("data.json")
      .done(renderAll)
      .fail(function () {
        $(".gate-greeting").text("Could not load invitation data. Please refresh.");
      });
  }
});
