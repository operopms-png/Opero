/* NOVOURQ agent recruitment page. Add to the website with:
   <div id="novourq-agent"></div><script src="https://app.thenovourq.com/agent-page.js"></script> */
(function(){
var host=document.getElementById('novourq-agent');if(!host)return;
var R=host.attachShadow({mode:'open'});
R.innerHTML=`<style>:host{display:block}
:host{--bg:#FBFBFC;--card:#fff;--fg:#16233F;--mut:#6B7690;--line:#D9DEE8;--blue:#2F6DB5;--navy:#16233F;--soft:#F5F6F8;--tint:#E7EEF8;--ok:#E3EFE9}
@media (prefers-color-scheme:dark){:host(:not([data-theme="light"])){--bg:#0C1424;--card:#16233F;--fg:#EAF0FA;--mut:#A3B1C9;--line:#34476B;--blue:#78AFEB;--navy:#080E1B;--soft:#111C31;--tint:#1B2D4F;--ok:#14302A;color-scheme:dark}}
:host([data-theme="dark"]){--bg:#0C1424;--card:#16233F;--fg:#EAF0FA;--mut:#A3B1C9;--line:#34476B;--blue:#78AFEB;--navy:#080E1B;--soft:#111C31;--tint:#1B2D4F;--ok:#14302A;color-scheme:dark}
*{box-sizing:border-box}.pg{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;line-height:1.5}
h1,h2,h3{text-wrap:balance;margin:0}
.w{padding-inline:max(16px,env(safe-area-inset-left,0px))}.in{max-width:1040px;margin:0 auto}
nav{display:flex;justify-content:space-between;align-items:center;padding-block:20px}
.logo{letter-spacing:.3em;font-weight:800;font-size:19px}
.menu{width:28px;height:20px;display:flex;flex-direction:column;justify-content:space-between}.menu i{height:3px;background:var(--fg);border-radius:2px}
.hero{position:relative;border-radius:36px;overflow:hidden;background:linear-gradient(150deg,#1E2F52 0%,#16233F 55%,#2A4A7C 130%);color:#fff;padding:36px 26px 26px}
.hero svg.bg{position:absolute;right:-40px;top:0;height:100%;opacity:.35;pointer-events:none}
.hero .t{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:start}
.hero h1{font-size:clamp(30px,7vw,52px);line-height:1.06;font-weight:700;letter-spacing:-.01em}
.hero p{color:#CBD6EA;font-size:17px;margin:14px 0 22px;max-width:44ch}
.ic{display:flex;align-items:center;gap:14px;margin:10px 0;font-size:16px}.ic b{width:46px;height:46px;border-radius:12px;background:#D6E2F5;display:flex;align-items:center;justify-content:center;flex:none}
.ic svg{width:24px;height:24px;stroke:#16233F;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.pill{display:inline-block;border:0;border-radius:999px;background:#F5F4F1;color:var(--navy);font:700 17px Inter,sans-serif;padding:16px 34px;margin-top:18px;cursor:pointer}
.form{position:relative;background:#fff;color:#16233F;border-radius:30px;padding:22px;margin-top:26px}
.f{width:100%;padding:18px 20px;border:1.5px solid #D9DEE8;border-radius:16px;font:inherit;font-size:16px;background:#fff;color:#16233F;margin-bottom:14px;display:block;appearance:none}
.ph{display:flex;border:1.5px solid #D9DEE8;border-radius:16px;margin-bottom:14px;overflow:hidden}.ph span{padding:0 18px;display:flex;align-items:center;gap:8px;font-weight:700;border-right:1px solid #E6EAF1;white-space:nowrap}.ph input{border:0;border-radius:0;margin:0;flex:1;min-width:0}
.cb{display:flex;gap:14px;font-size:15px;margin:6px 0 18px;align-items:flex-start}.cb input{width:26px;height:26px;margin:0;flex:none;border-radius:8px}
.go{width:100%;border:0;border-radius:999px;background:#0E1426;color:#fff;font:700 17px Inter,sans-serif;padding:18px;cursor:pointer}
.sec{text-align:center;padding-block:70px 26px}.eyebrow{font-size:14px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#4A6490}
.sec h2{font-size:clamp(28px,6vw,42px);line-height:1.15;margin-top:14px;font-weight:600}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:var(--soft);border-radius:30px;padding:10px 10px 28px;display:flex;flex-direction:column}
.art{border-radius:24px;aspect-ratio:16/10;overflow:hidden;display:block;width:100%}
.card h3{font-size:25px;margin:26px 18px 8px;font-weight:700}.card p{margin:0 18px 22px;color:var(--mut);font-size:18px;flex:1}
.out{margin:0 18px;border:2px solid var(--navy);background:none;color:var(--fg);border-radius:999px;font:700 17px Inter,sans-serif;padding:15px;cursor:pointer}
.steps{margin:14px 18px 0;padding:14px 16px;background:var(--card);border-radius:16px;font-size:14.5px;color:var(--mut)}.steps ol{margin:0;padding-left:20px}.steps li{margin:4px 0}
.fit{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding-bottom:30px}.fit div{text-align:center}
.fit .tile{width:96px;height:96px;margin:0 auto 18px;border-radius:24px;background:var(--card);box-shadow:0 6px 18px rgba(22,35,63,.14);transform:rotate(-4deg);display:flex;align-items:center;justify-content:center}.fit div:nth-child(2) .tile{transform:rotate(3deg)}
.fit .tile svg{width:52px;height:52px;stroke:var(--blue);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.fit h3{font-size:23px;margin-bottom:6px}.fit p{margin:0;color:var(--mut);font-size:18px}
.cta{text-align:center;padding-block:80px 70px;background:linear-gradient(180deg,var(--bg),var(--tint))}.cta h2{font-size:clamp(30px,6vw,46px);font-weight:600}.cta p{color:var(--mut);font-size:19px;margin:10px 0 28px}
.cta .big{display:block;max-width:420px;margin:0 auto;border:0;border-radius:999px;background:#2B3555;color:#fff;font:700 18px Inter,sans-serif;padding:22px;cursor:pointer}
.ft{border-top:1px solid var(--line)}.acc{padding:24px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;font-weight:700;font-size:20px}
.news{padding-block:34px;font-size:20px}.mail{display:flex;border:1.5px solid var(--line);border-radius:999px;padding:6px 6px 6px 22px;margin-top:20px;align-items:center;color:var(--mut)}.mail span{flex:1}.mail b{width:48px;height:48px;border-radius:50%;background:#16233F;color:#fff;display:flex;align-items:center;justify-content:center}
.copy{text-align:center;color:var(--mut);font-size:14px;padding:26px 0 40px}
.note{text-align:center;font-size:12px;color:var(--mut);padding:0 0 30px}
/* theme overrides */
.w h1,.w h2,.w h3{color:inherit!important;font-family:inherit!important;text-transform:none!important}
.hero p{color:#CBD6EA!important}.hero .ic{color:#fff}
.card p,.fit p,.cta p{color:var(--mut)!important}
.w button{text-transform:none!important;letter-spacing:0!important}
.pill{color:#16233F!important}.go,.cta .big{color:#fff!important}.out{color:var(--fg)!important}
.hero svg.bg{right:3%!important;top:6%!important;height:55%!important;opacity:.22!important}
@media(max-width:760px){.hero .t,.cards,.fit{grid-template-columns:1fr}.hero{border-radius:32px}.hero svg.bg{opacity:.2}}
</style>
<div class="w"><div class="in">
<nav><div class="logo">NOVOURQ</div><div class="menu"><i></i><i></i><i></i></div></nav>
<section class="hero">
<svg class="bg" viewBox="0 0 300 400" aria-hidden="true"><g fill="none" stroke="#9CC0F0" stroke-width="2"><rect x="60" y="60" width="150" height="260" rx="6"/><rect x="90" y="90" width="40" height="50"/><rect x="150" y="90" width="40" height="50"/><rect x="90" y="170" width="40" height="50"/><rect x="150" y="170" width="40" height="50"/><rect x="115" y="260" width="50" height="60"/></g></svg>
<div class="t"><div>
<h1>Get paid for every home you place</h1>
<p>Bring a renter, a guest or a property to NOVOURQ. We do the work, you earn the commission.</p>
<div class="ic"><b><svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg></b>Commission on every completed referral</div>
<div class="ic"><b><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/></svg></b>Furnished homes in Jamaica, the UK and the UAE</div>
<div class="ic"><b><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></b>Apply in two minutes</div>
<a href="#how"><button class="pill">See how it works</button></a></div><div></div></div>
<form class="form" id="agentForm">
<input class="f" name="name" placeholder="Full name" required><input class="f" name="email" type="email" placeholder="Email" required>
<div class="ph"><span>\ud83c\uddef\ud83c\uddf2 <input name="country_code" value="+1 876" style="border:0;width:70px;font-weight:700"></span><input class="f" name="phone" type="tel" placeholder="Phone number" required></div>
<select class="f" name="role"><option value="">I am a\u2026</option><option>Estate or letting agent</option><option>Travel or booking agent</option><option>Property owner or manager</option><option>Influencer or community host</option><option>Other</option></select>
<select class="f" name="country"><option value="">Where are you based?</option><option>Jamaica</option><option>United Kingdom</option><option>United Arab Emirates</option><option>Elsewhere</option></select>
<input class="f" name="instagram" placeholder="Instagram handle (optional)">
<input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px">
<label class="cb"><input type="checkbox" name="marketing">I would like to hear about news and offers from NOVOURQ.</label>
<div id="agentMsg" style="color:#B42318;font-size:14px;margin:0 0 12px"></div>
<button class="go" id="agentGo">Apply to become an agent</button></form>
</section>

<section class="sec" id="how"><div class="eyebrow">Ways to earn</div><h2>Three ways to turn your contacts into income</h2></section>
<div class="cards">
<div class="card"><img class="art" src="https://thenovourq.com/wp-content/uploads/2026/11/place-a-renter-1.jpg" alt="" style="object-fit:cover">
<h3>Place a renter</h3><p>Bring us someone who needs a fully furnished home, for a few months or longer.</p><button class="out" data-s="0">See the steps</button><div class="steps" hidden><ol><li>Add their details in your agent portal</li><li>We match and screen them</li><li>Your commission is confirmed once they move in</li></ol></div></div>
<div class="card"><img class="art" src="https://thenovourq.com/wp-content/uploads/2026/11/send-a-guest-1.jpg" alt="" style="object-fit:cover">
<h3>Send a guest</h3><p>Recommend us to travellers and get paid when their stay is completed.</p><button class="out" data-s="1">See the steps</button><div class="steps" hidden><ol><li>Add the guest and their dates</li><li>We handle the booking and the stay</li><li>Your commission is confirmed after check-out</li></ol></div></div>
<div class="card"><img class="art" src="https://thenovourq.com/wp-content/uploads/2026/11/list-a-property-2.jpg" alt="" style="object-fit:cover">
<h3>List a property with us</h3><p>Own or look after a property? Hand it to us to let and earn on it.</p><button class="out" data-s="2">See the steps</button><div class="steps" hidden><ol><li>Tell us about the property and its owner</li><li>We review it and agree terms</li><li>Your commission is confirmed once it is let</li></ol></div></div>
</div>

<section class="sec"><div class="eyebrow">What we look for</div><h2>What makes a property a good fit?</h2></section>
<div class="fit">
<div><div class="tile"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></div><h3>Good locations</h3><p>Areas with steady demand from renters and travellers</p></div>
<div><div class="tile"><svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M15 12v3"/></svg></div><h3>Ready to live in</h3><p>Clean, maintained homes that can be furnished and let quickly</p></div>
<div><div class="tile"><svg viewBox="0 0 24 24"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M6 9V6h12v3"/></svg></div><h3>1 to 2 bedrooms</h3><p>Best suited, but we will look at any size</p></div></div>
</div></div>
<section class="cta w"><div class="in"><h2>Start earning today</h2><p>Apply once, then log referrals from your own portal.</p><a href="#agentForm"><button class="big">Apply to become an agent</button></a></div></section>
<div class="w"><div class="in ft">
<div class="acc"><span>Help and resources</span><span>\u2304</span></div><div class="acc"><span>\ud83c\uddec\ud83c\udde7 English</span><span>\u2304</span></div>
<div class="news">Join our mailing list for new homes, updates and offers from NOVOURQ.<div class="mail"><span>Your email address</span><b>\u2192</b></div></div>
</div></div></div>
</div>`;
R.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=R.getElementById(a.getAttribute('href').slice(1));if(t)t.scrollIntoView({behavior:'smooth'})})});
R.querySelectorAll('.out').forEach(b=>b.onclick=()=>{const s=b.nextElementSibling;s.hidden=!s.hidden;b.textContent=s.hidden?'See the steps':'Hide the steps'})

R.getElementById('agentForm').addEventListener('submit',async function(e){
  e.preventDefault();var f=e.target,m=R.getElementById('agentMsg'),b=R.getElementById('agentGo');m.textContent='';b.disabled=true;b.textContent='Sending\u2026';
  var d={token:'09f49b848f8f451c',marketing:f.marketing.checked};['name','email','country_code','phone','role','country','instagram','website'].forEach(function(k){d[k]=f[k].value});
  try{var r=await fetch('https://app.thenovourq.com/api/public/agent-lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});var j=await r.json();
    if(!r.ok)throw new Error(j.error||'Something went wrong.');
    f.innerHTML='<h3 style="margin:8px 0 10px">Thank you, we have your application.</h3><p style="color:#444;line-height:1.6">We will be in touch shortly. Create your agent login now so you can start logging referrals once you are approved.</p><a href="'+(j.signup||'https://app.thenovourq.com/agent-signup/09f49b848f8f451c')+'"><button type="button" class="go">Create my agent account</button></a>';
  }catch(x){m.textContent=x.message;b.disabled=false;b.textContent='Apply to become an agent'}
});

})();
