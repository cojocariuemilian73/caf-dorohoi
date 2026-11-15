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
    ".story-text > :not(h2)", ".story-images .image-frame", ".section-intro > p:not(.eyebrow)", ".wood-head > p",
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

  // 5b. Atelierul: secțiunea stă pe loc, iar fotografiile trec de la dreapta la stânga.
  const wide = gsap.matchMedia();
  wide.add("(min-width: 900px)", () => {
    const rail = document.querySelector(".wood-rail");
    const strip = document.querySelector(".wood-strip");
    if (!rail || !strip) return;
    document.documentElement.classList.add("has-rail");
    const distance = () => Math.max(0, strip.scrollWidth - rail.clientWidth);
    const slide = gsap.to(strip, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: ".wood-pin", start: "top top", end: () => "+=" + distance() * 1.1,
        pin: true, scrub: .6, invalidateOnRefresh: true
      }
    });
    // Fiecare poză alunecă puțin în ramă, în sens invers, ca să pară adâncă.
    strip.querySelectorAll(".wood-figure img").forEach((image) => {
      gsap.fromTo(image, { xPercent: 5 }, {
        xPercent: -5, ease: "none",
        scrollTrigger: { trigger: image.closest(".wood-figure"), containerAnimation: slide, start: "left right", end: "right left", scrub: true }
      });
    });
    return () => {
      document.documentElement.classList.remove("has-rail");
      gsap.set(".wood-strip, .wood-figure img", { clearProps: "all" });
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
    wide.revert();
    for (const { root, title, html } of roots) {
      root.unmount();
      title.innerHTML = html;
    }
    document.documentElement.classList.remove("has-depth");
    gsap.set(".hero-media, .hero-media img, .hero-copy > *, .depth img", { clearProps: "all" });
  };
});
