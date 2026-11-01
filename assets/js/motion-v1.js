// Motion for the lander: Lottie spots and the animated app demos. Plain script, no dependencies:
// <script src="assets/js/motion-v1.js" defer></script>
// Markup: <div class="lottie" data-lottie="assets/lottie/NAME-v1.js" aria-hidden="true">{the inlined NAME-v1.svg}</div>
// The inlined SVG is the final frame, so the box is right with no JS and with reduced motion (the player never loads).
// Otherwise the player loads once a spot comes near the viewport, each spot plays when on screen and pauses off it.
// Add data-loop to loop a spot. Data files are ES modules because the page CSP has no connect-src.
;(() => {
  const els = document.querySelectorAll('[data-lottie]')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  if (reduce.matches || !('IntersectionObserver' in window)) return
  demos()
  const PLAYER = new URL('lottie_light-5.13.0.min.js', document.currentScript.src).href
  const anims = []
  let player

  const loadPlayer = () => player || (player = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = PLAYER
    s.onload = () => resolve(window.lottie)
    s.onerror = reject
    document.head.append(s)
  }))

  const onScreen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const a = e.target.lottie
      if (e.isIntersecting) a.play()
      else a.pause()
    }
  }, { threshold: 0.4 })

  const mount = async (el) => {
    const [lottie, data] = await Promise.all([
      loadPlayer(),
      import(new URL(el.dataset.lottie, document.baseURI).href).then((m) => structuredClone(m.default)),
    ])
    const box = document.createElement('div')
    box.className = 'lottie-player'
    el.append(box)
    const a = lottie.loadAnimation({
      container: box, renderer: 'svg', animationData: data, autoplay: false, loop: el.hasAttribute('data-loop'),
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    })
    const ready = () => {
      el.lottie = a
      anims.push(a)
      el.classList.add('is-live')
      onScreen.observe(el)
    }
    if (a.isLoaded) ready()
    else a.addEventListener('DOMLoaded', ready)
  }

  const near = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      near.unobserve(e.target)
      mount(e.target).catch(() => {}) // the final-frame SVG stays in place
    }
  }, { rootMargin: '300px 0px' })
  els.forEach((el) => near.observe(el))

  // reduced motion switched on mid-visit: stop everything on its final frame
  reduce.addEventListener('change', () => {
    if (!reduce.matches) return
    near.disconnect()
    onScreen.disconnect()
    for (const a of anims) a.goToAndStop(a.totalFrames - 1, true)
  })

  // Animated demos: <img data-video="assets/motion/NAME-v1" [data-video-m="..."]> keeps its still picture until the
  // video can play, then a muted looping <video> takes its place (or its <picture>'s). Nothing loads with reduced
  // motion, with Save-Data on, or without JS; the still stays.
  function demos() {
    const imgs = document.querySelectorAll('img[data-video]')
    if (!imgs.length || navigator.connection?.saveData) return
    const AV1 = 'video/webm; codecs="av01.0.08M.08"'
    const playing = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()
    }, { threshold: 0.25 })
    const swap = (img) => {
      const small = img.dataset.videoM && matchMedia('(max-width: 700px)').matches
      const base = small ? img.dataset.videoM : img.dataset.video
      const v = document.createElement('video')
      v.muted = true
      v.loop = true
      v.playsInline = true
      v.setAttribute('muted', '')
      v.setAttribute('playsinline', '')
      v.preload = 'auto'
      v.poster = img.currentSrc || img.src
      v.className = img.className
      v.width = small ? 1200 : +img.getAttribute('width')
      v.height = small ? 1040 : +img.getAttribute('height')
      v.setAttribute('role', 'img')
      v.setAttribute('aria-label', img.alt)
      v.src = base + (v.canPlayType(AV1) === 'probably' ? '.webm' : '.mp4')
      v.addEventListener('loadeddata', () => {
        ;(img.closest('picture') || img).replaceWith(v)
        playing.observe(v)
      }, { once: true })
      v.load()
    }
    const near = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        near.unobserve(e.target)
        swap(e.target)
      }
    }, { rootMargin: '400px 0px' })
    const start = () => imgs.forEach((img) => near.observe(img))
    // the hero's still is the page's largest paint: start after the page has loaded
    if (document.readyState === 'complete') start()
    else addEventListener('load', start, { once: true })
    reduce.addEventListener('change', () => {
      if (!reduce.matches) return
      near.disconnect()
      document.querySelectorAll('video[role="img"]').forEach((v) => { v.pause(); v.currentTime = 0 })
    })
  }
})()
