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
    stay: { label: 'Available to book', pin: 'STAY', color: '#1f9d55', cta: 'Book on Airbnb' },
    rent: { label: 'Available to rent', pin: 'RENT', color: '#1f9d55', cta: 'View property' },
    development: { label: 'New development', pin: 'DEV', color: '#C9A646', cta: 'View development' },
    let: { label: 'Currently let / rented', pin: 'LET', color: '#c0392b', cta: 'Currently let' }
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function css() {
    if (document.getElementById('sgp-css')) return
    var s = document.createElement('style'); s.id = 'sgp-css'
    s.textContent = [
      '.sgp,.sgp *{box-sizing:border-box}.sgp{font-family:inherit;color:' + INK + '}',
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
      '.sgp-cta{display:inline-block;margin-top:12px;font-size:12.5px;font-weight:700;color:' + GOLD + ';text-decoration:none}',
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
      (p.photos && p.photos.length > 1 ? '<span class="sgp-count">📷 ' + p.photos.length + '</span>' : '') + '</div>'
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
    var k = KIND[p.kind] || KIND.rent
    if (!p.url) return '<span class="' + cls + ' off">' + esc(p.status === 'let' ? 'Currently let' : 'Enquire') + '</span>'
    return '<a class="' + cls + '" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(k.cta) + (cls === 'sgp-cta' ? ' →' : '') + '</a>'
  }

  // ---------- home page carousel ----------
  function carousel(root) {
    root.innerHTML = '<div class="sgp"><div class="sgp-carousel"><div class="sgp-empty">Loading properties…</div></div></div>'
    load().then(function (list) {
      var box = root.querySelector('.sgp-carousel')
      if (!list.length) { box.innerHTML = '<div class="sgp-empty">Properties coming soon.</div>'; return }
      box.innerHTML = list.map(function (p) {
        var label = p.status === 'let' ? 'Currently let' : p.kind === 'stay' ? 'View stay' : 'View property'
        return '<div class="sgp-card">' + img(p) + '<div class="sgp-body"><div class="sgp-loc">' + esc(p.location || '') + '</div><div class="sgp-title">' + esc(p.title) + '</div>' +
          '<div class="sgp-specs">' + specs(p) + '</div>' +
          (p.url ? '<a class="sgp-btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + label + '</a>' : '<span class="sgp-btn off">' + label + '</span>') + '</div></div>'
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
    var map = null, markers = {}, all = []
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
        var pts = []
        Object.keys(markers).forEach(function (id) { var show = list.some(function (p) { return p.id === id }); if (show) { markers[id].addTo(map); pts.push(markers[id].getLatLng()) } else markers[id].remove() })
        if (pts.length) map.fitBounds(window.L.latLngBounds(pts).pad(0.3), { maxZoom: 12 })
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
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map)
        list.forEach(function (p) {
          if (p.lat == null || p.lng == null) return
          var k = KIND[p.kind] || KIND.rent
          var icon = L.divIcon({ className: '', html: '<span class="sgp-pin" style="background:' + k.color + ';border-top-color:' + k.color + '">' + k.pin + '</span>', iconSize: [0, 0] })
          markers[p.id] = L.marker([p.lat, p.lng], { icon: icon }).bindPopup('<b>' + esc(p.title) + '</b><br>' + esc([p.area, p.country].filter(Boolean).join(', ')) + (p.url ? '<br><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(k.cta) + ' →</a>' : ''))
          markers[p.id].on('click', function () { var row = listEl.querySelector('[data-id="' + p.id + '"]'); if (row) { Array.prototype.forEach.call(listEl.querySelectorAll('.sgp-row.on'), function (r) { r.classList.remove('on') }); row.classList.add('on'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) } })
        })
        render()
      })
    }).catch(function () { head.innerHTML = '<h2>Properties are unavailable right now</h2><p>Please try again shortly.</p>' })
  }

  function bindLightbox(root, list) {
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
