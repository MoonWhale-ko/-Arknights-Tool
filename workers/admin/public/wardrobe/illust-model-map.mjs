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
