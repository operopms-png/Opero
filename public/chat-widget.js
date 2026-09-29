/* Website assistant — embed with:
   <script src="https://app.sangstersgroup.com/chat-widget.js" data-key="YOUR_PUBLIC_KEY" async></script>
   Everything lives inside a shadow root so the website's own styles can't break it (and it can't break the website). */
(function () {
  if (window.__operoChatLoaded) return
  window.__operoChatLoaded = true

  var script = document.currentScript || (function () {
    var all = document.querySelectorAll('script[data-key]')
    for (var i = 0; i < all.length; i++) if ((all[i].src || '').indexOf('chat-widget.js') > -1) return all[i]
    return null
  })()
  if (!script) return
  var KEY = script.getAttribute('data-key') || ''
  var API = (function () { try { return new URL(script.src).origin } catch (e) { return 'https://app.sangstersgroup.com' } })()
  var STORE = 'opero_chat_' + KEY

  // ---- small helpers ----
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') } catch (e) { return {} } }
  function save(s) { try { localStorage.setItem(STORE, JSON.stringify(s)) } catch (e) {} }
  function uid() { return 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36) }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function fmt(s) {
    return esc(s)
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>')
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }

  var state = load()
  if (!state.visitor_id) { state.visitor_id = uid(); save(state) }
  state.log = state.log || [] // [{r:'bot'|'me', t, cards?, form?}]

  var ICON_CHAT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  var ICON_SEND = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
  var ICON_HOME = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>'

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.launcher{position:fixed;right:24px;bottom:24px;z-index:2147483000;height:56px;padding:0 22px 0 14px;border-radius:30px;background:#1A1A1A;color:#fff;display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;box-shadow:0 12px 30px rgba(0,0,0,.25);cursor:pointer;border:none}',
    '.launcher .dot{width:30px;height:30px;border-radius:50%;background:#C9A84C;display:flex;align-items:center;justify-content:center}',
    '.panel{position:fixed;right:24px;bottom:92px;z-index:2147483000;width:380px;height:600px;max-height:calc(100vh - 120px);background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;border:1px solid #ECE6DA;color:#1A1A1A}',
    '.panel[hidden]{display:none}',
    '.head{background:#1A1A1A;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px}',
    '.avatar{width:38px;height:38px;border-radius:12px;background:#C9A84C;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.t{font-weight:600;font-size:15px}',
    '.s{font-size:12px;opacity:.75;display:flex;align-items:center;gap:6px}',
    '.s i{width:7px;height:7px;border-radius:50%;background:#3DDC84;display:inline-block}',
    '.close{margin-left:auto;background:none;border:none;color:#fff;opacity:.75;font-size:24px;line-height:1;cursor:pointer;padding:4px}',
    '.body{padding:14px;overflow-y:auto;flex:1;background:#FCFAF6;display:flex;flex-direction:column;gap:10px}',
    '.body>*{flex-shrink:0}',
    '.msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;word-wrap:break-word}',
    '.msg a{color:inherit;text-decoration:underline}',
    '.bot{background:#fff;border:1px solid #ECE6DA;border-top-left-radius:4px;align-self:flex-start}',
    '.me{background:#1A1A1A;color:#fff;align-self:flex-end;border-top-right-radius:4px}',
    '.typing{display:flex;gap:4px;align-items:center;padding:12px 14px}',
    '.typing b{width:6px;height:6px;border-radius:50%;background:#C9A84C;animation:op-b 1s infinite}',
    '.typing b:nth-child(2){animation-delay:.15s}.typing b:nth-child(3){animation-delay:.3s}',
    '@keyframes op-b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}',
    '.chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.chip{font-size:12px;border:1px solid #C9A84C;color:#8A6D1F;background:#fff;border-radius:20px;padding:6px 11px;cursor:pointer}',
    '.chip:hover{background:#FBF4E6}',
    '.cards{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;align-self:stretch}',
    '.pc{flex:0 0 200px;background:#fff;border:1px solid #ECE6DA;border-radius:12px;overflow:hidden;font-size:12.5px;display:flex;flex-direction:column}',
    '.pc .img{height:104px;background:#FBF4E6 center/cover no-repeat;display:flex;align-items:center;justify-content:center}',
    '.pc .in{padding:10px;display:flex;flex-direction:column;gap:3px;flex:1}',
    '.pc .n{font-weight:600;font-size:13px}',
    '.pc .m{color:#6B6B6B}',
    '.pc .p{font-weight:600;color:#8A6D1F}',
    '.pc button{margin-top:auto;background:#1A1A1A;color:#fff;border:none;border-radius:8px;padding:7px;font-size:12px;font-weight:600;cursor:pointer}',
    '.form{background:#fff;border:1px solid #ECE6DA;border-radius:12px;padding:12px;font-size:13px;align-self:stretch}',
    '.form b{display:block;margin-bottom:8px}',
    '.form input{width:100%;border:1px solid #DDD5C4;border-radius:8px;padding:9px 10px;font-size:13px;margin-bottom:6px;outline:none;color:#1A1A1A;background:#fff}',
    '.form input:focus{border-color:#C9A84C}',
    '.form button{width:100%;background:#C9A84C;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;font-size:13px;cursor:pointer}',
    '.form button:disabled{opacity:.6;cursor:default}',
    '.form .err{color:#B42318;font-size:12px;margin:2px 0 6px}',
    '.foot{border-top:1px solid #ECE6DA;padding:10px 12px;display:flex;gap:8px;align-items:center;background:#fff}',
    '.foot textarea{flex:1;border:1px solid #DDD5C4;border-radius:20px;padding:10px 14px;font-size:13.5px;resize:none;height:40px;max-height:96px;outline:none;color:#1A1A1A;background:#fff;line-height:1.4}',
    '.foot textarea:focus{border-color:#C9A84C}',
    '.send{width:40px;height:40px;border-radius:50%;background:#C9A84C;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}',
    '.send:disabled{opacity:.5;cursor:default}',
    '.fine{font-size:10.5px;color:#A09A8E;text-align:center;padding:0 12px 9px;background:#fff}',
    '@media (max-width:640px){.panel{right:8px;left:8px;width:auto;bottom:84px;height:auto;top:12px;max-height:none}.launcher{right:16px;bottom:16px}}',
  ].join('')

  function start(cfg) {
    var host = document.createElement('div')
    host.id = 'opero-chat'
    document.body.appendChild(host)
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
    var font = document.createElement('link')
    font.rel = 'stylesheet'
    font.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap'
    document.head.appendChild(font)
    root.appendChild(el('style', null, CSS))

    var panel = el('div', 'panel')
    panel.hidden = true
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', cfg.name)
    panel.innerHTML =
      '<div class="head"><div class="avatar">' + ICON_CHAT + '</div><div><div class="t">' + esc(cfg.name) + '</div>' +
      '<div class="s"><i></i> Replies instantly · 24/7</div></div><button class="close" aria-label="Close">×</button></div>' +
      '<div class="body"></div>' +
      '<div class="foot"><textarea rows="1" placeholder="Ask anything…" aria-label="Your message" maxlength="1000"></textarea><button class="send" aria-label="Send">' + ICON_SEND + '</button></div>' +
      '<div class="fine">AI assistant · can make mistakes · the team will confirm anything important</div>'
    var launcher = el('button', 'launcher', '<span class="dot">' + ICON_CHAT + '</span><span>Ask us anything</span>')
    launcher.setAttribute('aria-label', 'Open chat')
    root.appendChild(panel)
    root.appendChild(launcher)

    var body = panel.querySelector('.body')
    var input = panel.querySelector('textarea')
    var sendBtn = panel.querySelector('.send')
    var busy = false
    var rendered = false

    function scroll() { body.scrollTop = body.scrollHeight }
    function push(entry) { state.log.push(entry); if (state.log.length > 60) state.log = state.log.slice(-60); save(state) }

    function addMsg(role, text) { var m = el('div', 'msg ' + role, fmt(text)); body.appendChild(m); scroll(); return m }

    function addCards(cards) {
      if (!cards || !cards.length) return
      var wrap = el('div', 'cards')
      cards.forEach(function (c) {
        var card = el('div', 'pc')
        var img = el('div', 'img', c.image ? '' : ICON_HOME)
        if (c.image) img.style.backgroundImage = 'url("' + String(c.image).replace(/"/g, '%22') + '")'
        var meta = [c.area, c.bedrooms ? c.bedrooms + ' bed' : null].filter(Boolean).join(' · ')
        var inner = el('div', 'in',
          '<div class="n">' + esc(c.name) + '</div>' +
          (meta ? '<div class="m">' + esc(meta) + '</div>' : '') +
          '<div class="m">' + esc(c.type || '') + '</div>' +
          (c.price ? '<div class="p">' + esc(c.price) + '</div>' : ''))
        var b = el('button', null, 'Ask about this')
        b.onclick = function () { send('I’m interested in ' + c.name + '. Is it available?') }
        inner.appendChild(b)
        card.appendChild(img)
        card.appendChild(inner)
        wrap.appendChild(card)
      })
      body.appendChild(wrap)
      scroll()
    }

    function addForm(reason, done) {
      var f = el('div', 'form')
      if (done) { f.innerHTML = '<b>✓ Details sent to the team</b>'; body.appendChild(f); return }
      f.innerHTML = '<b>' + esc(reason || 'Leave your details') + '</b>' +
        '<input name="name" placeholder="Your name" autocomplete="name">' +
        '<input name="email" type="email" placeholder="Email" autocomplete="email">' +
        '<input name="phone" type="tel" placeholder="Phone (optional)" autocomplete="tel">' +
        '<div class="err" hidden></div><button>Send to the team</button>'
      var btn = f.querySelector('button')
      var err = f.querySelector('.err')
      btn.onclick = function () {
        var v = function (n) { return f.querySelector('[name=' + n + ']').value.trim() }
        if (!v('email') && !v('phone')) { err.hidden = false; err.textContent = 'Please add an email or phone number.'; return }
        btn.disabled = true
        btn.textContent = 'Sending…'
        fetch(API + '/api/website-chat/lead', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: KEY, chat_id: state.chat_id, name: v('name'), email: v('email'), phone: v('phone'), reason: reason }),
        }).then(function (r) { return r.json() }).then(function (d) {
          if (d.error) { err.hidden = false; err.textContent = d.error; btn.disabled = false; btn.textContent = 'Send to the team'; return }
          f.innerHTML = '<b>✓ Details sent to the team</b>'
          for (var i = state.log.length - 1; i >= 0; i--) if (state.log[i].form != null) { state.log[i].formDone = true; break }
          save(state)
          if (d.reply) { addMsg('bot', d.reply); push({ r: 'bot', t: d.reply }) }
        }).catch(function () { err.hidden = false; err.textContent = 'Couldn’t send. Please try again.'; btn.disabled = false; btn.textContent = 'Send to the team' })
      }
      body.appendChild(f)
      scroll()
    }

    function addChips() {
      var chips = el('div', 'chips')
      ;['🏠 What’s available?', '🔑 List my property', '💬 Speak to the team'].forEach(function (label) {
        var c = el('button', 'chip', esc(label))
        c.onclick = function () { chips.remove(); send(label.replace(/^\S+\s/, '')) }
        chips.appendChild(c)
      })
      body.appendChild(chips)
    }

    function renderAll() {
      rendered = true
      body.innerHTML = ''
      var greet = 'Hi 👋 I’m ' + cfg.name + '. Ask me anything' + (cfg.company ? ' about ' + cfg.company : '') + ', or pick an option below.'
      addMsg('bot', greet)
      if (!state.log.length) addChips()
      state.log.forEach(function (e) {
        if (e.t) addMsg(e.r, e.t)
        if (e.cards) addCards(e.cards)
        if (e.form != null) addForm(e.form, e.formDone)
      })
    }

    function send(text) {
      text = String(text || '').trim()
      if (!text || busy) return
      busy = true
      sendBtn.disabled = true
      var chips = body.querySelector('.chips'); if (chips) chips.remove()
      addMsg('me', text)
      push({ r: 'me', t: text })
      var typing = el('div', 'msg bot typing', '<b></b><b></b><b></b>')
      body.appendChild(typing)
      scroll()
      fetch(API + '/api/website-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: KEY, chat_id: state.chat_id || null, visitor_id: state.visitor_id, message: text, page_url: location.href }),
      }).then(function (r) { return r.json() }).then(function (d) {
        typing.remove()
        if (d.chat_id) { state.chat_id = d.chat_id; save(state) }
        var entry = { r: 'bot', t: d.reply || 'Sorry, something went wrong. Please try again.' }
        addMsg('bot', entry.t)
        if (d.cards && d.cards.length) { entry.cards = d.cards; addCards(d.cards) }
        if (d.show_contact_form) { entry.form = d.form_reason || 'Leave your details'; addForm(entry.form) }
        push(entry)
      }).catch(function () {
        typing.remove()
        addMsg('bot', 'Sorry, I couldn’t connect. Please check your internet and try again.')
      }).then(function () { busy = false; sendBtn.disabled = false; input.focus() })
    }

    function open() {
      if (!rendered) renderAll()
      panel.hidden = false
      scroll()
      setTimeout(function () { input.focus() }, 50)
    }
    function close() { panel.hidden = true }

    launcher.onclick = function () { panel.hidden ? open() : close() }
    panel.querySelector('.close').onclick = close
    sendBtn.onclick = function () { var v = input.value; input.value = ''; input.style.height = '40px'; send(v) }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.onclick() }
    })
    input.addEventListener('input', function () { input.style.height = '40px'; input.style.height = Math.min(input.scrollHeight, 96) + 'px' })
    window.OperoChat = { open: open, close: close, ask: function (q) { open(); send(q) } }
  }

  function boot() {
    fetch(API + '/api/website-chat?key=' + encodeURIComponent(KEY))
      .then(function (r) { return r.json() })
      .then(function (cfg) { if (cfg && cfg.enabled) start({ name: cfg.name || 'Assistant', company: cfg.company || '' }) })
      .catch(function () {})
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
