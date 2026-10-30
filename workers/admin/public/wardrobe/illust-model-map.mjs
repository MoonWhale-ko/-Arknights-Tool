// Resource directory names are lowercase; game skin IDs retain brand capitalization.
export function illustrationEntry(skin,manifest){
 const key=('dyn_illust_'+(skin.illustration||'').replace(/^illust_char_/,'' )).toLowerCase();
 const alias={'dyn_illust_4087_ines_ambiencesynesthesia#5':'dyn_illust_4087_ines_ambiencesynesthesia'};
 return manifest[key]||manifest[alias[key]]||(skin.basic&&skin.elite===2?manifest[key.replace(/_2$/,'')]:null)||null;
}
export function decodeSpineModel(bytes,format){
 const view=new Uint8Array(bytes);
 const json=format==='json'||[...view.slice(0,32)].find(b=>b!==32&&b!==10&&b!==13&&b!==9)===123;
 return {format:json?'json':'binary',data:json?JSON.parse(new TextDecoder().decode(view)):view};
}
// Keep the settled pose's framing; enlarge only the drawing surface for motion.
export function illustrationViewport(width,height,frame,bounds=frame){
 const scale=Math.min(width/frame.width,height/frame.height),x=width/2-(frame.x+frame.width/2)*scale,y=height/2-(frame.y+frame.height/2)*scale;
 const left=Math.min(0,x+bounds.x*scale),top=Math.min(0,y+bounds.y*scale),right=Math.max(width,x+(bounds.x+bounds.width)*scale),bottom=Math.max(height,y+(bounds.y+bounds.height)*scale);
 return {scale,left,top,width:right-left,height:bottom-top,x:x-left,y:y-top};
}
