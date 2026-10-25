const frame=document.getElementById('previewFrame'),page=document.getElementById('previewPage'),viewport=document.getElementById('previewViewport');
function load(){frame.src='/preview/'+page.value;document.getElementById('previewOpen').href=frame.src;}
page.onchange=load;document.getElementById('previewReload').onclick=load;
viewport.onchange=()=>{frame.style.width=viewport.value==='full'?'100%':viewport.value+'px';};
document.querySelector('[data-tab="preview"]').addEventListener('click',()=>{if(!frame.getAttribute('src'))load();});
