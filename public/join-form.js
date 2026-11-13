/* Embeddable "join our list" form. Paste on any website:
   <script src="https://app.thenovourq.com/join-form.js" data-business="COMPANY_ID" data-title="Get our updates"></script>
   Add data-interest="platform" for people who want the AI platform (they are tagged "platform" in the CRM and get their own audience in the Mailing list); leave it off for landlord services.
   Saves the person into that company's CRM with marketing opt-in recorded. */
(function(){
var s=document.currentScript;if(!s)return;
var biz=s.getAttribute('data-business')||'';
var title=s.getAttribute('data-title')||'Join our mailing list';
var interest=s.getAttribute('data-interest')||'';   // 'platform' = wants the AI platform; blank = landlord services
var API='https://app.thenovourq.com/api/public/join-list';
var host=document.createElement('nq-join');host.style.display='block';
s.parentNode.insertBefore(host,s.nextSibling);
var r=host.attachShadow({mode:'open'});
r.innerHTML='<style>*{box-sizing:border-box;font-family:Arial,sans-serif}.w{max-width:420px;margin:0 auto;border:1px solid #e4e9f4;border-radius:14px;padding:22px;background:#fff;color:#1A2C5E}h3{margin:0 0 14px;font-size:20px}input[type=text],input[type=email]{display:block;width:100%;padding:12px;margin:0 0 10px;border:1px solid #cfd6e6;border-radius:10px;font-size:15px}label{display:flex;gap:10px;font-size:13px;line-height:1.45;color:#3a4560;margin:4px 0 14px}label input{margin-top:3px;width:18px;height:18px;flex:none}button{width:100%;padding:14px;border:0;border-radius:10px;background:#1A2C5E;color:#fff;font-size:15px;font-weight:700;cursor:pointer}#m{font-size:14px;margin:0 0 10px;color:#b42318}#hp{position:absolute;left:-9999px;opacity:0;height:0;width:0}</style><div class="w"><form id="f" novalidate><h3></h3><input type="text" id="n" placeholder="Your name"><input type="email" id="e" placeholder="Your email address"><input type="text" id="hp" tabindex="-1" autocomplete="off"><label><input type="checkbox" id="c"><span>I agree to receive emails about services and offers. I can unsubscribe at any time.</span></label><div id="m"></div><button type="submit" id="b">Sign up</button></form><div id="d" style="display:none"><h3>Thank you</h3><p style="margin:0;font-size:15px">You are on the list.</p></div></div>';
r.querySelector('h3').textContent=title;
var $=function(i){return r.getElementById(i)};
$('f').onsubmit=function(ev){ev.preventDefault();var m=$('m');m.textContent='';
var email=$('e').value.trim();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){m.textContent='Please enter a valid email address.';return}
if(!$('c').checked){m.textContent='Please tick the box so we can email you.';return}
var b=$('b');b.disabled=true;b.textContent='Sending...';
fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,name:$('n').value.trim(),consent:true,website:$('hp').value,business:biz,source:interest==='platform'?'Website sign-up form (AI platform)':'Website sign-up form',interest:interest})})
.then(function(x){return x.json().then(function(j){return{ok:x.ok,j:j}})})
.then(function(x){if(x.ok){$('f').style.display='none';$('d').style.display='block'}else{m.textContent=(x.j&&x.j.error)||'Something went wrong.';b.disabled=false;b.textContent='Sign up'}})
.catch(function(){m.textContent='Something went wrong.';b.disabled=false;b.textContent='Sign up'});};
})();
