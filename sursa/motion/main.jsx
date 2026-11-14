import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import AnimatedContent from "./AnimatedContent.jsx";

gsap.registerPlugin(ScrollTrigger);

// Curbe ease-out puternice: mișcarea pornește repede și se așază lin.
const EASE = "expo.out";
const SOFT = "power3.out";

function splitWords(heading) {
  const words = heading.textContent.trim().split(/\s+/);
  heading.setAttribute("aria-label", heading.textContent.trim());
  heading.innerHTML = words
    .map((word) => `<span class="word" aria-hidden="true"><span>${word}</span></span>`)
    .join(" ");
  return heading.querySelectorAll(".word > span");
}

const preferences = gsap.matchMedia();
preferences.add("(prefers-reduced-motion: no-preference)", () => {
  const roots = [];
  const hero = document.querySelector(".hero-main");
  const heading = document.querySelector("#hero-title");
  const headingText = heading.textContent;
  const video = document.querySelector(".hero-video");

  // 1. Intrarea: filmul se apropie, cuvintele urcă din mască, apoi restul.
  const words = splitWords(heading);
  const intro = gsap.timeline({ defaults: { ease: EASE } });
  intro
    .fromTo(video, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.2 }, 0)
    .fromTo(".hero-label", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, .15)
    .fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: .07 }, .25)
    .fromTo(".hero-actions > *", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .08 }, .8)
    .fromTo(".hero-foot", { opacity: 0 }, { opacity: 1, duration: 1 }, 1.1)
    .fromTo(".site-header", { yPercent: -100 }, { yPercent: 0, duration: 1.1 }, .3);

  // 2. La derulare, filmul coboară mai încet decât pagina, iar textul se estompează.
  const parallax = gsap.timeline({
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
  });
  parallax
    .to(".hero-media", { yPercent: 22, ease: "none" }, 0)
    .to(".hero-copy", { yPercent: -18, opacity: 0, ease: "none" }, 0)
    .to(".hero-foot", { opacity: 0, ease: "none", duration: .4 }, 0);

  // 3. Titlurile secțiunilor apar rând cu rând, cu Animated Content de la React Bits.
  document.querySelectorAll("main h2:not(.eyebrow)").forEach((title) => {
    const html = title.innerHTML;
    const lines = html.split(/<br\s*\/?>/i).map((line) => line.trim()).filter(Boolean);
    const root = createRoot(title);
    root.render(
      <AnimatedContent as="span" style={{ display: "block" }} distance={42} blur={8} duration={1.1}
        ease={EASE} stagger={.09} initialOpacity={0} threshold={.12}>
        {lines.map((line, index) => (
          <span key={index} style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: line }} />
        ))}
      </AnimatedContent>
    );
    roots.push({ root, title, html });
  });

  // 4. Fotografiile se deschid de jos în sus, cu un mic zoom care se așază.
  const frames = gsap.utils.toArray("main .image-frame").filter((frame) => frame.querySelector("img"));
  gsap.set(frames, { clipPath: "inset(100% 0% 0% 0%)" });
  ScrollTrigger.batch(frames, {
    start: "top 88%",
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut", stagger: .1, clearProps: "clipPath"
    })
  });

  // 5. Adâncime: fotografia alunecă în ramă, iar ramele stau pe planuri diferite.
  document.documentElement.classList.add("has-depth");
  gsap.utils.toArray(".depth img").forEach((image) => {
    gsap.fromTo(image, { yPercent: -7 }, {
      yPercent: 7, ease: "none",
      scrollTrigger: { trigger: image.parentElement, start: "top bottom", end: "bottom top", scrub: true }
    });
  });
  const layers = [[".story-small", -26], [".story-large", 6], [".wood-figure.w1", -10], [".wood-figure.w0", 4], [".gallery-item.g1", -8], [".gallery-item.g4", -12]];
  // Pe ecranele mici, straturile rămân aliniate, ca să nu se suprapună.
  const wide = gsap.matchMedia();
  wide.add("(min-width: 900px)", () => {
    layers.forEach(([selector, distance]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      gsap.fromTo(element, { y: -distance * 2 }, {
        y: distance * 2, ease: "none",
        scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  });

  // 6. Textele, preparatele, recenziile și locațiile intră în cascadă.
  const groups = [".story-text > :not(h2)", ".section-intro > p:not(.eyebrow)", ".wood-head > p", ".wood-notes li", ".menu-panel:not([hidden]) .dish", ".review", ".reviews-foot", ".location", ".footer-grid > *"];
  groups.forEach((selector) => {
    ScrollTrigger.batch(selector, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.fromTo(batch, { y: 28, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: SOFT, stagger: .08, clearProps: "transform,opacity"
      })
    });
  });

  // 7. Derulare lină cu Lenis pe dispozitivele cu mouse.
  const desktop = gsap.matchMedia();
  desktop.add("(pointer: fine) and (hover: hover)", () => {
    const lenis = new Lenis({ lerp: .1, smoothWheel: true, autoRaf: false, stopInertiaOnNavigate: true, anchors: { offset: -80 } });
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
    heading.textContent = headingText;
    heading.removeAttribute("aria-label");
    document.documentElement.classList.remove("has-depth");
    gsap.set("main .image-frame, main .image-frame img, .hero-media, .hero-copy, .hero-foot, .site-header, .hero-video", { clearProps: "all" });
  };
});
