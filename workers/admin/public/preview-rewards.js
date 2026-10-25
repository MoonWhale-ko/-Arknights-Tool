const select=id=>{for(const name of ['mining','orundum'])document.getElementById(name).hidden=name!==id;for(const b of document.querySelectorAll('[data-reward]'))b.setAttribute('aria-pressed',String(b.dataset.reward===id));};
select('mining');
for(const button of document.querySelectorAll('[data-reward]'))button.onclick=()=>select(button.dataset.reward);
for(const type of ['mining','orundum'])window.addEventListener(type+'-request-account',()=>{if(parent!==window)parent.postMessage({type:'preview-account-request'},location.origin);});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='preview-account')return;for(const type of ['mining','orundum'])window.dispatchEvent(new CustomEvent(type+'-account',{detail:e.data.account}));});

window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='preview-clear')for(const type of ['mining','orundum'])window.dispatchEvent(new Event(type+'-clear'));});
