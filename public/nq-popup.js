(function(){
var path=location.pathname.replace(/\/+$/,'');
var seen=false;try{seen=sessionStorage.getItem('nq_pop_seen')==='1'}catch(e){}
function build(){
var host=document.createElement('nq-popup');
host.id='nq-host';
host.style.cssText='display:block;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000';
document.body.appendChild(host);
var root=host.attachShadow({mode:'open'});
root.innerHTML='<style>'
+'*{box-sizing:border-box;font-family:Poppins,Arial,sans-serif}'
+'.ov{display:none;position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(10,18,40,.62);align-items:center;justify-content:center;padding:16px}'
+'.ov.on{display:flex}'
+'.box{position:relative;background:#fff;width:100%;max-width:460px;max-height:92vh;overflow:auto;border-radius:18px;padding:18px 20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center;color:#1d2433}'
+'.x{position:absolute;top:26px;right:26px;width:38px;height:38px;min-width:38px;padding:0;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#1A2C5E;font-size:24px;line-height:38px;cursor:pointer;z-index:2}'
+'img{display:block;width:100%;height:230px;object-fit:cover;object-position:center 62%;border-radius:14px;margin:0 0 20px}'
+'h2{margin:0 0 12px;font-size:25px;line-height:1.25;font-weight:700;color:#1A2C5E}'
+'p{margin:0 0 20px;font-size:16px;line-height:1.6;color:#3a4560}'
+'.btn{display:block;width:100%;padding:16px 18px;margin:0 0 12px;border-radius:12px;border:2px solid #1A2C5E;font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;text-align:center;cursor:pointer}'
+'.a{background:#1A2C5E;color:#fff}.b{background:#fff;color:#1A2C5E}'
+'.s{font-size:14px;color:#6b7590;margin:8px 0 0}.s a{color:#1A2C5E}'
+'form{display:none;text-align:left}'
+'input[type=text],input[type=email]{display:block;width:100%;padding:14px;margin:0 0 10px;border:1px solid #cfd6e6;border-radius:10px;font-size:15px;color:#1d2433;background:#fff}'
+'label.c{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45;color:#3a4560;margin:4px 0 14px}'
+'label.c input{margin-top:3px;width:18px;height:18px;accent-color:#1A2C5E;flex:none}'
+'#msg{font-size:14px;margin:0 0 10px}#msg.e{color:#b42318}'
+'#done{display:none}#hp{position:absolute;left:-9999px;opacity:0;height:0;width:0}'
+'</style>'
+'<div class="ov" id="ov"><div class="box" role="dialog" aria-modal="true" aria-label="Guaranteed Rent Scheme">'
+'<button type="button" class="x" id="x" aria-label="Close">&times;</button>'
+'<img src="https://thenovourq.com/wp-content/uploads/2026/08/IMG_5039.jpg" alt="NOVOURQ managed property">'
+'<div id="main"><h2>Sign Up To Our Guaranteed Rent Scheme Today</h2>'
+'<p>We currently manage properties across Jamaica and the UK, houses, apartments and hospitality units, backed by a pool of vetted, ready-to-move tenants.</p>'
+'<button type="button" class="btn a" id="more">Find out more</button>'
+'<a class="btn b" href="https://app.thenovourq.com/services/NOVOURQ_Brochure.pdf" target="_blank" rel="noopener">View brochure</a>'
+'<p class="s">Minimum contracts of 3 to 5 years</p>'
+'<p class="s">Email us today: <a href="mailto:contact.us@thenovourq.com">contact.us@thenovourq.com</a></p></div>'
+'<form id="form" novalidate><h2 style="text-align:center">Find out more</h2><p style="text-align:center">Leave your email and a member of the team will be in touch.</p>'
+'<input type="text" id="name" placeholder="Your name" autocomplete="name">'
+'<input type="email" id="email" placeholder="Your email address" autocomplete="email">'
+'<input type="text" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
+'<label class="c"><input type="checkbox" id="ok"><span>I agree to receive emails from NOVOURQ about its services and offers. I can unsubscribe at any time.</span></label>'
+'<div id="msg" role="status"></div>'
+'<button type="submit" class="btn a" id="go">Send</button><button type="button" class="btn b" id="back">Back</button></form>'
+'<div id="done"><h2>Thank you</h2><p>We have your details and will be in touch soon. You can read our brochure while you wait.</p>'
+'<a class="btn a" href="https://app.thenovourq.com/services/NOVOURQ_Brochure.pdf" target="_blank" rel="noopener">View brochure</a></div>'
+'</div></div>';
var $=function(i){return root.getElementById(i)};
var ov=$('ov'),main=$('main'),form=$('form'),done=$('done'),msg=$('msg');
function show(){ov.classList.add('on');document.body.style.overflow='hidden'}
function hide(){ov.classList.remove('on');document.body.style.overflow='';try{sessionStorage.setItem('nq_pop_seen','1')}catch(e){}}
$('x').onclick=hide;
ov.onclick=function(e){if(e.target===ov)hide()};
document.addEventListener('keydown',function(e){if(e.key==='Escape')hide()});
$('more').onclick=function(){main.style.display='none';form.style.display='block'};
$('back').onclick=function(){form.style.display='none';main.style.display='block';msg.textContent=''};
form.onsubmit=function(e){
 e.preventDefault();
 var email=$('email').value.trim();msg.className='';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.className='e';msg.textContent='Please enter a valid email address.';return}
 if(!$('ok').checked){msg.className='e';msg.textContent='Please tick the box so we can email you.';return}
 var go=$('go');go.disabled=true;go.textContent='Sending...';
 fetch('https://app.thenovourq.com/api/public/join-list',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:email,name:$('name').value.trim(),consent:true,website:$('hp').value,source:'Website popup'})})
 .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})
 .then(function(x){
  if(x.ok){form.style.display='none';done.style.display='block'}
  else{msg.className='e';msg.textContent=(x.j&&x.j.error)||'Something went wrong. Please try again.';go.disabled=false;go.textContent='Send'}
 }).catch(function(){msg.className='e';msg.textContent='Something went wrong. Please try again.';go.disabled=false;go.textContent='Send'});
};
if(path===''&&!seen)setTimeout(show,1500);
}
if(document.body)build();else document.addEventListener('DOMContentLoaded',build);
})();
