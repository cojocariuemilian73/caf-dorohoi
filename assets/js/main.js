"use strict";

const select = (selector) => document.querySelector(selector);
const selectAll = (selector) => [...document.querySelectorAll(selector)];

function setupNavigation() {
  const toggle = select(".nav-toggle");
  const dialog = select("#navigatie-mobila");
  const desktop = matchMedia("(min-width: 850px)");
  if (typeof dialog.showModal !== "function") return;

  toggle.hidden = false;
  toggle.addEventListener("click", () => dialog.showModal());
  dialog.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const section = document.getElementById(link.hash.slice(1));
    dialog.close();
    if (section) {
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
    }
  });
  desktop.addEventListener("change", () => {
    if (desktop.matches && dialog.open) dialog.close();
  });
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const bucharest = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Bucharest", weekday: "long", hour: "2-digit", minute: "2-digit", year: "numeric", hourCycle: "h23"
});

function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function businessHours(schedule) {
  const byDay = new Map(days.map((day) => [day, []]));
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  for (const { zile, deschide, inchide } of schedule) {
    if (!clock.test(deschide) || (!clock.test(inchide) && inchide !== "24:00") || deschide === inchide) continue;
    for (const day of zile) {
      byDay.get(day)?.push({
        label: deschide + "–" + inchide,
        start: toMinutes(deschide),
        end: toMinutes(inchide)
      });
    }
  }
  for (const intervals of byDay.values()) intervals.sort((a, b) => a.start - b.start);
  return byDay;
}

function setupHours() {
  const schedule = JSON.parse(select("#program-dorohoi").textContent);
  const byDay = businessHours(schedule);
  const status = select("#open-status");
  const dot = select("#status-dot");
  const hours = select("#today-hours");
  const copyrightYear = select("#year");

  function updateHours() {
    const { weekday, hour, minute, year } = Object.fromEntries(
      bucharest.formatToParts(new Date()).map(({ type, value }) => [type, value])
    );
    const today = byDay.get(weekday);
    const yesterday = byDay.get(days[(days.indexOf(weekday) + 6) % 7]);
    const now = Number(hour) * 60 + Number(minute);
    // Un interval care se termină după miezul nopții aparține zilei de pornire.
    const open = today.some(({ start, end }) => now >= start && (end < start || now < end))
      || yesterday.some(({ start, end }) => end < start && now < end);
    const state = open ? "Deschis acum" : "Închis acum";
    if (status.textContent !== state) status.textContent = state;
    dot.dataset.state = open ? "open" : "closed";
    hours.textContent = today.length ? "Azi " + today.map(({ label }) => label).join(" / ") : "";
    if (copyrightYear.textContent !== year) copyrightYear.textContent = year;
  }

  updateHours();
  setInterval(updateHours, 15_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateHours();
  });
}

function setupMenu() {
  const links = selectAll(".menu-nav a");
  const panels = selectAll(".menu-panel");
  if (!links.length) return;

  function selectPanel(id) {
    for (const panel of panels) panel.hidden = "#" + panel.id !== id;
    for (const link of links) {
      if (link.hash === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }

  function syncHash() {
    const active = links.find((link) => link.hash === location.hash);
    if (active) selectPanel(active.hash);
  }

  selectPanel(links[0].hash);
  syncHash();
  addEventListener("hashchange", syncHash);
  for (const card of selectAll("[data-menu-category]")) {
    card.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      selectPanel("#" + card.dataset.menuCategory);
    });
  }
  for (const link of links) {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectPanel(link.hash);
    });
  }
}

function setupGallery() {
  const dialog = select("#lightbox");
  if (typeof dialog.showModal !== "function") return;
  const triggers = selectAll(".gallery-item");
  const image = select("#lightbox-image");
  const caption = select("#lightbox-caption");
  let current = 0;
  let opener;

  function show(index) {
    current = (index + triggers.length) % triggers.length;
    const trigger = triggers[current];
    const original = trigger.querySelector("img");
    image.src = trigger.href;
    image.alt = original.alt;
    caption.textContent = (current + 1) + " / " + triggers.length + " · " + trigger.dataset.caption;
  }

  triggers.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(index);
      dialog.showModal();
    });
  });
  select(".lightbox-prev").addEventListener("click", () => show(current - 1));
  select(".lightbox-next").addEventListener("click", () => show(current + 1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    show(current + (event.key === "ArrowRight" ? 1 : -1));
  });
}

function setupFilm() {
  const link = select(".film-play");
  link.addEventListener("click", (event) => {
    // YouTube needs an HTTP referrer to play inside an embedded player.
    if (location.protocol === "file:" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const frame = document.createElement("iframe");
    frame.title = link.dataset.videoTitle;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = link.dataset.videoEmbed;
    link.replaceWith(frame);
    frame.focus({ preventScroll: true });
  });
}

function loadMotion() {
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  function enableMotion() {
    if (!motion.matches || select("[data-motion-script]")) return;
    const script = document.createElement("script");
    script.src = "assets/js/motion.js";
    script.dataset.motionScript = "";
    document.head.append(script);
  }

  requestAnimationFrame(() => requestAnimationFrame(enableMotion));
  motion.addEventListener("change", enableMotion);
}

function setupHeader() {
  const header = select(".site-header");
  const update = () => header.classList.toggle("is-scrolled", scrollY > 28);
  update();
  addEventListener("scroll", update, { passive: true });
}

setupNavigation();
setupHours();
setupMenu();
setupGallery();
setupFilm();
setupHeader();
loadMotion();
