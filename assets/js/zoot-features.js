/* Use light artwork for planned progress without changing saved plan values. */
(()=>{
 'use strict';
 const init=()=>{
  if(!document.body.classList.contains('zoot-plans'))return;
  const update=()=>{
   const light=document.documentElement.dataset.theme!=='dark';
   document.querySelectorAll('.card .cycle img').forEach(img=>{
    const original=img.dataset.progressOriginal||(img.dataset.progressOriginal=img.getAttribute('src'));
    const target=light?original.replace('assets/icons/progress/','assets/icons/progress/light/'):original;
    if(img.getAttribute('src')!==target)img.setAttribute('src',target);
   });
  };
  const grid=document.getElementById('grid');
  if(grid)new MutationObserver(update).observe(grid,{childList:true,subtree:true});
  new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  update();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
