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

  // 5b. Atelierul: o fereastră mică în mijloc crește până umple ecranul, ca și cum intri pe ușă;
  // apoi fiecare poză următoare se deschide din centru peste cea de dinainte.
  const room = gsap.matchMedia();
  room.add("(min-width: 0px)", () => {
    const stage = document.querySelector(".wood-window");
    const frames = gsap.utils.toArray(".ww-frame");
    if (!stage || frames.length < 2) return;
    document.documentElement.classList.add("has-window");
    const now = stage.querySelector(".ww-now");
    const wideScreen = innerWidth >= 900;
    const start = wideScreen ? "inset(30% 35% 30% 35% round 24px)" : "inset(32% 18% 32% 18% round 20px)";
    gsap.set(frames[0], { clipPath: start });
    gsap.set(frames.slice(1), { clipPath: "inset(50% 50% 50% 50% round 24px)" });
    gsap.set(frames.map((f) => f.querySelector("img")), { scale: 1.3 });

    const steps = frames.length;
    const story = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".wood-pin", start: "top top", end: () => "+=" + innerHeight * (steps + 1),
        pin: true, scrub: .7, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const shown = Math.min(steps, 1 + Math.floor(Math.max(0, self.progress * (steps + 1) - 1.4)));
          const label = String(Math.max(1, shown)).padStart(2, "0");
          if (now.textContent !== label) now.textContent = label;
        }
      }
    });
    // 1. Fereastra se deschide.
    story.to(frames[0], { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.2, ease: "power2.inOut" })
      .to(frames[0].querySelector("img"), { scale: 1, duration: 1.2, ease: "power2.inOut" }, "<")
      .to(".ww-shade", { opacity: 1, duration: .4 }, "-=.4")
      .fromTo(".ww-copy", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .4 }, "<")
      .to(".ww-count", { opacity: 1, duration: .3 }, "<");
    // 2. Pozele următoare cresc din centru, una câte una.
    frames.slice(1).forEach((frame) => {
      story.to(frame, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1, ease: "power2.inOut" }, "+=.15")
        .to(frame.querySelector("img"), { scale: 1, duration: 1, ease: "power2.inOut" }, "<");
    });
    story.to({}, { duration: .3 });

    return () => {
      document.documentElement.classList.remove("has-window");
      gsap.set(".ww-frame, .ww-frame img, .ww-shade, .ww-copy, .ww-count", { clearProps: "all" });
    };
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
    room.revert();
    storyParagraphs.forEach((p, i) => { p.innerHTML = storyOriginal[i]; });
    for (const { root, title, html } of roots) {
      root.unmount();
      title.innerHTML = html;
    }
    document.documentElement.classList.remove("has-depth");
    gsap.set(".hero-media, .hero-media img, .hero-copy > *, .depth img", { clearProps: "all" });
  };
});
