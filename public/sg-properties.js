/* Sangsters — live property sections for sangstersgroup.com
 * Data comes from the portal (Estate Agency → property → "Show on website").
 * Usage (Elementor → HTML widget):
 *   <div data-sg-properties="search"></div>     full search page: list + map
 *   <div data-sg-properties="carousel"></div>   home page "Stays & tenancies" cards
 *   <script src="https://app.sangstersgroup.com/sg-properties.js" defer></script>
 */
(function () {
  var SRC = (document.currentScript && document.currentScript.src) || 'https://app.sangstersgroup.com/sg-properties.js'
  var APP = SRC.replace(/\/sg-properties\.js.*$/, '')
  var FEED = APP + '/api/public/portfolio'
  var GOLD = '#A8862E', INK = '#1d1d1f', MUTED = '#6b6b6b', LINE = '#e6e2d8'
  var KIND = {
    stay: { label: 'Available — short stays', pin: 'STAY', color: '#1f9d55', cta: 'Send enquiry' },
    rent: { label: 'Available — long-term rent', pin: 'RENT', color: '#1f9d55', cta: 'View property' },
    development: { label: 'New development', pin: 'DEV', color: '#C9A646', cta: 'View development' },
    let: { label: 'Currently let / rented', pin: 'LET', color: '#c0392b', cta: 'Currently let' }
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function css() {
    if (document.getElementById('sgp-css')) return
    var s = document.createElement('style'); s.id = 'sgp-css'
    s.textContent = [
      '.sgp,.sgp *,.sgp-modal,.sgp-modal *,.sgp-lb,.sgp-lb *{box-sizing:border-box}.sgp{font-family:inherit;color:' + INK + ';background:#fff;padding:24px;border-radius:4px}',
      '[data-sg-properties]{background:#fff}',
      '.sgp-map img,.sgp-map .leaflet-tile{max-width:none !important;max-height:none !important;width:256px;height:256px;box-shadow:none !important;border:none !important;border-radius:0 !important;padding:0 !important;margin:0 !important}',
      '.sgp-map .leaflet-marker-icon,.sgp-map .leaflet-marker-icon img{width:auto;height:auto}',
      '.sgp-search{display:flex;gap:10px;background:#fff;border:1px solid ' + LINE + ';border-radius:4px;padding:10px;margin:0 0 22px}',
      '.sgp-search input{flex:1;border:none;outline:none;font:inherit;font-size:14px;padding:8px 10px;min-width:0;background:transparent}',
      '.sgp-search button{background:#111;color:#fff;border:none;border-radius:3px;padding:0 22px;font:inherit;font-size:12px;font-weight:700;letter-spacing:.06em;cursor:pointer}',
      '.sgp-head h2{font-size:24px;font-weight:700;margin:0 0 4px}.sgp-head p{font-size:13px;color:' + MUTED + ';margin:0 0 16px}',
      '.sgp-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}',
      '.sgp-list{display:grid;gap:14px}',
      '.sgp-row{display:grid;grid-template-columns:200px minmax(0,1fr);border:1px solid ' + LINE + ';background:#fff;border-radius:4px;overflow:hidden;cursor:pointer;transition:box-shadow .15s}',
      '.sgp-row:hover,.sgp-row.on{box-shadow:0 4px 18px rgba(0,0,0,.09)}',
      '.sgp-img{position:relative;background:#efe9dc center/cover no-repeat;min-height:140px}',
      '.sgp-img .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#a99a76;font-size:12px;text-align:center;padding:10px}',
      '.sgp-badge{position:absolute;top:10px;left:10px;background:#C9A646;color:#1d1d1f;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 8px;border-radius:2px}',
      '.sgp-badge.dark{background:#111;color:#fff}',
      '.sgp-count{position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;padding:3px 7px;border-radius:3px}',
      '.sgp-body{padding:16px 18px;min-width:0}',
      '.sgp-loc{font-size:10.5px;font-weight:700;letter-spacing:.08em;color:' + GOLD + ';text-transform:uppercase;margin-bottom:6px}',
      '.sgp-title{font-size:16px;font-weight:700;margin:0 0 8px;line-height:1.3}',
      '.sgp-specs{font-size:12.5px;color:' + MUTED + ';display:flex;gap:12px;flex-wrap:wrap}',
      '.sgp-cta{display:inline-block;margin-top:12px;font-size:12.5px;font-weight:700;color:' + GOLD + ';text-decoration:none;cursor:pointer}',
      '.sgp-cta.off{color:#c0392b}.sgp-rent{font-size:13px;font-weight:600;margin-top:8px}',
      '.sgp-map{position:sticky;top:90px;height:560px;border:1px solid ' + LINE + ';border-radius:4px;overflow:hidden;background:#dfe7ea}',
      '.sgp-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:' + MUTED + ';padding:10px 2px}',
      '.sgp-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:0}',
      '.sgp-pin{color:#fff;font-size:10px;font-weight:800;letter-spacing:.05em;padding:4px 8px;border-radius:3px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);transform:translate(-50%,-100%);display:inline-block;position:relative}',
      '.sgp-pin:after{content:"";position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:inherit}',
      '.sgp-carousel{display:flex;gap:18px;overflow-x:auto;padding:4px 2px 14px;scroll-snap-type:x mandatory}',
      '.sgp-card{flex:0 0 260px;background:#fff;border-radius:6px;overflow:hidden;scroll-snap-align:start;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column}',
      '.sgp-card .sgp-img{height:170px;min-height:0;cursor:pointer}',
      '.sgp-card .sgp-body{display:flex;flex-direction:column;flex:1}',
      '.sgp-card .sgp-specs{border-top:1px solid ' + LINE + ';padding-top:10px;margin-top:auto}',
      '.sgp-btn{display:block;text-align:center;background:#111;color:#fff !important;text-decoration:none;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:14px 10px;border-radius:3px;margin-top:14px}',
      '.sgp-btn.off{background:#ece7dc;color:#8a7b5a !important;pointer-events:none}',
      '.sgp-empty{padding:30px;color:' + MUTED + ';font-size:14px}',
      '.sgp-lb{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999999;display:flex;align-items:center;justify-content:center}',
      '.sgp-lb img{max-width:92vw;max-height:84vh;object-fit:contain}',
      '.sgp-lb button{position:absolute;background:rgba(255,255,255,.12);color:#fff;border:none;font-size:28px;width:48px;height:48px;border-radius:50%;cursor:pointer}',
      '.sgp-lb .x{top:18px;right:18px;font-size:22px}.sgp-lb .p{left:18px}.sgp-lb .n{right:18px}',
      '.sgp-lb .c{position:absolute;bottom:18px;left:0;right:0;text-align:center;color:#ddd;font-size:13px}',
      '.sgp-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:12px}',
      '.sgp-enq{position:relative;background:#fff;width:min(560px,94vw);max-height:92vh;overflow:auto;border-radius:6px;padding:26px 24px;color:' + INK + ';font-family:inherit;text-align:left}',
      '.sgp-enq h3{margin:0 0 4px;font-size:20px}.sgp-sub{font-size:13px;color:' + MUTED + ';margin:0 0 16px}',
      '.sgp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.sgp-enq label{display:block;font-size:12px;font-weight:600;color:#444}.sgp-full{margin-top:12px}',
      '.sgp-enq input,.sgp-enq textarea{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d6d1c4;border-radius:3px;font:inherit;font-size:14px;color:' + INK + ';background:#fff}',
      '.sgp-enq input:focus,.sgp-enq textarea:focus{outline:none;border-color:' + GOLD + '}',
      '.sgp-enq .sgp-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;border:none;background:#f2efe8;color:#333;font-size:15px;cursor:pointer}',
      '.sgp-send{width:100%;border:none;cursor:pointer;font-family:inherit}.sgp-send:disabled{opacity:.6}',
      '.sgp-err{color:#c0392b;font-size:13px;min-height:18px;margin-top:10px}',
      '.sgp-done{text-align:center;padding:20px 6px}.sgp-done p{font-size:14px;color:#444;line-height:1.6}',
      '.sgp-tick{width:54px;height:54px;border-radius:50%;background:#1f9d55;color:#fff;font-size:28px;line-height:54px;margin:0 auto 12px}',
      '.sgp-btn{border:none;width:100%;cursor:pointer;font-family:inherit}',
      '@media(max-width:560px){.sgp-grid{grid-template-columns:1fr}}',
      '@media(max-width:900px){.sgp-wrap{grid-template-columns:1fr}.sgp-map{position:relative;top:0;height:360px;order:-1}}',
      '@media(max-width:560px){.sgp-row{grid-template-columns:1fr}.sgp-row .sgp-img{min-height:190px}}'
    ].join('\n')
    document.head.appendChild(s)
  }

  var feed = null
  function load() {
    if (!feed) feed = fetch(FEED, { mode: 'cors' }).then(function (r) { return r.json() }).then(function (d) { return d.properties || [] })
    return feed
  }
  function specs(p) {
    return [p.guests ? p.guests + ' Guests' : '', p.beds, p.baths].filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>' }).join('')
  }
  function badge(p) {
    var b = p.badge || (p.status === 'let' ? 'Currently let' : '')
    return b ? '<span class="sgp-badge' + (/^(uk|uae|us)$/i.test(b) ? ' dark' : '') + '">' + esc(b) + '</span>' : ''
  }
  function img(p) {
    return '<div class="sgp-img" data-lb="' + esc(p.id) + '" style="' + (p.cover ? "background-image:url('" + esc(p.cover) + "')" : '') + '">' +
      (p.cover ? '' : '<span class="ph">Photos coming soon</span>') + badge(p) +
      ((p.photo_count || 0) > 1 ? '<span class="sgp-count">📷 ' + p.photo_count + '</span>' : '') + '</div>'
  }
  function lightbox(p, start) {
    if (!p.photos || !p.photos.length) return
    var i = start || 0, el = document.createElement('div'); el.className = 'sgp-lb'
    function draw() { el.innerHTML = '<img src="' + esc(p.photos[i]) + '" alt=""><button class="x" aria-label="Close">✕</button>' + (p.photos.length > 1 ? '<button class="p" aria-label="Previous">‹</button><button class="n" aria-label="Next">›</button>' : '') + '<div class="c">' + esc(p.title) + ' · ' + (i + 1) + ' / ' + p.photos.length + '</div>' }
    function close() { el.remove(); document.removeEventListener('keydown', key) }
    function key(e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { i = (i + 1) % p.photos.length; draw() } if (e.key === 'ArrowLeft') { i = (i - 1 + p.photos.length) % p.photos.length; draw() } }
    el.addEventListener('click', function (e) {
      var t = e.target
      if (t.classList.contains('n')) { i = (i + 1) % p.photos.length; draw() } else if (t.classList.contains('p')) { i = (i - 1 + p.photos.length) % p.photos.length; draw() } else if (t.tagName !== 'IMG') close()
    })
    document.addEventListener('keydown', key); draw(); document.body.appendChild(el)
  }
  function ctaLink(p, cls) {
    if (p.status === 'let') return '<span class="' + cls + ' off">Currently let</span>'
    return '<a class="' + cls + '" href="#" data-enq="' + esc(p.id) + '">Send enquiry' + (cls === 'sgp-cta' ? ' →' : '') + '</a>'
  }

  // ---------- enquiry form (goes to the CRM) ----------
  function enquiry(p) {
    var stay = p.kind === 'stay'
    var el = document.createElement('div'); el.className = 'sgp-modal'
    var today = new Date().toISOString().slice(0, 10)
    el.innerHTML = '<form class="sgp-enq" novalidate><button type="button" class="sgp-x" aria-label="Close">✕</button>' +
      '<div class="sgp-loc">' + esc(p.location || '') + '</div><h3>' + esc(p.title) + '</h3><p class="sgp-sub">Send us an enquiry and our team will get back to you shortly.</p>' +
      '<div class="sgp-grid"><label>Full name*<input name="name" autocomplete="name" required></label><label>Email*<input name="email" type="email" autocomplete="email" required></label>' +
      '<label>Phone<input name="phone" type="tel" autocomplete="tel"></label>' +
      (stay ? '<label>Guests<input name="guests" type="number" min="1" max="' + (p.guests || 20) + '" placeholder="' + (p.guests ? 'Up to ' + p.guests : '') + '"></label><label>Check-in<input name="check_in" type="date" min="' + today + '"></label><label>Check-out<input name="check_out" type="date" min="' + today + '"></label>'
        : '<label>Move-in date<input name="move_in" type="date" min="' + today + '"></label>') +
      '</div><label class="sgp-full">Message<textarea name="message" rows="3" placeholder="Anything you\'d like us to know"></textarea></label>' +
      '<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
      '<div class="sgp-err"></div><button type="submit" class="sgp-btn sgp-send">Send enquiry</button></form>'
    function close() { el.remove(); document.removeEventListener('keydown', key) }
    function key(e) { if (e.key === 'Escape') close() }
    el.addEventListener('click', function (e) { if (e.target === el || e.target.classList.contains('sgp-x')) close() })
    document.addEventListener('keydown', key)
    var form = el.querySelector('form'), err = el.querySelector('.sgp-err'), btn = el.querySelector('.sgp-send')
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = ''
      var d = {}; Array.prototype.forEach.call(form.elements, function (x) { if (x.name) d[x.name] = x.value })
      if (!d.name.trim()) { err.textContent = 'Please add your name.'; return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) { err.textContent = 'Please add a valid email address.'; return }
      if (d.check_in && d.check_out && d.check_out <= d.check_in) { err.textContent = 'Check-out must be after check-in.'; return }
      d.property_id = p.id; btn.disabled = true; btn.textContent = 'Sending…'
      fetch(APP + '/api/public/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || 'Something went wrong'); return j }) })
        .then(function () { form.innerHTML = '<button type="button" class="sgp-x" aria-label="Close">✕</button><div class="sgp-done"><div class="sgp-tick">✓</div><h3>Enquiry sent</h3><p>Thank you, ' + esc(d.name.trim().split(' ')[0]) + '. We\'ve received your enquiry about <b>' + esc(p.title) + '</b> and will be in touch shortly. A copy has been sent to your email.</p></div>' })
        .catch(function (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = 'Send enquiry' })
    })
    document.body.appendChild(el)
    setTimeout(function () { var f = el.querySelector('input[name=name]'); f && f.focus() }, 50)
  }

  // ---------- home page carousel ----------
  function carousel(root) {
    root.innerHTML = '<div class="sgp"><div class="sgp-carousel"><div class="sgp-empty">Loading properties…</div></div></div>'
    load().then(function (list) {
      var box = root.querySelector('.sgp-carousel')
      if (!list.length) { box.innerHTML = '<div class="sgp-empty">Properties coming soon.</div>'; return }
      box.innerHTML = list.map(function (p) {
        return '<div class="sgp-card">' + img(p) + '<div class="sgp-body"><div class="sgp-loc">' + esc(p.location || '') + '</div><div class="sgp-title">' + esc(p.title) + '</div>' +
          '<div class="sgp-specs">' + specs(p) + '</div>' +
          ctaLink(p, 'sgp-btn') + '</div></div>'
      }).join('')
      bindLightbox(root, list)
    }).catch(function () { root.querySelector('.sgp-carousel').innerHTML = '<div class="sgp-empty">Properties are unavailable right now.</div>' })
  }

  // ---------- search page: list + map ----------
  function leaflet(cb) {
    if (window.L) return cb(window.L)
    if (!document.querySelector('link[data-sgp-leaflet]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.setAttribute('data-sgp-leaflet', '1'); document.head.appendChild(l) }
    var s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = function () { cb(window.L) }; document.head.appendChild(s)
  }
  function search(root) {
    var q0 = new URLSearchParams(location.search).get('q') || ''
    root.innerHTML = '<div class="sgp"><form class="sgp-search"><input type="search" placeholder="Search location — e.g. Montego Bay, Dubai, Manchester" value="' + esc(q0) + '"><button type="submit">SEARCH</button></form>' +
      '<div class="sgp-head"><h2>Loading properties…</h2><p></p></div><div class="sgp-wrap"><div class="sgp-list"></div><div><div class="sgp-map"></div><div class="sgp-legend"></div></div></div></div>'
    var input = root.querySelector('input'), listEl = root.querySelector('.sgp-list'), head = root.querySelector('.sgp-head')
    var map = null, markers = {}, all = [], shown = {}, afterRender = function () {}
    function countries(list) { var c = {}; list.forEach(function (p) { if (p.country) c[p.country] = 1 }); return Object.keys(c) }
    function render() {
      var q = input.value.trim().toLowerCase()
      var list = all.filter(function (p) { return !q || [p.title, p.area, p.country, p.location].join(' ').toLowerCase().indexOf(q) >= 0 })
      head.innerHTML = '<h2>' + list.length + ' Propert' + (list.length === 1 ? 'y' : 'ies') + (q ? ' matching “' + esc(input.value.trim()) + '”' : '') + '</h2><p>Stays &amp; residences across ' + esc(countries(all).join(', ').replace(/, ([^,]*)$/, ' and $1')) + '</p>'
      listEl.innerHTML = list.length ? list.map(function (p) {
        return '<div class="sgp-row" data-id="' + esc(p.id) + '">' + img(p) + '<div class="sgp-body"><div class="sgp-loc">' + esc(p.location || '') + '</div><div class="sgp-title">' + esc(p.title) + '</div><div class="sgp-specs">' + specs(p) + '</div>' +
          (p.rent ? '<div class="sgp-rent">' + esc(p.rent) + '</div>' : '') + ctaLink(p, 'sgp-cta') + '</div></div>'
      }).join('') : '<div class="sgp-empty">No properties match that search. Try another location.</div>'
      bindLightbox(root, all)
      Array.prototype.forEach.call(listEl.querySelectorAll('.sgp-row'), function (row) {
        row.addEventListener('click', function (e) {
          if (e.target.closest('a,[data-lb]')) return
          var m = markers[row.getAttribute('data-id')]; if (m && map) { map.flyTo(m.getLatLng(), 12, { duration: .8 }); m.openPopup() }
        })
      })
      if (map) {
        var pts = []; shown = {}
        list.forEach(function (p) { if (markers[p.id]) { shown[p.id] = 1; pts.push(markers[p.id].getLatLng()) } })
        if (pts.length) map.fitBounds(window.L.latLngBounds(pts).pad(0.3), { maxZoom: 12 })
        afterRender()
      }
    }
    root.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); render() })
    input.addEventListener('input', render)
    load().then(function (list) {
      all = list; render()
      var used = {}; list.forEach(function (p) { used[p.kind] = 1 })
      root.querySelector('.sgp-legend').innerHTML = ['stay', 'rent', 'development', 'let'].filter(function (k) { return used[k] }).map(function (k) { return '<span><i style="background:' + KIND[k].color + '"></i>' + KIND[k].label + '</span>' }).join('')
      leaflet(function (L) {
        map = L.map(root.querySelector('.sgp-map'), { scrollWheelZoom: false, worldCopyJump: true }).setView([30, -20], 2)
        root.querySelector('.sgp-map').addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-enq-pop]'); if (!a) return; e.preventDefault(); var p = all.filter(function (x) { return x.id === a.getAttribute('data-enq-pop') })[0]; if (p) enquiry(p) })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map)
        var mapEl = root.querySelector('.sgp-map')
        setTimeout(function () { map.invalidateSize() }, 300); setTimeout(function () { map.invalidateSize() }, 1500)
        if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize() }).observe(mapEl)
        // zoomed out: one pin per country with a count; zoomed in: each property
        var groups = {}
        list.forEach(function (p) { if (p.lat == null || p.lng == null) return; var c = p.country || 'Other'; (groups[c] = groups[c] || []).push(p) })
        var groupMarkers = Object.keys(groups).map(function (c) {
          var ps = groups[c], lat = 0, lng = 0; ps.forEach(function (p) { lat += p.lat; lng += p.lng })
          var avail = ps.some(function (p) { return p.status !== 'let' })
          var icon = L.divIcon({ className: '', html: '<span class="sgp-pin" style="background:' + (avail ? '#1f9d55' : '#c0392b') + ';border-top-color:' + (avail ? '#1f9d55' : '#c0392b') + '">' + esc(c.toUpperCase()) + ' · ' + ps.length + '</span>', iconSize: [0, 0] })
          var m = L.marker([lat / ps.length, lng / ps.length], { icon: icon })
          m.on('click', function () { var b = L.latLngBounds(ps.map(function (p) { return [p.lat, p.lng] })); map.fitBounds(b.pad(0.5), { maxZoom: 13 }); if (ps.length === 1) setTimeout(function () { markers[ps[0].id] && markers[ps[0].id].openPopup() }, 400) })
          return { m: m, ps: ps }
        })
        function zoomMode() {
          var out = map.getZoom() < 7
          groupMarkers.forEach(function (g) { var vis = g.ps.some(function (p) { return shown[p.id] }); if (out && vis) g.m.addTo(map); else g.m.remove() })
          Object.keys(markers).forEach(function (id) { if (!out && shown[id]) markers[id].addTo(map); else markers[id].remove() })
        }
        map.on('zoomend', zoomMode); afterRender = zoomMode
        list.forEach(function (p) {
          if (p.lat == null || p.lng == null) return
          var k = KIND[p.kind] || KIND.rent
          var icon = L.divIcon({ className: '', html: '<span class="sgp-pin" style="background:' + k.color + ';border-top-color:' + k.color + '">' + k.pin + '</span>', iconSize: [0, 0] })
          markers[p.id] = L.marker([p.lat, p.lng], { icon: icon }).bindPopup('<b>' + esc(p.title) + '</b><br>' + esc([p.area, p.country].filter(Boolean).join(', ')) + (p.status !== 'let' ? '<br><a href="#" data-enq-pop="' + esc(p.id) + '">Send enquiry →</a>' : '<br><span style="color:#c0392b">Currently let</span>'))
          markers[p.id].on('click', function () { var row = listEl.querySelector('[data-id="' + p.id + '"]'); if (row) { Array.prototype.forEach.call(listEl.querySelectorAll('.sgp-row.on'), function (r) { r.classList.remove('on') }); row.classList.add('on'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } })
        })
        render()
      })
    }).catch(function () { head.innerHTML = '<h2>Properties are unavailable right now</h2><p>Please try again shortly.</p>' })
  }

  function bindLightbox(root, list) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-enq]'), function (el) {
      if (el._sgp) return; el._sgp = 1
      el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var p = list.filter(function (x) { return x.id === el.getAttribute('data-enq') })[0]; if (p) enquiry(p) })
    })
    Array.prototype.forEach.call(root.querySelectorAll('[data-lb]'), function (el) {
      if (el._sgp) return; el._sgp = 1
      el.addEventListener('click', function (e) { e.stopPropagation(); var p = list.filter(function (x) { return x.id === el.getAttribute('data-lb') })[0]; if (p) lightbox(p, 0) })
    })
  }

  function init() {
    css()
    Array.prototype.forEach.call(document.querySelectorAll('[data-sg-properties]'), function (el) {
      if (el._sgp) return; el._sgp = 1
      var v = el.getAttribute('data-sg-properties')
      if (v === 'search') search(el); else carousel(el)
    })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init()
})()
