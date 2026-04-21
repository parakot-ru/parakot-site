const parallaxItems = Array.from(document.querySelectorAll("[data-depth]"));

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (parallaxItems.length > 0 && !prefersReducedMotion.matches) {
  let ticking = false;

  const updateParallax = () => {
    const viewportHeight = window.innerHeight;

    parallaxItems.forEach((item) => {
      const scope = item.closest(".parallax-scope");

      if (!scope) {
        return;
      }

      const rect = scope.getBoundingClientRect();
      const depth = Number.parseFloat(item.dataset.depth || "0");
      const progress =
        (viewportHeight * 0.5 - rect.top) / (viewportHeight + rect.height);
      const shift = (progress - 0.2) * depth * 180;

      item.style.setProperty("--parallax-shift", `${shift.toFixed(1)}px`);
    });

    ticking = false;
  };

  const requestTick = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  requestTick();
}
