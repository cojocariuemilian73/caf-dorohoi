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
  const list = select(".menu-tabs");
  if (!list) return;
  const tabs = selectAll(".menu-tab");
  const panels = selectAll(".menu-panel");
  const visuals = selectAll(".menu-visual-item");
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  list.hidden = false;

  function show(tab, { focus = false, animate = true } = {}) {
    const id = tab.dataset.category;
    for (const other of tabs) {
      const active = other === tab;
      other.setAttribute("aria-selected", String(active));
      other.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== "meniu-" + id;
    for (const visual of visuals) visual.classList.toggle("is-active", visual.dataset.category === id);
    if (focus) tab.focus();
    if (!animate || calm.matches) return;
    // Preparatele intră pe rând, ca și cum ar fi puse pe masă.
    select("#meniu-" + id).querySelectorAll(".dish").forEach((dish, index) => {
      dish.animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 520, delay: index * 60, easing: "cubic-bezier(.23, 1, .32, 1)", fill: "backwards" }
      );
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => show(tab));
    tab.addEventListener("keydown", (event) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next;
      if (event.key in keys) next = tabs[(index + keys[event.key] + tabs.length) % tabs.length];
      else if (event.key === "Home") next = tabs[0];
      else if (event.key === "End") next = tabs.at(-1);
      if (!next) return;
      event.preventDefault();
      show(next, { focus: true });
    });
  });
  show(tabs[0], { animate: false });
}

function setupReviews() {
  const track = select(".reviews-track");
  const nav = select(".reviews-nav");
  if (!track || !nav) return;
  const prev = select(".reviews-prev");
  const next = select(".reviews-next");
  const step = () => track.querySelector(".review-card").getBoundingClientRect().width + 20;
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    nav.hidden = max <= 0;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  };
  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
  track.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
}

function loadMotion() {
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  function enableMotion() {
    if (!motion.matches || select("[data-motion-script]")) return;
    const script = document.createElement("script");
    script.src = select("script[data-motion]")?.dataset.motion || "assets/js/motion.js";
    script.dataset.motionScript = "";
    document.head.append(script);
  }

  // Animațiile nu sunt necesare pentru prima afișare: se încarcă după pagină, când browserul e liber.
  const idle = window.requestIdleCallback || ((callback) => setTimeout(callback, 200));
  if (document.readyState === "complete") idle(enableMotion);
  else addEventListener("load", () => idle(enableMotion), { once: true });
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
setupHeader();
setupReviews();
loadMotion();
