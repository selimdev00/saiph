'use strict'

/* =====================================================================
   REEL - accessible HTML5 video player (vanilla JS)
   The native <video> element is the single source of truth; the UI is a
   projection of media events, never a parallel state copy.
   ===================================================================== */

;(function () {
  /** @type {{title:string, tag:string, desc:string, src:string, poster:string, captions?:string, durationHint:number}[]} */
  const PLAYLIST = [
    {
      title: 'Studio Reel',
      tag: 'Base grade',
      desc: 'The ungraded reference pass. A city block at dusk, shot straight from camera with no color work applied yet.',
      src: './assets/videos/video.mp4',
      poster: './assets/images/poster-reel.jpg',
      captions: './assets/captions/reel.en.vtt',
      durationHint: 10,
    },
    {
      title: 'Monochrome Cut',
      tag: 'Mono',
      desc: 'Saturation pulled to zero. A test for contrast and how the city lights separate once color leaves the read.',
      src: './assets/videos/mono.mp4',
      poster: './assets/images/poster-mono.jpg',
      durationHint: 10,
    },
    {
      title: 'Golden Grade',
      tag: 'Warm',
      desc: 'Warm highlights and a lifted red channel push the sodium street lights and tungsten windows further.',
      src: './assets/videos/warm.mp4',
      poster: './assets/images/poster-warm.jpg',
      durationHint: 10,
    },
    {
      title: 'Teal & Orange',
      tag: 'Teal / orange',
      desc: 'Cool blue shadows against the warm window glow. The blockbuster split that keeps towers and sky cleanly apart.',
      src: './assets/videos/teal.mp4',
      poster: './assets/images/poster-teal.jpg',
      durationHint: 10,
    },
    {
      title: 'Night Drive',
      tag: 'Night',
      desc: 'Brightness dropped and blues pushed deeper, leaning the skyline into late-night rather than the blue hour it was shot in.',
      src: './assets/videos/night.mp4',
      poster: './assets/images/poster-night.jpg',
      durationHint: 10,
    },
    {
      title: 'Bleach Bypass',
      tag: 'Bleach bypass',
      desc: 'High contrast, desaturated silver. Emulates skipping the bleach step in a film lab for a harsh, gritty surface.',
      src: './assets/videos/bleach.mp4',
      poster: './assets/images/poster-bleach.jpg',
      durationHint: 10,
    },
    {
      title: 'Sepia Archive',
      tag: 'Sepia',
      desc: 'A full tone map into warm browns. Archival and printed, the way a turn-of-the-century plate would have aged.',
      src: './assets/videos/sepia.mp4',
      poster: './assets/images/poster-sepia.jpg',
      durationHint: 10,
    },
    {
      title: 'Vibrant Pop',
      tag: 'Vibrant',
      desc: 'Saturation and gamma pushed for a punchy, neon-soaked frame. Loud on purpose, and the last stop on the reel.',
      src: './assets/videos/vibrant.mp4',
      poster: './assets/images/poster-vibrant.jpg',
      durationHint: 10,
    },
  ]

  const $ = (sel, root = document) => root.querySelector(sel)

  document.addEventListener('DOMContentLoaded', () => {
    const player = $('#player')
    const video = $('#video')
    const live = $('[data-live]')

    const seekInput = $('[data-seek]')
    const seekWrap = $('.seek')
    const seekRail = $('[data-seek-rail]')
    const played = $('[data-played]')
    const buffered = $('[data-buffered]')
    const head = $('[data-head]')
    const scrubTip = $('[data-scrub-tip]')

    const volInput = $('[data-vol]')
    const volFill = $('[data-vol-fill]')

    const tcCurrent = $('[data-current]')
    const tcRest = $('[data-rest]')

    const statusDot = $('[data-status-dot]')
    const statusLabel = $('[data-status-label]')
    const ccBtn = $('[data-cc]')
    const pipBtn = $('[data-pip]')
    const fsBtn = $('[data-fs]')
    const plList = $('[data-playlist]')
    const plCount = $('[data-pl-count]')
    const endedTitle = $('[data-ended-title]')
    const endedNext = $('[data-ended-next]')

    const clipTitle = $('[data-clip-title]')
    const clipTag = $('[data-clip-tag]')
    const clipPos = $('[data-clip-pos]')
    const clipStat = $('[data-clip-stat]')
    const clipDesc = $('[data-clip-desc]')

    let index = 0
    let lastVolume = 1
    let tcMode = 'remaining' // 'remaining' | 'duration'
    let rafId = null
    let scrubbing = false
    let wasPlaying = false
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ---------- helpers ---------- */

    function fmt(sec) {
      if (!isFinite(sec) || sec < 0) sec = 0
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec - m * 60)
      return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
    }

    function setState(state) {
      player.dataset.state = state
    }

    function announce(msg) {
      if (live) live.textContent = msg
    }

    function setStatus(label, isLive) {
      statusLabel.textContent = label
      statusDot.classList.toggle('is-live', !!isLive)
    }

    /* ---------- playlist ---------- */

    function renderPlaylist() {
      plList.innerHTML = ''
      PLAYLIST.forEach((item, i) => {
        const li = document.createElement('li')
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'playlist__item'
        btn.dataset.index = String(i)
        btn.setAttribute('aria-label', `Play ${item.title}`)
        if (i === index) btn.setAttribute('aria-current', 'true')
        btn.innerHTML = `
          <img class="playlist__thumb" src="${item.poster}" alt="" decoding="async">
          <span class="playlist__body">
            <span class="playlist__index">${String(i + 1).padStart(2, '0')}</span>
            <span class="playlist__title">${item.title}</span>
          </span>
          <span class="playlist__meta">
            <span class="playlist__eq" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="playlist__dur">${fmt(item.durationHint)}</span>
          </span>`
        btn.addEventListener('click', () => loadTrack(i, true))
        li.appendChild(btn)
        plList.appendChild(li)
      })
      plCount.textContent = String(PLAYLIST.length)
    }

    function markActive() {
      plList.querySelectorAll('.playlist__item').forEach((el) => {
        const active = Number(el.dataset.index) === index
        if (active) el.setAttribute('aria-current', 'true')
        else el.removeAttribute('aria-current')
        el.dataset.playing = active && !video.paused ? 'true' : 'false'
      })
    }

    function updateActiveDuration() {
      const el = plList.querySelector(`.playlist__item[data-index="${index}"] .playlist__dur`)
      if (el && isFinite(video.duration)) el.textContent = fmt(video.duration)
    }

    function updateInfo() {
      const item = PLAYLIST[index]
      clipTitle.textContent = item.title
      clipTag.textContent = item.tag
      clipDesc.textContent = item.desc
      clipPos.textContent = `Clip ${String(index + 1).padStart(2, '0')} of ${String(PLAYLIST.length).padStart(2, '0')}`
      document.title = `${item.title} - Reel`
    }

    function updateStat() {
      const w = video.videoWidth
      const h = video.videoHeight
      const dims = w && h ? `${w}×${h}` : '1280×720'
      clipStat.textContent = `${dims} · ${fmt(video.duration)} · H.264`
    }

    function rebuildCaptions(captions) {
      // remove existing tracks
      Array.from(video.querySelectorAll('track')).forEach((t) => t.remove())
      if (captions) {
        const track = document.createElement('track')
        track.kind = 'captions'
        track.label = 'English'
        track.srclang = 'en'
        track.src = captions
        video.appendChild(track)
        ccBtn.hidden = false
      } else {
        ccBtn.hidden = true
        ccBtn.setAttribute('aria-pressed', 'false')
      }
    }

    function loadTrack(i, autoplay) {
      index = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length
      const item = PLAYLIST[index]
      wasPlaying = autoplay
      setState('loading')
      video.poster = item.poster
      video.src = item.src
      rebuildCaptions(item.captions)
      video.load()
      markActive()
      updateInfo()
      announce(`Loading ${item.title}`)
      if (autoplay) {
        video.play().catch(() => {
          /* autoplay policy: stay on poster */
          setState('ready')
        })
      }
    }

    /* ---------- visual sync ---------- */

    function paintProgress() {
      const d = video.duration
      if (!d) return
      const pct = Math.min(1, video.currentTime / d)
      played.style.transform = `scaleX(${pct})`
      head.style.left = `${pct * 100}%`
      if (!scrubbing) {
        seekInput.value = String(Math.round(pct * 1000))
        seekInput.setAttribute('aria-valuetext', `${fmt(video.currentTime)} of ${fmt(d)}`)
      }
    }

    function paintBuffered() {
      const d = video.duration
      if (!video.buffered.length || !d) return
      const t = video.currentTime
      let end = 0
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= t && t <= video.buffered.end(i)) {
          end = video.buffered.end(i)
          break
        }
        end = video.buffered.end(i)
      }
      buffered.style.transform = `scaleX(${Math.min(1, end / d)})`
    }

    function paintTimecode() {
      const d = video.duration || 0
      tcCurrent.textContent = fmt(video.currentTime)
      if (tcMode === 'remaining') {
        tcRest.textContent = `-${fmt(Math.max(0, d - video.currentTime))}`
      } else {
        tcRest.textContent = fmt(d)
      }
    }

    function tick() {
      paintProgress()
      rafId = requestAnimationFrame(tick)
    }
    function startRaf() {
      if (!rafId) rafId = requestAnimationFrame(tick)
    }
    function stopRaf() {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = null
    }

    /* ---------- actions ---------- */

    async function togglePlay() {
      if (video.paused || video.ended) {
        try {
          await video.play()
        } catch (err) {
          if (err && err.name === 'NotAllowedError') {
            setState('ready')
          } else if (err && err.name !== 'AbortError') {
            console.warn(err)
          }
        }
      } else {
        video.pause()
      }
    }

    function stop() {
      video.pause()
      video.currentTime = 0
      setState('ready')
      announce('Stopped')
    }

    function toggleMute() {
      if (video.muted || video.volume === 0) {
        video.muted = false
        video.volume = lastVolume || 0.5
      } else {
        lastVolume = video.volume
        video.muted = true
      }
    }

    function changeVolume(delta) {
      video.muted = false
      video.volume = Math.min(1, Math.max(0, video.volume + delta))
    }

    async function toggleFullscreen() {
      const inFs = document.fullscreenElement || document.webkitFullscreenElement
      try {
        if (!inFs) {
          if (player.requestFullscreen) await player.requestFullscreen()
          else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen()
        } else {
          if (document.exitFullscreen) await document.exitFullscreen()
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
        }
      } catch (err) {
        console.warn('fullscreen failed', err)
      }
    }

    function toggleCaptions() {
      const track = video.textTracks && video.textTracks[0]
      if (!track) return
      const on = track.mode === 'showing'
      track.mode = on ? 'hidden' : 'showing'
      ccBtn.setAttribute('aria-pressed', String(!on))
      announce(on ? 'Captions off' : 'Captions on')
    }

    async function togglePip() {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture()
        else await video.requestPictureInPicture()
      } catch (err) {
        console.warn(err)
      }
    }

    function toggleTimecode() {
      tcMode = tcMode === 'remaining' ? 'duration' : 'remaining'
      paintTimecode()
    }

    const ACTIONS = {
      toggle: togglePlay,
      stop,
      prev: () => {
        if (video.currentTime > 3) video.currentTime = 0
        else loadTrack(index - 1, !video.paused)
      },
      next: () => loadTrack(index + 1, !video.paused),
      mute: toggleMute,
      fullscreen: toggleFullscreen,
      captions: toggleCaptions,
      pip: togglePip,
      replay: () => {
        video.currentTime = 0
        togglePlay()
      },
      retry: () => loadTrack(index, true),
      'toggle-tc': toggleTimecode,
    }

    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const fn = ACTIONS[el.dataset.action]
        if (fn) fn()
      })
    })

    /* ---------- media events ---------- */

    video.addEventListener('loadedmetadata', () => {
      seekInput.max = '1000'
      paintProgress()
      paintTimecode()
      updateActiveDuration()
      updateStat()
      setState(video.paused ? 'ready' : 'playing')
    })
    video.addEventListener('loadeddata', () => {
      if (player.dataset.state === 'loading') setState(video.paused ? 'ready' : 'playing')
    })
    video.addEventListener('canplay', () => {
      if (player.dataset.state === 'loading') setState(video.paused ? 'ready' : 'playing')
    })
    video.addEventListener('timeupdate', () => {
      paintTimecode()
      if (!rafId) paintProgress()
    })
    video.addEventListener('progress', paintBuffered)
    video.addEventListener('play', () => {
      setState('playing')
      setStatus('playing', true)
      togglePrimary(true)
      markActive()
      startRaf()
    })
    video.addEventListener('playing', () => {
      setState('playing')
      startRaf()
    })
    video.addEventListener('pause', () => {
      if (!video.ended) setState('paused')
      setStatus('paused', false)
      togglePrimary(false)
      markActive()
      stopRaf()
    })
    video.addEventListener('waiting', () => {
      if (!video.paused) setState('buffering')
    })
    video.addEventListener('volumechange', paintVolume)
    video.addEventListener('ended', () => {
      stopRaf()
      const last = index === PLAYLIST.length - 1
      endedTitle.textContent = last ? 'Playlist finished' : `Up next: ${PLAYLIST[index + 1].title}`
      endedNext.hidden = last
      setState('ended')
      setStatus('ended', false)
      togglePrimary(false)
      markActive()
      announce(last ? 'Playlist finished' : 'Clip ended')
      if (!last) {
        // brief pause so the "up next" frame is visible, then auto-advance
        setTimeout(() => {
          if (player.dataset.state === 'ended') loadTrack(index + 1, true)
        }, reduceMotion ? 0 : 1600)
      }
    })
    video.addEventListener('error', () => {
      stopRaf()
      setState('error')
      setStatus('error', false)
      announce('This clip could not be loaded')
    })

    function togglePrimary(playing) {
      const primary = $('.ctl--primary')
      primary.setAttribute('aria-pressed', String(playing))
      primary.setAttribute('aria-label', playing ? 'Pause' : 'Play')
    }

    const muteBtn = $('[data-action="mute"]')
    function paintVolume() {
      const effective = video.muted ? 0 : video.volume
      volFill.style.transform = `scaleX(${effective})`
      if (document.activeElement !== volInput) volInput.value = String(Math.round(effective * 100))
      volInput.setAttribute('aria-valuetext', `${Math.round(effective * 100)}%`)
      const muted = video.muted || video.volume === 0
      muteBtn.setAttribute('aria-pressed', String(muted))
      muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute')
    }

    /* ---------- seek interaction ---------- */

    seekInput.addEventListener('input', () => {
      const d = video.duration
      if (!d) return
      const ratio = Number(seekInput.value) / 1000
      video.currentTime = ratio * d
      played.style.transform = `scaleX(${ratio})`
      head.style.left = `${ratio * 100}%`
      seekInput.setAttribute('aria-valuetext', `${fmt(video.currentTime)} of ${fmt(d)}`)
      paintTimecode()
    })
    seekInput.addEventListener('pointerdown', () => {
      scrubbing = true
      wasPlaying = !video.paused
      seekWrap.classList.add('is-scrubbing')
      if (wasPlaying) video.pause()
    })
    const endScrub = () => {
      if (!scrubbing) return
      scrubbing = false
      seekWrap.classList.remove('is-scrubbing')
      if (wasPlaying) video.play().catch(() => {})
    }
    window.addEventListener('pointerup', endScrub)
    seekInput.addEventListener('keydown', (e) => {
      const d = video.duration || 0
      let handled = true
      const big = e.shiftKey ? 10 : 5
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowDown': video.currentTime = Math.max(0, video.currentTime - big); break
        case 'ArrowRight': case 'ArrowUp': video.currentTime = Math.min(d, video.currentTime + big); break
        case 'Home': video.currentTime = 0; break
        case 'End': video.currentTime = d; break
        case 'PageUp': video.currentTime = Math.min(d, video.currentTime + 30); break
        case 'PageDown': video.currentTime = Math.max(0, video.currentTime - 30); break
        default: handled = false
      }
      if (handled) {
        e.preventDefault()
        paintProgress()
        paintTimecode()
      }
    })

    // hover scrub-time tooltip
    seekWrap.addEventListener('pointermove', (e) => {
      const d = video.duration
      if (!d) return
      const r = seekRail.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      scrubTip.textContent = fmt(ratio * d)
      scrubTip.style.left = `${ratio * 100}%`
      scrubTip.classList.add('is-visible')
    })
    seekWrap.addEventListener('pointerleave', () => scrubTip.classList.remove('is-visible'))

    /* ---------- volume interaction ---------- */

    volInput.addEventListener('input', () => {
      video.muted = false
      video.volume = Number(volInput.value) / 100
    })

    /* ---------- on-screen click / double-click seek ---------- */

    const screen = $('.player__screen')
    const flashBack = $('[data-flash="back"]')
    const flashFwd = $('[data-flash="fwd"]')
    const SKIP = 10
    let clickTimer = null

    function seekBy(delta) {
      const d = video.duration || 0
      video.currentTime = Math.min(d, Math.max(0, video.currentTime + delta))
      paintProgress()
      paintTimecode()
    }
    function flash(el) {
      if (reduceMotion) {
        el.style.opacity = '1'
        setTimeout(() => (el.style.opacity = ''), 320)
        return
      }
      el.classList.remove('is-on')
      void el.offsetWidth // restart the animation
      el.classList.add('is-on')
    }

    screen.addEventListener('click', (e) => {
      if (e.target.closest('button, a, input')) return
      // wait briefly to see if this is a double-click
      if (clickTimer) return
      clickTimer = setTimeout(() => {
        clickTimer = null
        togglePlay()
      }, 230)
    })
    screen.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, a, input')) return
      clearTimeout(clickTimer)
      clickTimer = null
      const r = screen.getBoundingClientRect()
      const forward = e.clientX - r.left > r.width / 2
      seekBy(forward ? SKIP : -SKIP)
      flash(forward ? flashFwd : flashBack)
      announce(forward ? 'Forward 10 seconds' : 'Back 10 seconds')
    })

    /* ---------- fullscreen state ---------- */

    ;['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) =>
      document.addEventListener(ev, () => {
        const fs = !!(document.fullscreenElement || document.webkitFullscreenElement)
        fsBtn.setAttribute('aria-pressed', String(fs))
        fsBtn.setAttribute('aria-label', fs ? 'Exit full screen' : 'Enter full screen')
      }),
    )

    /* ---------- picture in picture ---------- */

    if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
      pipBtn.hidden = false
      video.addEventListener('enterpictureinpicture', () => pipBtn.setAttribute('aria-pressed', 'true'))
      video.addEventListener('leavepictureinpicture', () => pipBtn.setAttribute('aria-pressed', 'false'))
    }

    /* ---------- global keyboard shortcuts ---------- */

    document.addEventListener('keydown', (e) => {
      const t = e.target
      if (t.matches('input, textarea, select, [contenteditable]')) return
      const onButton = t.tagName === 'BUTTON'
      const k = e.key.toLowerCase()
      switch (k) {
        case ' ': case 'k':
          if (onButton) return // let the focused button's native click fire
          togglePlay(); e.preventDefault(); break
        case 'arrowleft': video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); break
        case 'arrowright': video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); e.preventDefault(); break
        case 'arrowup': changeVolume(0.05); e.preventDefault(); break
        case 'arrowdown': changeVolume(-0.05); e.preventDefault(); break
        case 'm': toggleMute(); break
        case 'f': toggleFullscreen(); break
        case 'c': if (!ccBtn.hidden) toggleCaptions(); break
        case 'n': loadTrack(index + 1, !video.paused); break
        case 'p': loadTrack(index - 1, !video.paused); break
      }
    })

    /* ---------- boot ---------- */

    renderPlaylist()
    paintVolume()
    loadTrack(0, false)
  })
})()
