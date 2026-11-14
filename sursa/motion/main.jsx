import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import AnimatedContent from "./AnimatedContent.jsx";

gsap.registerPlugin(ScrollTrigger);

const preferences = gsap.matchMedia();
preferences.add("(prefers-reduced-motion: no-preference)", () => {
  const cover = document.querySelector(".hero-media img");
  const headline = document.querySelector(".hero-copy");
  const filmTitle = document.querySelector("#film-title");
  const filmName = filmTitle.textContent;
  let filmRoot;

  if (scrollY < innerHeight / 2) {
    gsap.timeline()
      .fromTo(cover, { scale: 1.05 }, {
        scale: 1, duration: 1.15, ease: "power2.out", clearProps: "transform"
      })
      .fromTo(headline, { y: 12, opacity: .78 }, {
        y: 0, opacity: 1, duration: .75, ease: "power3.out", clearProps: "transform,opacity"
      }, .06);
  }

  // Observe each image once, after the browser has laid out its section.
  const observer = new IntersectionObserver((entries) => {
    const images = [];
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (target === filmTitle) {
        filmRoot = createRoot(filmTitle);
        filmRoot.render(
          <AnimatedContent as="span" trigger="mount" distance={11} initialOpacity={.65} duration={.65}>
            {filmName}
          </AnimatedContent>
        );
      } else {
        images.push(target);
      }
    }
    if (!images.length) return;
    gsap.fromTo(images, { opacity: .65, scale: 1.035 }, {
      opacity: 1, scale: 1, stagger: { each: .06, amount: .18 }, duration: .7,
      ease: "power3.out", clearProps: "transform,opacity", overwrite: "auto"
    });
  }, { threshold: .12 });

  document.querySelectorAll("main .image-frame img").forEach((image) => observer.observe(image));
  observer.observe(filmTitle);

  const filmTrigger = ScrollTrigger.create({
    trigger: ".film-figure",
    start: "top 85%",
    once: true,
    onEnter: () => {
      const action = document.querySelector(".film-action");
      if (action) gsap.fromTo(action, { scale: .94 }, {
        scale: 1, duration: .55, ease: "power3.out", clearProps: "transform"
      });
    }
  });

  const desktop = gsap.matchMedia();
  desktop.add("(pointer: fine) and (hover: hover)", () => {
    const lenis = new Lenis({ lerp: .13, smoothWheel: true, autoRaf: false, stopInertiaOnNavigate: true });
    const tick = (time) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  });

  return () => {
    observer.disconnect();
    filmTrigger.kill();
    if (filmRoot) {
      filmRoot.unmount();
      filmTitle.textContent = filmName;
    }
    desktop.revert();
    gsap.killTweensOf("main .image-frame img, .film-action");
    gsap.set("main .image-frame img, .film-action", { clearProps: "opacity,transform" });
  };
});
