/**
 * Interactive demo for @chonwai/dsh-gsap-skills.
 *
 * The animation code follows the bundle's own skills:
 * - gsap-core: transform aliases + autoAlpha, never layout properties;
 *   gsap.matchMedia() for prefers-reduced-motion.
 * - gsap-timeline: one hero timeline with defaults and a label, no delay chains.
 * - gsap-scrolltrigger: register once, batch the card reveals, pin the strip on
 *   a top-level timeline, scrub 1, function `end` + invalidateOnRefresh, refresh
 *   after fonts, and revert/kill on teardown.
 *
 * Failure policy: this is a static page served over http(s). If the pinned
 * CDN cannot load, remove the `.js` class so every element is visible; if
 * ScrollTrigger is unavailable, keep the hero entrance but leave the cards and
 * the strip in their static, readable state.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var gsap = window.gsap;

  // CDN blocked or offline: no animation, nothing hidden, no console noise.
  if (!gsap) {
    root.classList.remove('js');
    return;
  }

  var hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
  if (hasScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
  }

  var mm = gsap.matchMedia();

  // Reduced motion: do not create any animation; the content is already
  // visible (the head script only pre-hides the hero when motion is allowed).
  mm.add('(prefers-reduced-motion: reduce)', function () {
    root.classList.remove('js');
  });

  // Hero entrance + card reveals (mobile-friendly, no pin).
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    var hero = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.7 } });

    hero
      .from('[data-hero-eyebrow]', { autoAlpha: 0, y: 12, duration: 0.5 })
      .addLabel('headline', '-=0.2')
      .from(
        '[data-hero-line]',
        { autoAlpha: 0, yPercent: 105, duration: 0.9, stagger: 0.08 },
        'headline',
      )
      .from('[data-hero-sub]', { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.08 }, '-=0.55')
      .from(
        '.hero-actions .btn',
        { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.08 },
        '-=0.35',
      )
      .from(
        '.hero-stats li',
        { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.06 },
        '-=0.2',
      );

    // GSAP now owns the hero's visibility; drop the pre-hide CSS class.
    root.classList.remove('js');

    var batch;
    if (hasScrollTrigger) {
      gsap.set('.skill-card', { autoAlpha: 0, y: 24 });
      batch = window.ScrollTrigger.batch('.skill-card', {
        start: 'top 88%',
        once: true,
        onEnter: function (elements) {
          gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            overwrite: true,
          });
        },
      });
    }

    return function () {
      hero.kill();
      if (batch) batch.forEach(function (trigger) { trigger.kill(); });
      gsap.set('.skill-card', { clearProps: 'all' });
    };
  });

  // Pinned, scroll-scrubbed strip: desktop only (on small screens the same
  // cards stack and stay readable). A top-level timeline owns the ScrollTrigger;
  // only the inner track is animated (never the pinned element itself).
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 721px)', function () {
    if (!hasScrollTrigger) return;

    var ScrollTrigger = window.ScrollTrigger;
    var pinSection = document.querySelector('#pin-section');
    var track = document.querySelector('[data-pin-track]');
    var viewport = document.querySelector('.pin-viewport');
    var progressBar = document.querySelector('[data-pin-progress]');

    if (!pinSection || !track || !viewport) return;

    root.classList.add('anim-ready');
    gsap.set(track, { x: 0 });
    gsap.set(progressBar, { scaleX: 0 });

    var distance = function () {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    };

    var pinTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pinSection,
        start: 'top top',
        end: function () { return '+=' + distance(); },
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: function (self) {
          gsap.set(progressBar, { scaleX: self.progress });
        },
      },
    });

    pinTimeline.to(track, { x: function () { return -distance(); } });

    return function () {
      root.classList.remove('anim-ready');
      if (pinTimeline.scrollTrigger) pinTimeline.scrollTrigger.kill();
      pinTimeline.kill();
      gsap.set(track, { clearProps: 'all' });
      gsap.set(progressBar, { clearProps: 'all' });
    };
  });

  // Fonts change metrics; refresh once they settle (ScrollTrigger guidance).
  if (hasScrollTrigger && document.fonts && document.fonts.ready) {
    document.fonts.ready
      .then(function () { window.ScrollTrigger.refresh(); })
      .catch(function () {});
  }

  // Static page, but keep the teardown correct for bfcache / SPA-like reuse.
  window.addEventListener('pagehide', function () { mm.revert(); }, { once: true });
})();
