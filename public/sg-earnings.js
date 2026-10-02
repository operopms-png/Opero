/* Sangsters — "Let with us" landlord earnings calculator for sangstersgroup.com.
 * A bar on the page (area, bedrooms, email) opens a "Calculate your income"
 * pop-up: a few quick questions, contact details, then the estimated monthly
 * revenue from live listings. Every landlord lands in the portal
 * (Staff Centre → Landlord Leads, plus the CRM).
 * Usage (Elementor → HTML widget):
 *   <div data-sg-earnings></div>                 the "Let with us" bar
 *   <div data-sg-earnings="button"></div>        just a "Calculate your income" button
 *   <script src="https://app.sangstersgroup.com/sg-earnings.js" defer></script>
 * Any link with href="#sg-earnings" also opens the pop-up.
 */
(function () {
  var SRC = (document.currentScript && document.currentScript.src) || 'https://app.sangstersgroup.com/sg-earnings.js'
  var APP = SRC.replace(/\/sg-earnings\.js.*$/, '')
  var API = APP + '/api/public/earnings-estimate'
  var MEET = 'https://app.sangstersgroup.com/meeting'
  var INK = '#191815', GOLD = '#8E6B1F', GOLD2 = '#C9A24A', MUTED = '#6b675e', LINE = '#e3ded2', SOFT = '#f7f4ee'
  var SYM = { USD: '$', JMD: 'J$', GBP: '£' }
  var CUR = { 'Jamaica': 'USD', 'United Kingdom': 'GBP', 'UAE': 'USD' }

  // shared answers between the bar and the pop-up
  var st = { d: { location: '', bedrooms: 2, email: '', consent: false, country: '', goal: '', rent_type: '', start_when: '', name: '', phone: '', marketing: '' } }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function money(n, c) { return n == null ? '—' : (SYM[c] || '') + Math.round(n).toLocaleString('en-GB') }
  function beds(n) { return n === 0 ? 'Studio' : n + (n === 1 ? ' bedroom' : ' bedrooms') }
  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '') }

  function css() {
    if (document.getElementById('sge-css')) return
    var s = document.createElement('style'); s.id = 'sge-css'
    s.textContent = [
      '.sge-bar,.sge-bar *,.sge-ov,.sge-ov *{box-sizing:border-box}',
      /* bar */
      '.sge-bar{font-family:inherit;background:' + INK + ';color:#fff;padding:26px 28px 20px;border-radius:4px}',
      '.sge-bar h3{margin:0 0 4px;font-size:28px;font-weight:700;letter-spacing:-.01em;color:#fff}',
      '.sge-bar p{margin:0 0 16px;font-size:15px;color:#cfc9bc}',
      '.sge-row{display:grid;grid-template-columns:minmax(0,1.3fr) 190px minmax(0,1.4fr) 54px;gap:8px}',
      '.sge-in{font:inherit;font-size:15px;height:48px;border:1px solid transparent;border-radius:3px;padding:0 14px;background:#fff;color:' + INK + ';outline:none;width:100%;min-width:0}',
      '.sge-in:focus{border-color:' + GOLD2 + '}',
      '.sge-step{display:flex;align-items:center;height:48px;background:#fff;border-radius:3px;color:' + INK + ';padding-left:14px;font-size:15px}',
      '.sge-step span{flex:1;white-space:nowrap}',
      '.sge-step button{width:40px;height:48px;border:none;border-left:1px solid ' + LINE + ';background:#fff;color:' + INK + ';font-size:20px;cursor:pointer;font-family:inherit}',
      '.sge-go{height:48px;border:none;border-radius:3px;background:' + GOLD2 + ';color:' + INK + ';cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.sge-agree{display:flex;align-items:center;gap:8px;font-size:13px;color:#cfc9bc;margin-top:12px}',
      '.sge-agree input{width:16px;height:16px;accent-color:' + GOLD2 + '}',
      '.sge-agree a{color:#fff}',
      '.sge-barerr{color:#ffb4a8;font-size:13px;margin-top:8px;min-height:1px}',
      '.sge-open{font:inherit;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:' + INK + ';color:#fff;border:none;border-radius:3px;padding:16px 26px;cursor:pointer}',
      /* pop-up */
      '.sge-ov{position:fixed;inset:0;background:rgba(15,14,12,.62);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}',
      '.sge-box{position:relative;background:#fff;color:' + INK + ';width:100%;max-width:420px;border-radius:4px;padding:26px 26px 24px;box-shadow:0 24px 70px rgba(0,0,0,.35);max-height:calc(100vh - 32px);overflow:auto}',
      '.sge-box.wide{max-width:600px}',
      '.sge-x{position:absolute;right:10px;top:8px;border:none;background:none;font:inherit;font-size:13px;color:' + MUTED + ';cursor:pointer;padding:6px}',
      '.sge-box h2{margin:0;text-align:center;font-size:23px;font-weight:700;letter-spacing:-.01em}',
      '.sge-dots{display:flex;justify-content:center;gap:6px;margin:12px 0 18px}.sge-dots i{width:34px;height:3px;border-radius:2px;background:' + LINE + '}.sge-dots i.on{background:' + GOLD + '}',
      '.sge-f{margin-bottom:10px}',
      '.sge-f input{font:inherit;font-size:15px;width:100%;height:46px;border:1px solid ' + LINE + ';border-radius:3px;padding:0 13px;outline:none;color:' + INK + '}',
      '.sge-f input:focus{border-color:' + INK + '}',
      '.sge-box .sge-step{border:1px solid ' + LINE + ';margin-bottom:10px}',
      '.sge-q{font-size:13.5px;font-weight:700;margin:14px 0 8px}',
      '.sge-pills{display:grid;gap:8px}.sge-pills.c2{grid-template-columns:1fr 1fr}.sge-pills.c3{grid-template-columns:1fr 1fr 1fr}',
      '.sge-pill{font:inherit;font-size:13.5px;height:40px;border:1px solid ' + LINE + ';border-radius:20px;background:#fff;color:' + INK + ';cursor:pointer;padding:0 8px}',
      '.sge-pill.on{background:' + INK + ';border-color:' + INK + ';color:#fff;font-weight:600}',
      '.sge-btn{display:flex;align-items:center;justify-content:center;width:100%;height:50px;margin-top:18px;border:none;border-radius:3px;background:' + INK + ';color:#fff !important;font:inherit;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none}',
      '.sge-btn.gold{background:' + GOLD + '}',
      '.sge-err{color:#b42318;font-size:13px;margin-top:10px}',
      '.sge-chk{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:' + MUTED + ';margin-top:4px}.sge-chk input{margin-top:2px;width:16px;height:16px;accent-color:' + INK + '}',
      '.sge-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
      '.sge-load{text-align:center;padding:10px 0 4px}.sge-load b{display:block;font-size:16px;margin-bottom:4px}.sge-load p{margin:0;font-size:13.5px;color:' + MUTED + '}',
      '.sge-prog{height:4px;background:' + SOFT + ';border-radius:2px;overflow:hidden;margin:18px 0 0}.sge-prog i{display:block;height:100%;width:0;background:' + GOLD + ';transition:width 1s linear}',
      '.sge-res{text-align:center}',
      '.sge-res .lbl{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:' + GOLD + ';margin-top:6px}',
      '.sge-res .big{font-size:40px;font-weight:700;letter-spacing:-.02em;margin:6px 0 4px;color:' + INK + '}',
      '.sge-res .alt{display:inline-block;background:' + SOFT + ';border-radius:3px;padding:8px 14px;font-size:13.5px;margin:6px 0 10px}',
      '.sge-res .note{font-size:12px;color:' + MUTED + ';line-height:1.5;margin:6px auto 0;max-width:470px}',
      '.sge-res .msg{font-size:14px;line-height:1.55;margin:14px auto 0;max-width:500px}',
      '.sge-cta{display:flex;gap:10px;justify-content:center;align-items:center;margin-top:16px;flex-wrap:wrap}',
      '.sge-cta a{flex:1;min-width:170px;margin:0}.sge-cta em{font-style:normal;font-size:12px;font-weight:700;color:' + MUTED + '}',
      '.sge-comps{text-align:left;margin-top:16px;border-top:1px solid ' + LINE + ';padding-top:10px}',
      '.sge-comps div{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-bottom:1px solid ' + SOFT + '}',
      '.sge-comps a{color:' + GOLD + ';text-decoration:none;font-weight:600}.sge-comps span{color:' + MUTED + ';white-space:nowrap}',
      '@media(max-width:760px){.sge-row{grid-template-columns:1fr 1fr}.sge-row .sge-in:first-child{grid-column:1/-1}.sge-row .sge-go{grid-column:1/-1}.sge-bar h3{font-size:24px}}',
      '@media(max-width:460px){.sge-pills.c3{grid-template-columns:1fr 1fr}.sge-box{padding:24px 18px 20px}}',
    ].join('\n')
    document.head.appendChild(s)
  }

  var ARROW = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
  function stepper() { return '<div class="sge-step"><span data-bedlbl>' + beds(st.d.bedrooms) + '</span><button type="button" aria-label="Fewer bedrooms" data-bed="-1">−</button><button type="button" aria-label="More bedrooms" data-bed="1">+</button></div>' }
  function wireStepper(root) {
    root.querySelectorAll('[data-bed]').forEach(function (b) {
      b.onclick = function () { st.d.bedrooms = Math.max(0, Math.min(10, st.d.bedrooms + parseInt(b.getAttribute('data-bed')))); root.querySelectorAll('[data-bedlbl]').forEach(function (x) { x.textContent = beds(st.d.bedrooms) }) }
    })
  }

  /* ---------- the "Let with us" bar ---------- */
  function mountBar(el) {
    el.innerHTML = '<div class="sge-bar"><h3>Let with us</h3><p>See how much your property could earn:</p>' +
      '<div class="sge-row"><input class="sge-in" data-k="location" aria-label="Where is the property?" placeholder="Area or postcode of property">' + stepper() +
      '<input class="sge-in" data-k="email" type="email" autocomplete="email" aria-label="Email address" placeholder="Email address">' +
      '<button type="button" class="sge-go" aria-label="Calculate your income">' + ARROW + '</button></div>' +
      '<label class="sge-agree"><input type="checkbox" data-k="consent"> I agree to be contacted about my property</label><div class="sge-barerr"></div></div>'
    wireStepper(el)
    el.querySelector('.sge-go').onclick = function () {
      var loc = el.querySelector('[data-k=location]').value.trim(), em = el.querySelector('[data-k=email]').value.trim(), ok = el.querySelector('[data-k=consent]').checked
      var e = el.querySelector('.sge-barerr')
      if (!loc) return (e.textContent = 'Please add where the property is.')
      if (!emailOk(em)) return (e.textContent = 'Please add a valid email address.')
      if (!ok) return (e.textContent = 'Please tick the box to continue.')
      e.textContent = ''
      st.d.location = loc; st.d.email = em; st.d.consent = true
      open(2)
    }
  }

  /* ---------- the pop-up ---------- */
  var ov = null, timer = null
  function close() { if (timer) clearInterval(timer); timer = null; if (ov) { ov.remove(); ov = null; document.body.style.overflow = '' } }
  function open(step) {
    close()
    ov = document.createElement('div'); ov.className = 'sge-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true')
    ov.onclick = function (e) { if (e.target === ov) close() }
    document.body.appendChild(ov); document.body.style.overflow = 'hidden'
    show(step)
  }
  function frame(inner, step, wide) {
    ov.innerHTML = '<div class="sge-box' + (wide ? ' wide' : '') + '"><button type="button" class="sge-x">Cancel ×</button>' + inner + '</div>'
    ov.querySelector('.sge-x').onclick = close
    if (step) { var d = ov.querySelector('.sge-dots'); if (d) d.querySelectorAll('i').forEach(function (i, n) { if (n < step) i.className = 'on' }) }
  }
  function err(m) { var e = ov.querySelector('.sge-err'); if (e) { e.textContent = m; e.hidden = false } }
  function pills(key, list, cols) {
    return '<div class="sge-pills c' + cols + '">' + list.map(function (o) { return '<button type="button" class="sge-pill' + (st.d[key] === o[0] ? ' on' : '') + '" data-p="' + key + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>' }).join('') + '</div>'
  }
  function wirePills() {
    ov.querySelectorAll('[data-p]').forEach(function (b) {
      b.onclick = function () { var k = b.getAttribute('data-p'); st.d[k] = b.getAttribute('data-v'); ov.querySelectorAll('[data-p="' + k + '"]').forEach(function (x) { x.classList.toggle('on', x === b) }) }
    })
  }
  var HEAD = '<h2>Calculate your income</h2><div class="sge-dots"><i></i><i></i><i></i></div>'

  function show(step) {
    if (step === 1) {
      frame(HEAD + '<div class="sge-f"><input data-k="location" aria-label="Where is the property?" placeholder="Area or postcode of property" value="' + esc(st.d.location) + '"></div>' + stepper() +
        '<div class="sge-f"><input data-k="email" type="email" autocomplete="email" aria-label="Email" placeholder="Email" value="' + esc(st.d.email) + '"></div>' +
        '<label class="sge-chk"><input type="checkbox" data-k="consent"' + (st.d.consent ? ' checked' : '') + '> I agree to be contacted about my property</label>' +
        '<div class="sge-err" hidden></div><button type="button" class="sge-btn" data-next>Calculate your income</button>', 1)
      wireStepper(ov)
      ov.querySelector('[data-next]').onclick = function () {
        st.d.location = ov.querySelector('[data-k=location]').value.trim(); st.d.email = ov.querySelector('[data-k=email]').value.trim(); st.d.consent = ov.querySelector('[data-k=consent]').checked
        if (!st.d.location) return err('Please add where the property is.')
        if (!emailOk(st.d.email)) return err('Please add a valid email address.')
        if (!st.d.consent) return err('Please tick the box to continue.')
        show(2)
      }
    }
    if (step === 2) {
      frame(HEAD +
        '<div class="sge-q">Where is the property?</div>' + pills('country', [['Jamaica', 'Jamaica'], ['United Kingdom', 'UK'], ['UAE', 'UAE']], 3) +
        '<div class="sge-q">How would you like to let it?</div>' + pills('goal', [['Holiday let management', 'Holiday let'], ['Long-term let', 'Long-term let'], ['Guaranteed rent', 'Guaranteed rent']], 3) +
        '<div class="sge-q">Do you wish to rent out your entire property?</div>' + pills('rent_type', [['Whole property', 'Whole property'], ['Private room', 'Private room']], 2) +
        '<div class="sge-q">When would you like to start?</div>' + pills('start_when', [['ASAP', 'ASAP'], ['1-3 months', '1–3 months'], ['3 months+', '3 months +']], 3) +
        '<div class="sge-err" hidden></div><button type="button" class="sge-btn" data-next>Confirm availability</button>', 2)
      wirePills()
      ov.querySelector('[data-next]').onclick = function () {
        if (!st.d.country || !st.d.goal || !st.d.rent_type || !st.d.start_when) return err('Please answer each question.')
        show(3)
      }
    }
    if (step === 3) {
      frame(HEAD + '<div class="sge-f"><input data-k="name" autocomplete="name" aria-label="Full name" placeholder="Full name" value="' + esc(st.d.name) + '"></div>' +
        '<div class="sge-f"><input data-k="phone" type="tel" autocomplete="tel" aria-label="Phone number" placeholder="Phone or WhatsApp number" value="' + esc(st.d.phone) + '"></div>' +
        '<div class="sge-q">Would you like to receive emails about our services and property hosting?</div>' + pills('marketing', [['yes', 'Yes'], ['no', 'No']], 2) +
        '<div class="sge-hp" aria-hidden="true"><label>Website<input data-k="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<div class="sge-err" hidden></div><button type="button" class="sge-btn gold" data-next>Confirm contact details</button>', 3)
      wirePills()
      ov.querySelector('[data-next]').onclick = function () {
        st.d.name = ov.querySelector('[data-k=name]').value.trim(); st.d.phone = ov.querySelector('[data-k=phone]').value.trim()
        if (!st.d.name) return err('Please add your full name.')
        if (!st.d.phone) return err('Please add a phone number so a local expert can reach you.')
        if (!st.d.marketing) return err('Please choose Yes or No.')
        submit(ov.querySelector('[data-k=website]').value)
      }
    }
  }

  function submit(hp) {
    var d = st.d, cur = CUR[d.country] || 'USD'
    frame('<h2>Calculating your income</h2><div class="sge-load" aria-live="polite" style="margin-top:14px"><b data-msg>Searching holiday lets near ' + esc(d.location) + '…</b><p>We check real listings — about 40 seconds.</p><div class="sge-prog"><i></i></div></div>')
    var msgs = ['Searching holiday lets near ' + d.location + '…', 'Checking long-term rents in the area…', 'Working out realistic occupancy…', 'Putting your estimate together…']
    var t = 0, bar = ov.querySelector('.sge-prog i'), m = ov.querySelector('[data-msg]')
    setTimeout(function () { bar.style.width = '8%' }, 50)
    timer = setInterval(function () { t++; bar.style.width = Math.min(95, 8 + t * 2) + '%'; m.textContent = msgs[Math.min(msgs.length - 1, Math.floor(t / 12))] }, 1000)
    var body = {
      name: d.name, email: d.email, phone: d.phone, location: d.location, country: d.country === 'UAE' ? 'United Arab Emirates' : d.country,
      bedrooms: d.bedrooms, property_type: d.rent_type === 'Private room' ? 'Private room' : '', goal: d.goal, rent_type: d.rent_type, start_when: d.start_when,
      marketing_opt_in: d.marketing === 'yes', consent: true, currency: cur, website: hp || '',
      source: ((document.title || location.hostname).slice(0, 60) + (location.search ? ' ' + location.search.slice(0, 120) : '')),
    }
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.text().then(function (txt) { try { return JSON.parse(txt) } catch (e) { return null } }) })
      .then(function (j) {
        if (timer) clearInterval(timer); timer = null
        if (!ov) return
        if (j && j.error) { show(3); return err(j.error) }
        result(j && j.estimate, (j && j.meetUrl) || MEET)
      })
      .catch(function () { if (timer) clearInterval(timer); timer = null; if (ov) result(null, MEET) })
  }

  function result(e, meet) {
    var d = st.d
    var cta = '<div class="sge-cta"><a class="sge-btn" href="' + esc(meet) + '" target="_blank" rel="noopener">Book a call</a><em>OR</em><a class="sge-btn gold" href="' + esc(meet) + '" target="_blank" rel="noopener">Book a free valuation</a></div>'
    var msg = '<div class="msg">Book a call with one of our local property experts for a free, bespoke market appraisal and to talk through how we can manage your property.</div>'
    if (!e) {
      frame('<div class="sge-res"><h2>Thank you, ' + esc(d.name.split(' ')[0]) + '</h2><div class="msg">We couldn’t pull enough live listings for ' + esc(d.location) + ' just now. One of our local experts will send you a personal estimate within 24 hours.</div>' + cta + '</div>', 0, true)
      return
    }
    var c = e.currency, s = e.short_let, l = e.long_let
    var longFirst = d.goal === 'Long-term let' || d.goal === 'Guaranteed rent'
    var main = longFirst ? l : s, other = longFirst ? s : l
    if (!main || !main.monthly_typical) { main = other; other = null; longFirst = !longFirst }
    var mainLbl = longFirst ? 'Estimated monthly rent · long-term let' : 'Estimated monthly revenue · holiday let'
    var range = main.monthly_low && main.monthly_high ? money(main.monthly_low, c) + ' – ' + money(main.monthly_high, c) : money(main.monthly_typical, c)
    var extra = !longFirst && main.nightly_typical ? '<div class="note">About ' + money(main.nightly_typical, c) + ' a night at ' + (main.occupancy_pct || '—') + '% occupancy.</div>' : ''
    var alt = other && other.monthly_typical ? '<div class="alt">' + (longFirst ? 'As a holiday let: ' : 'As a long-term let: ') + '<b>' + money(other.monthly_typical, c) + '</b> a month</div>' : ''
    var comps = (main.comparables || []).slice(0, 3)
    var compsHtml = comps.length ? '<div class="sge-comps">' + comps.map(function (x) { return '<div>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a>' : '<span style="color:' + INK + '">' + esc(x.title) + '</span>') + '<span>' + esc(x.price_text) + '</span></div>' }).join('') + '</div>' : ''
    frame('<div class="sge-res"><div class="lbl">' + mainLbl + '</div><div class="big">' + range + '</div>' + extra + alt +
      '<div class="note">This estimate is drawn from live listings near ' + esc(d.location) + ' for a ' + esc(beds(d.bedrooms).toLowerCase()) + ' property, before fees and running costs. It is not a guarantee of income. We’ve emailed you a copy.</div>' +
      msg + cta + compsHtml + '</div>', 0, true)
  }

  function init() {
    css()
    document.querySelectorAll('[data-sg-earnings]').forEach(function (el) {
      if (el.__sge) return; el.__sge = 1
      if (el.getAttribute('data-sg-earnings') === 'button') { el.innerHTML = '<button type="button" class="sge-open">Calculate your income</button>'; el.firstChild.onclick = function () { open(1) } }
      else mountBar(el)
    })
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href="#sg-earnings"]'); if (a) { e.preventDefault(); open(1) } })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov) close() })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init()
})()
