// Runtime presentation uses serialized graphics and Text FontData, not replacement themes.
export function graphicFor(node, dynamic = {}) {
 const graphic=node.components.find(c=>c.color&&(c.class==='Image'||c.class==='UIAtlasImage'||c.class==='UIRenderTextureImage'));
 const loader=node.components.find(c=>c.dynamicGuid&&dynamic[c.dynamicGuid]);
 return {component:graphic,image:graphic?.image??(loader?dynamic[loader.dynamicGuid]:null),color:graphic?.color??{r:1,g:1,b:1,a:1}};
}
export function nativeTextLayout(value,font,width,height,measure,multilineBestFit=false){
 const text=String(value??''),base=font.m_FontSize||18,min=Math.max(1,font.m_MinSize||1),max=font.m_BestFit?font.m_MaxSize||base:base;
 const linesAt=size=>text.split('\n').flatMap(line=>{
  if(font.m_HorizontalOverflow===1)return[line];
  const rows=[];let row='';for(const ch of line){if(row&&measure(row+ch,size)>width){rows.push(row);row=ch;}else row+=ch;}rows.push(row);return rows;
 });
 const fit=size=>{const lines=linesAt(size),lineHeight=size*1.2,spacing=lineHeight*(font.m_LineSpacing||1);return {lines,lineHeight,spacing,fits:Math.max(0,...lines.map(s=>measure(s,size)))<=width+.01&&(font.m_VerticalOverflow===1||lineHeight+Math.max(0,lines.length-1)*spacing<=height+.01)};};
 let size=max,result=fit(size);
 if(font.m_BestFit||multilineBestFit)while(size>min&&!result.fits){size--;result=fit(size);}
 return {fontSize:size,...result};
}
export function ownsAnyMedal(medals,records,state){return medals.some(m=>state(m,records??{}).owned);}
export function windowRange(scrollTop,viewportHeight,rowHeight,count,overscan=2){
 const first=Math.max(0,Math.floor(scrollTop/rowHeight)-overscan),last=Math.min(count,Math.ceil((scrollTop+viewportHeight)/rowHeight)+overscan);
 return{first,last,height:count*rowHeight};
}
