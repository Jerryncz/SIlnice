// Spuštění a hlavní smyčka.
readColors();resize();fit();applySettings();setTool("build");
new ResizeObserver(()=>resize()).observe(cv);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",readColors);
new MutationObserver(readColors).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
if(matchMedia("(max-width:860px)").matches)$("probBox").open=false;
let lastT=performance.now(),acc=0,lastUI=0;
function frame(now){const dt=Math.min(0.1,(now-lastT)/1000);lastT=now;
  if(keysDown.size){const v=600*dt;if(keysDown.has("ArrowLeft"))cam.x-=v;if(keysDown.has("ArrowRight"))cam.x+=v;if(keysDown.has("ArrowUp"))cam.y-=v;if(keysDown.has("ArrowDown"))cam.y+=v;clampCam()}
  if(speed>0){acc+=dt*speed;let n=0;while(acc>=STEP&&n<24){step(S,STEP);acc-=STEP;n++}if(n>=24)acc=0}
  try{render()}catch(err){console.error(err)}
  if(now-lastUI>300||UI.selDirty){updateUI();lastUI=now;UI.selDirty=false}requestAnimationFrame(frame)}
updateUI();requestAnimationFrame(frame);
window.__osady={get S(){return S},cam,UI,carPose:c=>carPose(c)};
