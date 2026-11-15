import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import AnimatedContent from "./AnimatedContent.jsx";

gsap.registerPlugin(ScrollTrigger);

// Mișcare discretă: totul apare cu fade și 12px, pe o curbă care se așază lin.
const EASE = "power3.out";
const RISE = 12;

const preferences = gsap.matchMedia();
preferences.add("(prefers-reduced-motion: no-preference)", () => {
  const roots = [];

  // 2. La derulare, coperta rămâne puțin în urmă.
  gsap.to(".hero-media", {
    yPercent: 12, ease: "none",
    scrollTrigger: { trigger: ".hero-main", start: "top top", end: "bottom top", scrub: true }
  });

  // 3. Titlurile secțiunilor, cu Animated Content de la React Bits (fade + 12px).
  document.querySelectorAll("main h2").forEach((title) => {
    const html = title.innerHTML;
    const root = createRoot(title);
    root.render(
      <AnimatedContent as="span" style={{ display: "block" }} distance={RISE} duration={.9}
        ease={EASE} initialOpacity={0} threshold={.12}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </AnimatedContent>
    );
    roots.push({ root, title, html });
  });

  // 4. Restul conținutului apare în grupuri, la fel de discret.
  const groups = [
    ".section-intro > p:not(.eyebrow)", ".wood-head > p",
    ".wood-notes li", ".board-group", ".review-card",
    ".location-card", ".footer-grid > *"
  ];
  groups.forEach((selector) => {
    ScrollTrigger.batch(selector, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.fromTo(batch, { y: RISE, opacity: 0 }, {
        y: 0, opacity: 1, duration: .9, ease: EASE, stagger: .08, clearProps: "transform,opacity"
      })
    });
  });

  // 5. Adâncime: fotografia alunecă puțin în ramă la derulare.
  document.documentElement.classList.add("has-depth");
  gsap.utils.toArray(".depth img").forEach((image) => {
    gsap.fromTo(image, { yPercent: -4 }, {
      yPercent: 4, ease: "none",
      scrollTrigger: { trigger: image.closest(".depth"), start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  // 6. Derulare lină cu Lenis, doar pe dispozitivele cu mouse.
  const desktop = gsap.matchMedia();
  desktop.add("(pointer: fine) and (hover: hover)", () => {
    const lenis = new Lenis({ lerp: .12, smoothWheel: true, autoRaf: false, stopInertiaOnNavigate: true, anchors: { offset: -80 } });
    const tick = (time) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  });

  addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

  return () => {
    desktop.revert();
    for (const { root, title, html } of roots) {
      root.unmount();
      title.innerHTML = html;
    }
    document.documentElement.classList.remove("has-depth");
    gsap.set(".hero-media, .hero-media img, .hero-copy > *, .depth img", { clearProps: "all" });
  };
});

// Efectele legate de derulare (Povestea și fereastra de la Atelier) merg și cu „animații reduse”:
// se mișcă doar cât derulează omul, deci nu pornesc singure.
const scrolly = gsap.matchMedia();
scrolly.add("(min-width: 0px)", () => {
  // 5a. Povestea: textul se aprinde cuvânt cu cuvânt, iar pozele plutesc la viteze diferite.
  const storySection = document.querySelector(".story");
  const storyParagraphs = gsap.utils.toArray(".story-text .lead, .story-text .lead + p");
  const storyOriginal = storyParagraphs.map((p) => p.innerHTML);
  if (storySection && storyParagraphs.length) {
    const keys = (storySection.dataset.keys || "").toLowerCase().split(",").filter(Boolean);
    const words = [];
    storyParagraphs.forEach((p) => {
      const parts = p.textContent.split(/(\s+)/);
      p.textContent = "";
      for (const part of parts) {
        if (!part.trim()) { p.append(part); continue; }
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = part;
        const bare = part.toLowerCase().replace(/[^\p{L}]/gu, "");
        if (keys.some((key) => bare === key.toLowerCase())) span.classList.add("is-key");
        p.append(span);
        words.push(span);
      }
    });
    gsap.fromTo(words, { opacity: .14 }, {
      opacity: 1, stagger: .06, ease: "none",
      scrollTrigger: { trigger: ".story-text", start: "top 78%", end: "bottom 42%", scrub: true }
    });
    const drift = (selector, from, to) => gsap.fromTo(selector, from, {
      ...to, ease: "none",
      scrollTrigger: { trigger: ".story", start: "top bottom", end: "bottom top", scrub: true }
    });
    drift(".story-large", { y: 70, rotate: -2.5 }, { y: -70, rotate: 1 });
    drift(".story-small", { y: 150, rotate: 3 }, { y: -150, rotate: -3 });
    drift(".story-third", { y: 240, rotate: 8 }, { y: -220, rotate: -2 });
    drift(".story-year", { xPercent: -8, y: 90 }, { xPercent: 8, y: -90 });
  }

  // 5b. Atelierul: printurile stau întinse pe masă; la derulare se strâng pe rând într-un teanc în dreapta.
  const room = gsap.matchMedia();
  room.add("(min-width: 0px)", () => {
    const stage = document.querySelector(".wood-window");
    const frames = gsap.utils.toArray(".ww-frame");
    if (!stage || frames.length < 2) return;
    document.documentElement.classList.add("has-window");
    const wide = innerWidth >= 900;
    // Unde stă fiecare print pe „masă”, față de locul lui din teanc.
    const spots = wide
      ? [{ x: -42, y: -6, r: -9 }, { x: -14, y: 8, r: 7 }, { x: 13, y: -4, r: -5 }]
      : [{ x: -20, y: 0, r: -9 }, { x: 18, y: 16, r: 8 }, { x: -6, y: 32, r: -5 }];
    const spot = (i) => spots[i % spots.length];
    // Locul din teanc (ușor deplasat și înclinat) vine din variabilele CSS ale fiecărui print.
    const rest = frames.map((frame) => {
      const css = getComputedStyle(frame);
      const k = wide ? 1 : 1 / 3;
      return {
        x: parseFloat(css.getPropertyValue("--dx")) * k || 0,
        y: parseFloat(css.getPropertyValue("--dy")) * k || 0,
        r: parseFloat(css.getPropertyValue("--rot")) * (wide ? 1 : .6) || 0
      };
    });
    frames.forEach((frame, i) => gsap.set(frame, {
      xPercent: -50, yPercent: wide ? -50 : 0, transformOrigin: "50% 50%",
      x: () => rest[i].x + innerWidth * spot(i).x / 100, y: () => rest[i].y + innerHeight * spot(i).y / 100,
      rotation: spot(i).r, scale: wide ? .5 : .52
    }));
    gsap.set(".ww-copy", { opacity: 0, y: 40 });

    const steps = frames.length;
    const story = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: ".wood-pin", start: "top top", end: () => "+=" + innerHeight * (steps + .6),
        pin: true, scrub: .7, invalidateOnRefresh: true
      }
    });
    story.to({}, { duration: .25 });
    frames.forEach((frame, i) => {
      story.to(frame, { x: rest[i].x, y: rest[i].y, rotation: rest[i].r, scale: 1, duration: 1 }, i ? "+=.1" : ">");
      if (i === 0) story.to(".ww-copy", { opacity: 1, y: 0, duration: .5, ease: "power2.out" }, "<+=.3");
    });
    story.to({}, { duration: .3 });

    return () => {
      document.documentElement.classList.remove("has-window");
      gsap.set(".ww-frame", { clearProps: "transform" });
      gsap.set(".ww-shade, .ww-copy", { clearProps: "all" });
    };
  });

  ScrollTrigger.refresh();
  return () => {
    room.revert();
    storyParagraphs.forEach((p, i) => { p.innerHTML = storyOriginal[i]; });
  };
});
