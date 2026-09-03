(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CVISADOS_REPORT_LAYOUT=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const MAX_DYNAMIC_GAP_IN=0.05;
  function gapPxForPage(pageWidthPx,pageWidthIn){
    const px=Number(pageWidthPx), inches=Number(pageWidthIn);
    if(!(px>0)||!(inches>0))throw new TypeError('page dimensions must be positive');
    return px/inches*MAX_DYNAMIC_GAP_IN;
  }
  function packAtomicRows(rowHeights,pageCapacity,gapPx){
    const cap=Number(pageCapacity), gap=Math.max(0,Number(gapPx)||0);
    if(!(cap>0))throw new TypeError('page capacity must be positive');
    const pages=[];
    let page={indices:[],tops:[],heights:[],usedHeight:0};
    const flush=()=>{if(page.indices.length){pages.push(page);page={indices:[],tops:[],heights:[],usedHeight:0}}};
    rowHeights.forEach((raw,index)=>{
      const h=Number(raw);
      if(!(h>=0))throw new TypeError('row heights must be non-negative');
      if(h>cap)throw new RangeError(`row ${index} exceeds page capacity`);
      const top=page.indices.length?page.usedHeight+gap:0;
      if(top+h>cap&&page.indices.length){flush()}
      const nextTop=page.indices.length?page.usedHeight+gap:0;
      page.indices.push(index);page.tops.push(nextTop);page.heights.push(h);page.usedHeight=nextTop+h;
    });
    flush();
    return pages;
  }
  return {MAX_DYNAMIC_GAP_IN,gapPxForPage,packAtomicRows};
});
