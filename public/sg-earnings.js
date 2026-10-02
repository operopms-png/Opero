/* Sangsters — "What could your property earn?" landlord earnings checker.
 * Landlords enter their property and details, get a live market estimate
 * (holiday let + long let), and land in the portal as a lead
 * (Staff Centre → Landlord Leads, plus the CRM).
 * Usage (Elementor → HTML widget):
 *   <div data-sg-earnings></div>
 *   <script src="https://app.sangstersgroup.com/sg-earnings.js" defer></script>
 */
(function () {
  var SRC = (document.currentScript && document.currentScript.src) || 'https://app.sangstersgroup.com/sg-earnings.js'
  var APP = SRC.replace(/\/sg-earnings\.js.*$/, '')
  var API = APP + '/api/public/earnings-estimate'
  var INK = '#191815', GOLD = '#8E6B1F', MUTED = '#6b675e', LINE = '#e3ded2', SOFT = '#f7f4ee'
  var SYM = { USD: '$', JMD: 'J$', GBP: '£' }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function money(n, c) { return n == null ? '—' : (SYM[c] || '') + Math.round(n).toLocaleString('en-GB') }
  function opts(list, sel) { return list.map(function (o) { var v = typeof o === 'string' ? o : o[0], l = typeof o === 'string' ? o : o[1]; return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(l) + '</option>' }).join('') }

  function css() {
    if (document.getElementById('sge-css')) return
    var s = document.createElement('style'); s.id = 'sge-css'
    s.textContent = [
      '.sge,.sge *{box-sizing:border-box}',
      '.sge{font-family:inherit;color:' + INK + ';background:#fff;border:1px solid ' + LINE + ';border-radius:6px;max-width:760px;margin:0 auto;overflow:hidden}',
      '.sge-top{padding:30px 32px 6px}',
      '.sge-eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:' + GOLD + ';margin:0 0 8px}',
      '.sge h2{font-size:30px;line-height:1.15;font-weight:700;margin:0 0 8px;color:' + INK + ';letter-spacing:-.01em}',
      '.sge-sub{font-size:15px;color:' + MUTED + ';margin:0;line-height:1.55}',
      '.sge-steps{display:flex;gap:6px;padding:18px 32px 0}',
      '.sge-steps span{flex:1;height:3px;background:' + LINE + ';border-radius:2px}.sge-steps span.on{background:' + INK + '}',
      '.sge-body{padding:22px 32px 30px}',
      '.sge-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}',
      '.sge-f{display:flex;flex-direction:column;gap:6px;min-width:0}.sge-f.full{grid-column:1/-1}',
      '.sge-f label{font-size:12.5px;font-weight:600;color:' + INK + '}',
      '.sge-f input,.sge-f select{font:inherit;font-size:15px;color:' + INK + ';border:1px solid ' + LINE + ';border-radius:4px;padding:11px 12px;background:#fff;width:100%;outline:none;-webkit-appearance:none;appearance:none;height:46px}',
      '.sge-f select{background-image:linear-gradient(45deg,transparent 50%,' + MUTED + ' 50%),linear-gradient(135deg,' + MUTED + ' 50%,transparent 50%);background-position:calc(100% - 18px) 20px,calc(100% - 13px) 20px;background-size:5px 5px;background-repeat:no-repeat;padding-right:34px}',
      '.sge-f input:focus,.sge-f select:focus{border-color:' + INK + '}',
      '.sge-check{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;font-size:13px;color:' + MUTED + ';line-height:1.5}',
      '.sge-check input{margin-top:3px;width:16px;height:16px;flex-shrink:0;accent-color:' + INK + '}',
      '.sge-actions{display:flex;gap:12px;align-items:center;margin-top:22px;flex-wrap:wrap}',
      '.sge-btn{background:' + INK + ';color:#fff !important;border:none;border-radius:4px;padding:0 26px;height:50px;font:inherit;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}',
      '.sge-btn.gold{background:' + GOLD + '}.sge-btn[disabled]{opacity:.6;cursor:default}',
      '.sge-link{background:none;border:none;font:inherit;font-size:13.5px;font-weight:600;color:' + INK + ';cursor:pointer;padding:10px 4px;text-decoration:underline}',
      '.sge-err{color:#b42318;font-size:13.5px;margin-top:12px}',
      '.sge-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
      '.sge-load{text-align:center;padding:26px 6px 10px}',
      '.sge-load b{display:block;font-size:18px;margin-bottom:6px}.sge-load p{margin:0;color:' + MUTED + ';font-size:14px}',
      '.sge-bar{height:4px;background:' + SOFT + ';border-radius:2px;overflow:hidden;margin:22px auto 0;max-width:420px}',
      '.sge-bar i{display:block;height:100%;width:0;background:' + GOLD + ';transition:width 1s linear}',
      '.sge-res{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
      '.sge-card{border:1px solid ' + LINE + ';border-radius:6px;padding:18px}',
      '.sge-card.dark{background:' + INK + ';border-color:' + INK + ';color:#fff}',
      '.sge-card h4{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:' + MUTED + '}.sge-card.dark h4{color:#d9b866}',
      '.sge-big{font-size:34px;font-weight:700;letter-spacing:-.01em;margin:8px 0 2px;line-height:1.1}',
      '.sge-small{font-size:13px;color:' + MUTED + ';line-height:1.5}.sge-card.dark .sge-small{color:#cfc9bc}',
      '.sge-comps{margin-top:18px;border-top:1px solid ' + LINE + ';padding-top:14px}',
      '.sge-comps h5{margin:0 0 8px;font-size:12.5px;font-weight:700}',
      '.sge-comp{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:6px 0;border-bottom:1px solid ' + SOFT + '}',
      '.sge-comp a{color:' + GOLD + ';font-weight:600;text-decoration:none}.sge-comp span{color:' + MUTED + ';white-space:nowrap}',
      '.sge-note{font-size:12px;color:#8a857a;margin-top:14px;line-height:1.5}',
      '@media(max-width:620px){.sge-top{padding:24px 20px 4px}.sge-steps{padding:16px 20px 0}.sge-body{padding:20px}.sge h2{font-size:25px}.sge-grid,.sge-res{grid-template-columns:1fr}.sge-btn{width:100%}}',
    ].join('\n')
    document.head.appendChild(s)
  }

  function mount(el) {
    var st = { step: 1, d: { country: 'Jamaica', property_type: 'Apartment', bedrooms: '2', bathrooms: '1', furnished: 'Yes', goal: 'Holiday let management', lives_in: 'Jamaica', currency: 'USD' } }
    function v(id) { var x = el.querySelector('[name="' + id + '"]'); return x ? (x.type === 'checkbox' ? x.checked : x.value.trim()) : '' }
    function keep() { el.querySelectorAll('[name]').forEach(function (x) { st.d[x.name] = x.type === 'checkbox' ? x.checked : x.value }) }

    function head(title, sub) {
      return '<div class="sge-top"><div class="sge-eyebrow">Free earnings estimate</div><h2>' + title + '</h2><p class="sge-sub">' + sub + '</p></div>' +
        '<div class="sge-steps"><span class="' + (st.step >= 1 ? 'on' : '') + '"></span><span class="' + (st.step >= 2 ? 'on' : '') + '"></span><span class="' + (st.step >= 3 ? 'on' : '') + '"></span></div>'
    }

    function step1() {
      var d = st.d
      el.innerHTML = '<div class="sge">' + head('What could your property earn?', 'Tell us about your property and we’ll check live listings near you — as a holiday let and as a long-term let.') +
        '<div class="sge-body"><div class="sge-grid">' +
        '<div class="sge-f full"><label for="sge-loc">Where is the property?</label><input id="sge-loc" name="location" placeholder="e.g. Rose Hall, Montego Bay" value="' + esc(d.location || '') + '"></div>' +
        '<div class="sge-f"><label for="sge-country">Country</label><select id="sge-country" name="country">' + opts(['Jamaica', 'United Kingdom', 'United Arab Emirates', 'Other'], d.country) + '</select></div>' +
        '<div class="sge-f"><label for="sge-type">Property type</label><select id="sge-type" name="property_type">' + opts(['Apartment', 'House', 'Townhouse', 'Villa', 'Studio', 'Room'], d.property_type) + '</select></div>' +
        '<div class="sge-f"><label for="sge-beds">Bedrooms</label><select id="sge-beds" name="bedrooms">' + opts([['0', 'Studio'], '1', '2', '3', '4', '5', '6', ['7', '7+']], d.bedrooms) + '</select></div>' +
        '<div class="sge-f"><label for="sge-baths">Bathrooms</label><select id="sge-baths" name="bathrooms">' + opts(['1', '1.5', '2', '2.5', '3', ['4', '4+']], d.bathrooms) + '</select></div>' +
        '<div class="sge-f"><label for="sge-furn">Furnished?</label><select id="sge-furn" name="furnished">' + opts(['Yes', 'Partly', 'No'], d.furnished) + '</select></div>' +
        '<div class="sge-f"><label for="sge-goal">What are you looking for?</label><select id="sge-goal" name="goal">' + opts(['Holiday let management', 'Long-term let', 'Guaranteed rent', 'Not sure yet'], d.goal) + '</select></div>' +
        '</div><div class="sge-err" hidden></div><div class="sge-actions"><button type="button" class="sge-btn" data-next>Continue</button></div></div></div>'
      el.querySelector('[data-next]').onclick = function () {
        keep()
        if (!st.d.location) return showErr('Please tell us where the property is.')
        st.step = 2; step2()
      }
    }

    function step2() {
      var d = st.d
      el.innerHTML = '<div class="sge">' + head('Where should we send your estimate?', 'You’ll see your figures straight away, and we’ll email you a copy.') +
        '<div class="sge-body"><div class="sge-grid">' +
        '<div class="sge-f full"><label for="sge-name">Full name</label><input id="sge-name" name="name" autocomplete="name" value="' + esc(d.name || '') + '"></div>' +
        '<div class="sge-f"><label for="sge-email">Email</label><input id="sge-email" name="email" type="email" autocomplete="email" value="' + esc(d.email || '') + '"></div>' +
        '<div class="sge-f"><label for="sge-phone">Phone or WhatsApp (optional)</label><input id="sge-phone" name="phone" type="tel" autocomplete="tel" value="' + esc(d.phone || '') + '"></div>' +
        '<div class="sge-f"><label for="sge-lives">Where do you live?</label><select id="sge-lives" name="lives_in">' + opts(['Jamaica', 'United Kingdom', 'United States', 'Canada', 'United Arab Emirates', 'Other'], d.lives_in) + '</select></div>' +
        '<div class="sge-f"><label for="sge-cur">Show figures in</label><select id="sge-cur" name="currency">' + opts([['USD', 'US dollars ($)'], ['JMD', 'Jamaican dollars (J$)'], ['GBP', 'British pounds (£)']], d.currency) + '</select></div>' +
        '<label class="sge-check"><input type="checkbox" name="consent"' + (d.consent ? ' checked' : '') + '> I agree that Sangsters can email or call me about my property. We never share your details.</label>' +
        '<div class="sge-hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '</div><div class="sge-err" hidden></div><div class="sge-actions"><button type="button" class="sge-btn gold" data-go>Get my estimate</button><button type="button" class="sge-link" data-back>Back</button></div></div></div>'
      el.querySelector('[data-back]').onclick = function () { keep(); st.step = 1; step1() }
      el.querySelector('[data-go]').onclick = submit
    }

    function showErr(m) { var e = el.querySelector('.sge-err'); if (e) { e.textContent = m; e.hidden = false } }

    function submit() {
      keep()
      var d = st.d
      if (!d.name) return showErr('Please add your name.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) return showErr('Please add a valid email address.')
      if (!d.consent) return showErr('Please tick the box so we can send you your estimate.')
      st.step = 3; loading()
      var q = location.search ? location.search.slice(0, 120) : ''
      var body = {}; for (var k in d) body[k] = d[k]
      body.source = (document.title || location.hostname).slice(0, 60) + (q ? ' ' + q : '')
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t) } catch (e) {} ; return { ok: r.ok, j: j } }) })
        .then(function (x) {
          stopLoading()
          if (!x.j) return result(null, 'https://app.sangstersgroup.com/meeting')
          if (x.j.error) { st.step = 2; step2(); return showErr(x.j.error) }
          result(x.j.estimate, x.j.meetUrl)
        })
        .catch(function () { stopLoading(); result(null, 'https://app.sangstersgroup.com/meeting') })
    }

    var timer = null
    function loading() {
      var msgs = ['Searching holiday lets near ' + st.d.location + '…', 'Checking long-term rents in the area…', 'Working out realistic occupancy…', 'Putting your estimate together…']
      el.innerHTML = '<div class="sge">' + head('Checking your local market', 'This takes about 40 seconds — please keep this page open.') +
        '<div class="sge-body"><div class="sge-load" aria-live="polite"><b data-msg>' + esc(msgs[0]) + '</b><p>We’re looking at real listings, not guesses.</p><div class="sge-bar"><i></i></div></div></div></div>'
      var t = 0, bar = el.querySelector('.sge-bar i'), m = el.querySelector('[data-msg]')
      setTimeout(function () { bar.style.width = '8%' }, 50)
      timer = setInterval(function () { t++; bar.style.width = Math.min(95, 8 + t * 2) + '%'; m.textContent = msgs[Math.min(msgs.length - 1, Math.floor(t / 12))] }, 1000)
    }
    function stopLoading() { if (timer) clearInterval(timer); timer = null }

    function compsHtml(list, title) {
      if (!list || !list.length) return ''
      return '<div class="sge-comps"><h5>' + esc(title) + '</h5>' + list.slice(0, 4).map(function (c) {
        var name = esc(c.title) + (c.location ? ' · ' + esc(c.location) : '')
        return '<div class="sge-comp">' + (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + name + '</a>' : '<div>' + name + '</div>') + '<span>' + esc(c.price_text) + '</span></div>'
      }).join('') + '</div>'
    }

    function result(e, meet) {
      var name = esc((st.d.name || '').split(' ')[0])
      var cta = '<div class="sge-actions"><a class="sge-btn gold" href="' + esc(meet) + '" target="_blank" rel="noopener">Book a free valuation call</a><button type="button" class="sge-link" data-again>Check another property</button></div>'
      if (!e) {
        el.innerHTML = '<div class="sge">' + head('Thank you, ' + name, 'We couldn’t pull enough live listings for that area just now. Our team will send you a personal estimate within 24 hours.') + '<div class="sge-body">' + cta + '</div></div>'
      } else {
        var c = e.currency, s = e.short_let, l = e.long_let
        var cards = ''
        if (s && s.monthly_typical) cards += '<div class="sge-card dark"><h4>Holiday let · per month</h4><div class="sge-big">' + money(s.monthly_typical, c) + '</div><div class="sge-small">Range ' + money(s.monthly_low, c) + ' – ' + money(s.monthly_high, c) + '<br>About ' + money(s.nightly_typical, c) + ' a night at ' + (s.occupancy_pct || '—') + '% occupancy</div></div>'
        if (l && l.monthly_typical) cards += '<div class="sge-card"><h4>Long-term let · per month</h4><div class="sge-big">' + money(l.monthly_typical, c) + '</div><div class="sge-small">Range ' + money(l.monthly_low, c) + ' – ' + money(l.monthly_high, c) + (l.basis ? '<br>' + esc(l.basis) : '') + '</div></div>'
        el.innerHTML = '<div class="sge">' + head(name + ', here’s what your property could earn', esc((st.d.bedrooms === '0' ? 'Studio' : st.d.bedrooms + '-bed') + ' ' + (st.d.property_type || '').toLowerCase() + ' in ' + st.d.location) + ' — based on live listings. We’ve also emailed you a copy.') +
          '<div class="sge-body"><div class="sge-res">' + cards + '</div>' +
          compsHtml(s && s.comparables, 'Similar holiday lets') + compsHtml(l && l.comparables, 'Similar homes to rent') +
          '<div class="sge-note">Estimates from current listings, before management fees and running costs. A free valuation gives you a firm figure and a plan for your property.</div>' + cta + '</div></div>'
      }
      var again = el.querySelector('[data-again]')
      if (again) again.onclick = function () { st.step = 1; st.d.location = ''; step1() }
    }

    step1()
  }

  function init() { css(); document.querySelectorAll('[data-sg-earnings]').forEach(function (el) { if (!el.__sge) { el.__sge = 1; mount(el) } }) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init()
})()
