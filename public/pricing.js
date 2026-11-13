/* NOVOURQ pricing for the website. Prices are read live from Stripe through the portal, and Choose plan opens Stripe Checkout.
   Add to the website with: <div id="novourq-pricing"></div><script src="https://app.thenovourq.com/pricing.js"></script> */
(function(){
var host=document.getElementById('novourq-pricing');if(!host)return;
var API='https://app.thenovourq.com';
var R=host.attachShadow({mode:'open'});
R.innerHTML='<style>:host{display:block}*{box-sizing:border-box}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;font-family:Manrope,Inter,system-ui,sans-serif}.c{border-radius:32px;padding:32px 28px;display:flex;flex-direction:column;background:#E9EFFB;color:#1F2D5C;min-height:340px}.c.d{background:#1F2D5C;color:#fff}.t{display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:600;gap:8px}.b{background:#fff;color:#1F2D5C;border-radius:999px;font-size:14px;font-weight:700;padding:10px 16px;white-space:nowrap}.p{margin-top:auto;padding-top:48px;font-size:46px;font-weight:700;line-height:1}.p small{font-size:22px;font-weight:500;opacity:.6;margin-left:8px}.p s{font-size:22px;font-weight:500;opacity:.7;margin-left:10px}.n{font-size:17px;line-height:1.5;opacity:.75;margin:14px 0 24px}.k{border:0;border-radius:999px;background:#1F2D5C;color:#fff;font:700 18px Manrope,Inter,system-ui,sans-serif;padding:20px;cursor:pointer;width:100%}.d .k{background:#fff;color:#1F2D5C}.k:disabled{opacity:.6;cursor:default}.e{color:#B42318;font-size:14px;margin-top:10px}.l{font-size:15px;opacity:.8}</style><div class="g" id="g"><div class="l">Loading prices\u2026</div></div><div class="e" id="e"></div>';
var g=R.getElementById('g'),er=R.getElementById('e');
var SYM={GBP:'\u00a3',USD:'$',EUR:'\u20ac'};
function money(c,n){var s=SYM[c]||'';return s+Number(n).toLocaleString('en-GB',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})}
function copy(p){
  if(p.key==='lifetime')return 'Pay once and it is yours for life. No monthly payments, ever. Only the first 10 clients.';
  if(p.recurring&&p.interval==='month')return 'Pay month by month. Your whole portfolio, one simple payment. Start with a 14 day free trial.';
  if(p.recurring)return 'Pay once a year for your whole portfolio, one simple payment. Start with a 14 day free trial.';
  return 'Pay once and it is yours for life. No monthly payments, ever.';
}
function title(p){return p.key==='lifetime'?'Founding client':p.recurring&&p.interval==='month'?'Monthly':p.recurring?'Annual':'One-time payment'}
fetch(API+'/api/public/pricing').then(function(r){return r.json()}).then(function(d){
  var plans=d.plans||[];if(!plans.length){g.innerHTML='<div class="l">Prices are not available right now. Please try again shortly.</div>';return}
  g.innerHTML='';
  plans.forEach(function(p,i){
    var dark=p.key!=='monthly';
    var el=document.createElement('div');el.className='c'+(dark?' d':'');
    var save=p.was?Math.round((1-p.amount/p.was)*100):0;
    el.innerHTML='<div class="t"><span>'+title(p)+'</span>'+(save>0?'<span class="b">Save '+save+'%</span>':p.key==='lifetime'&&d.lifetimeLeft!=null?'<span class="b">'+d.lifetimeLeft+' left</span>':'')+'</div>'
      +'<div class="p">'+money(p.currency,p.amount)+(p.recurring?'<small>/'+(p.interval==='year'?'year':'month')+'</small>':'')+(p.was?'<s>'+money(p.currency,p.was)+'</s>':'')+'</div>'
      +'<div class="n">'+copy(p)+'</div><button class="k">Choose plan</button>';
    var btn=el.querySelector('.k');
    btn.onclick=function(){
      er.textContent='';btn.disabled=true;btn.textContent='Opening secure checkout\u2026';
      fetch(API+'/api/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:p.key,cancelUrl:location.href.split('#')[0]})})
        .then(function(r){return r.json()}).then(function(j){
          if(j.url){location.href=j.url;return}
          throw new Error(j.error||'Could not open checkout.')
        }).catch(function(x){er.textContent=x.message;btn.disabled=false;btn.textContent='Choose plan'});
    };
    g.appendChild(el);
  });
}).catch(function(){g.innerHTML='<div class="l">Prices are not available right now. Please try again shortly.</div>'});
})();
