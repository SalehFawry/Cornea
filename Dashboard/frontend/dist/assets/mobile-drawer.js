/**
 * Mobile Drawer — runtime patch for responsive sidebar.
 * Injected alongside the React bundle; manipulates DOM after React mounts.
 * Safe to remove once a proper build with responsive Layout/Sidebar ships.
 */
(function () {
  "use strict";
  var BP = 768; // md breakpoint

  /* ── CSS injection ─────────────────────────────────────────────────── */
  var style = document.createElement("style");
  style.textContent = [
    /* hamburger button */
    "#mobile-hamburger{",
    "  display:none;position:fixed;top:12px;left:12px;z-index:50;",
    "  width:42px;height:42px;border-radius:10px;border:none;",
    "  background:#0066CC;color:#fff;font-size:22px;cursor:pointer;",
    "  box-shadow:0 2px 8px rgba(0,0,0,.2);align-items:center;justify-content:center;",
    "  transition:background .2s;",
    "}",
    "#mobile-hamburger:active{background:#004fa3}",

    /* overlay */
    "#mobile-overlay{",
    "  display:none;position:fixed;inset:0;z-index:29;",
    "  background:rgba(0,0,0,.45);opacity:0;transition:opacity .25s;",
    "}",
    "#mobile-overlay.open{opacity:1}",

    /* sidebar slide transition */
    "@media(max-width:767px){",
    "  #mobile-hamburger{display:flex}",
    "  aside.sidebar-aside{",
    "    transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1);",
    "  }",
    "  aside.sidebar-aside.open{transform:translateX(0)}",
    "  main.main-content{margin-left:0!important;padding-top:60px!important}",
    "}",

    /* data table horizontal scroll */
    ".data-table-wrapper{overflow-x:auto;-webkit-overflow-scrolling:touch}",

    /* report button row wrap */
    "@media(max-width:639px){",
    "  .report-row-wrap{flex-wrap:wrap}",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  /* ── Wait for React to render ─────────────────────────────────────── */
  function init() {
    var aside = document.querySelector("aside");
    var main = document.querySelector("main");
    if (!aside || !main) return setTimeout(init, 80);

    aside.classList.add("sidebar-aside");
    main.classList.add("main-content");

    /* ── Hamburger button ──────────────────────────────────────────── */
    var btn = document.createElement("button");
    btn.id = "mobile-hamburger";
    btn.setAttribute("aria-label", "Toggle navigation");
    btn.innerHTML = "&#9776;";
    document.body.appendChild(btn);

    /* ── Overlay ───────────────────────────────────────────────────── */
    var overlay = document.createElement("div");
    overlay.id = "mobile-overlay";
    document.body.appendChild(overlay);

    var isOpen = false;

    function open() {
      isOpen = true;
      aside.classList.add("open");
      overlay.style.display = "block";
      requestAnimationFrame(function () {
        overlay.classList.add("open");
      });
      btn.innerHTML = "&#10005;";
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      aside.classList.remove("open");
      overlay.classList.remove("open");
      btn.innerHTML = "&#9776;";
      setTimeout(function () {
        overlay.style.display = "none";
      }, 260);
    }

    btn.addEventListener("click", function () {
      isOpen ? close() : open();
    });
    overlay.addEventListener("click", close);

    /* Close on nav link click (SPA navigation) */
    aside.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });

    /* Close on Escape */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    /* Handle resize — close drawer if resized to desktop */
    var mq = window.matchMedia("(min-width:" + BP + "px)");
    function onResize() {
      if (mq.matches && isOpen) close();
    }
    if (mq.addEventListener) mq.addEventListener("change", onResize);
    else mq.addListener(onResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 100); });
  } else {
    setTimeout(init, 100);
  }
})();
