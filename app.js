/* PixelLens - MobileNetV2 (tfjs) fully in-browser. */
(()=>{
const q=s=>document.querySelector(s);
const stage=q('#stage');
let model=null, busy=false, pending=null, nClass=0, msTotal=0, histCount=0;
let stream=null, video=null;

async function loadModel(){
  q('#st-model').textContent='loading...';
  try{await tf.setBackend('webgl');}catch(e){}
  await tf.ready();
  model=await mobilenet.load({version:2,alpha:1.0,modelUrl:'./models/mobilenet/model.json'});
  // warm-up so first real classification is honest
  const warm=document.createElement('canvas');warm.width=warm.height=224;
  await model.classify(warm);
  q('#st-model').textContent='ready ('+tf.getBackend()+')';
}
function setImage(node){
  stage.innerHTML='';stage.append(node);
}
function loadSrc(src){
  const img=new Image();
  img.onload=()=>{setImage(img);classify(img);};
  img.src=src;
}
async function classify(img){
  if(!model)return;
  if(busy){pending=img;return;}
  busy=true;stage.classList.add('scanning');
  const t0=performance.now();
  try{
    const sq=document.createElement('canvas');sq.width=sq.height=224;
    const iw=img.naturalWidth||img.videoWidth,ih=img.naturalHeight||img.videoHeight;
    const side=Math.min(iw,ih);
    sq.getContext('2d').drawImage(img,(iw-side)/2,(ih-side)/2,side,side,0,0,224,224);
    const preds=await model.classify(sq,5);
    const ms=performance.now()-t0;
    nClass++;msTotal+=ms;
    q('#st-ms').textContent=Math.round(ms);
    q('#st-n').textContent=nClass;
    q('#st-avg').textContent=Math.round(msTotal/nClass);
    renderPreds(preds);
    pushHistory(img,preds[0]);
  }catch(e){
    toast('Classification failed - try another image');
  }
  stage.classList.remove('scanning');busy=false;
  if(pending){const p=pending;pending=null;classify(p);}
}
function cleanName(n){return n.split(',')[0].trim();}
function renderPreds(preds){
  const el=q('#pred');
  el.innerHTML='';
  preds.forEach((p,i)=>{
    const pc=(p.probability*100);
    const row=document.createElement('div');row.className='prow'+(i===0?' top':'');
    row.innerHTML=`<span class="lbl">${i+1}. ${cleanName(p.className)}</span><span class="pc">${pc.toFixed(1)}%</span>
      <div class="tr"><div class="fl" style="width:${Math.max(2,pc).toFixed(1)}%"></div></div>`;
    el.appendChild(row);
  });
}
function pushHistory(img,top){
  const el=q('#hist');
  if(histCount===0)el.innerHTML='';
  histCount++;
  const c=document.createElement('canvas');
  const s=120;c.width=s;c.height=s;
  const iw=img.naturalWidth,ih=img.naturalHeight,sc=Math.max(s/iw,s/ih);
  c.getContext('2d').drawImage(img,(s-iw*sc)/2,(s-ih*sc)/2,iw*sc,ih*sc);
  const cell=document.createElement('div');cell.className='hcell';
  cell.innerHTML=`<img src="${c.toDataURL('image/jpeg',0.75)}" alt="">
    <div class="hc">${cleanName(top.className)}<span>${(top.probability*100).toFixed(0)}%</span></div>`;
  cell.onclick=()=>{setImage(img);};
  el.prepend(cell);
  while(el.children.length>12)el.lastChild.remove();
}
q('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>loadSrc(r.result);r.readAsDataURL(f);};
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>loadSrc(b.dataset.s));
const drop=q('#drop');
['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(!f||!f.type.startsWith('image/'))return;const r=new FileReader();r.onload=()=>loadSrc(r.result);r.readAsDataURL(f);});
let camLive=false;
q('#camBtn').onclick=async()=>{
  if(camLive){snapFromCam();return;}
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:960}},audio:false});}
  catch(e){toast('Camera blocked - allow permission or upload a photo');return;}
  video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
  await video.play();
  setImage(video);
  camLive=true;
  q('#camBtn').textContent='Snap & classify';
};
function snapFromCam(){
  if(!video)return;
  const c=document.createElement('canvas');
  c.width=video.videoWidth;c.height=video.videoHeight;
  c.getContext('2d').drawImage(video,0,0);
  const img=new Image();
  img.onload=()=>{stopCam();setImage(img);classify(img);};
  img.src=c.toDataURL('image/jpeg',0.92);
}
function stopCam(){
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=null;video=null;camLive=false;
  q('#camBtn').textContent='Capture from webcam';
}
function toast(msg){const t=document.createElement('div');t.className='toast show';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3200);}
loadModel().catch(e=>{q('#st-model').textContent='load error';toast('Model failed to load - check connection and reload');});
})();
