(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* world clocks */
  function tick(){
    document.querySelectorAll('[data-tz]').forEach(el=>{
      try{ el.textContent = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:el.dataset.tz}).format(new Date()); }catch(e){}
    });
  }
  tick(); setInterval(tick, 20000);

  /* count up */
  function countUp(el){
    const end = +el.dataset.count, pre = el.dataset.prefix||'', suf = el.dataset.suffix||'';
    if(reduce){ el.textContent = pre + end.toLocaleString('en-US') + suf; return; }
    const t0 = performance.now(), dur = 1500;
    (function step(t){
      const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = pre + Math.round(end*e).toLocaleString('en-US') + suf;
      if(p<1) requestAnimationFrame(step);
    })(t0);
  }

  /* departure-board scramble */
  const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function scramble(el, delay){
    const target = el.textContent; if(reduce) return;
    let frame = 0; const total = 22 + Math.floor(Math.random()*10);
    setTimeout(function run(){
      el.textContent = target.split('').map((c,i)=>{
        if(c===' '||c==='·'||c===','||c==='$'||c==='+') return c;
        return (frame/total) > (i/target.length) ? c : CH[Math.floor(Math.random()*CH.length)];
      }).join('');
      if(++frame <= total) setTimeout(run, 45); else el.textContent = target;
    }, delay);
  }

  /* reveal observer */
  const io = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      const el = en.target; el.classList.add('in'); io.unobserve(el);
      el.querySelectorAll('[data-count]').forEach(countUp);
      if(el.classList.contains('board')) el.querySelectorAll('.flap').forEach((f,i)=>scramble(f, i*55));
      if(el.id==='gpa') el.querySelectorAll('i').forEach(i=>i.style.height = i.dataset.h+'px');
    });
  },{threshold:.18, rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('[data-reveal], #chainEl, #stack, #gpa').forEach(el=>io.observe(el));
  if(reduce){ document.querySelectorAll('#gpa i').forEach(i=>i.style.height=i.dataset.h+'px'); }

  /* mission words */
  const words = document.getElementById('words');
  (function split(node){
    [...node.childNodes].forEach(n=>{
      if(n.nodeType===3){
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w=>{
          if(!w) return;
          if(/^\s+$/.test(w)){ frag.appendChild(document.createTextNode(w)); return; }
          const s = document.createElement('span'); s.className='w'; s.textContent=w; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if(n.nodeType===1){ n.classList.add('w'); }
    });
  })(words);
  const wEls = words.querySelectorAll('.w');

  /* scroll-driven: progress bar, words, voyage ship */
  const bar = document.getElementById('progress');
  const voy = document.getElementById('voyageEl'), ship = document.getElementById('ship'), vfill = document.getElementById('vfill');
  const ports = voy.querySelectorAll('.port');
  let ticking = false;
  function onScroll(){
    ticking = false;
    const vh = window.innerHeight, doc = document.documentElement;
    bar.style.transform = 'scaleX(' + (doc.scrollTop/(doc.scrollHeight-vh||1)) + ')';
    const wr = words.getBoundingClientRect();
    const wp = reduce ? 1 : Math.min(1, Math.max(0, (vh*0.85 - wr.top)/(wr.height + vh*0.35)));
    const lit = Math.round(wp*wEls.length);
    wEls.forEach((w,i)=>w.classList.toggle('on', i<lit));
    const r = voy.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh*0.55 - r.top)/r.height));
    const travel = r.height - ship.offsetHeight;
    ship.style.transform = 'translateY(' + (p*travel) + 'px)';
    vfill.style.transform = 'scaleY(' + p + ')';
    const shipY = r.top + p*travel + ship.offsetHeight/2;
    ports.forEach(pt=>{ pt.classList.toggle('passed', pt.getBoundingClientRect().top + 46 <= shipY + 2); });
  }
  window.addEventListener('scroll', ()=>{ if(!ticking){ ticking=true; requestAnimationFrame(onScroll);} }, {passive:true});
  window.addEventListener('resize', onScroll);
  onScroll();

  /* globe */
  const cv = document.getElementById('globe'), ctx = cv.getContext('2d');
  const D2R = Math.PI/180;
  const mine = [
    {n:'Hanoi', lat:21.03, lon:105.85, main:true},
    {n:'Lạng Sơn', lat:21.85, lon:106.76},
    {n:'Bandung', lat:-6.91, lon:107.61, main:true},
    {n:'USA', lat:39.5, lon:-98.35, main:true, big:true}
  ];
  /* other destinations reached from Hanoi (secondary routes) */
  const dests = [[1.35,103.82],[35.68,139.69],[-33.87,151.21],[51.51,-0.13],[25.2,55.27],[37.57,126.98],[49.28,-123.12]];
  const hubs = [[1.35,103.82],[31.23,121.47],[35.68,139.69],[25.2,55.27],[51.92,4.48],[40.71,-74.0],[34.05,-118.24],[-33.87,151.21],[41.88,-87.63],[22.32,114.17],[-23.55,-46.63],[19.07,72.88]];
  const routes = [[0,1],[1,2],[0,3],[3,4],[4,5],[2,6],[6,8],[5,8],[0,7],[9,1],[3,11],[11,0],[5,10],[9,6]];
  let W=0, R=0, lon0=190, lat0=28, visible=true, last=0;
  function size(){
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const r = cv.getBoundingClientRect(); W = r.width;
    cv.width = W*dpr; cv.height = W*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); R = W*0.42;
  }
  function proj(lat, lon, h){
    h = h||1;
    const p = lat*D2R, l = (lon-lon0)*D2R, p0 = lat0*D2R;
    const cosc = Math.sin(p0)*Math.sin(p) + Math.cos(p0)*Math.cos(p)*Math.cos(l);
    const x = Math.cos(p)*Math.sin(l);
    const y = Math.cos(p0)*Math.sin(p) - Math.sin(p0)*Math.cos(p)*Math.cos(l);
    return {x: W/2 + R*x*h, y: W/2 - R*y*h, v: cosc > (h>1 ? -0.25 : 0)};
  }
  function vec(lat,lon){ const p=lat*D2R,l=lon*D2R; return [Math.cos(p)*Math.cos(l),Math.cos(p)*Math.sin(l),Math.sin(p)]; }
  function slerp(a,b,t){
    const va=vec(a[0],a[1]), vb=vec(b[0],b[1]);
    const d=Math.min(1,Math.max(-1,va[0]*vb[0]+va[1]*vb[1]+va[2]*vb[2])), om=Math.acos(d);
    if(om<1e-6) return a;
    const s1=Math.sin((1-t)*om)/Math.sin(om), s2=Math.sin(t*om)/Math.sin(om);
    const v=[va[0]*s1+vb[0]*s2, va[1]*s1+vb[1]*s2, va[2]*s1+vb[2]*s2];
    return [Math.asin(v[2])/D2R, Math.atan2(v[1],v[0])/D2R, om];
  }
  function arc(a,b,color,width,phase,lift){
    const om = slerp(a,b,.5)[2]||0.1, hmax = 1 + Math.min(.28, om*.18*lift);
    ctx.beginPath(); let started=false;
    for(let i=0;i<=48;i++){
      const t=i/48, q=slerp(a,b,t), pt=proj(q[0],q[1],1+(hmax-1)*Math.sin(Math.PI*t));
      if(!pt.v){ started=false; continue; }
      if(!started){ ctx.moveTo(pt.x,pt.y); started=true; } else ctx.lineTo(pt.x,pt.y);
    }
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
    if(phase!=null){
      const q=slerp(a,b,phase), pt=proj(q[0],q[1],1+(hmax-1)*Math.sin(Math.PI*phase));
      if(pt.v){ ctx.beginPath(); ctx.arc(pt.x,pt.y,width+1.2,0,7); ctx.fillStyle=color.replace(/[\d.]+\)$/,'1)'); ctx.fill(); }
    }
  }
  function draw(t){
    ctx.clearRect(0,0,W,W);
    const g = ctx.createRadialGradient(W*.42,W*.38,R*.1,W/2,W/2,R);
    g.addColorStop(0,'rgba(36,92,140,.55)'); g.addColorStop(1,'rgba(8,32,56,.85)');
    ctx.beginPath(); ctx.arc(W/2,W/2,R,0,7); ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='rgba(120,180,230,.35)'; ctx.lineWidth=1; ctx.stroke();
    ctx.lineWidth=.7; ctx.strokeStyle='rgba(150,190,230,.16)';
    for(let lon=-180; lon<180; lon+=20){
      ctx.beginPath(); let s=false;
      for(let lat=-88; lat<=88; lat+=4){ const p=proj(lat,lon); if(!p.v){s=false;continue;} s?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); s=true; }
      ctx.stroke();
    }
    for(let lat=-60; lat<=60; lat+=20){
      ctx.beginPath(); let s=false;
      for(let lon=-180; lon<=180; lon+=4){ const p=proj(lat,lon); if(!p.v){s=false;continue;} s?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); s=true; }
      ctx.strokeStyle = lat===0 ? 'rgba(255,194,58,.35)' : 'rgba(150,190,230,.16)'; ctx.stroke();
    }
    routes.forEach((r,i)=>arc(hubs[r[0]],hubs[r[1]],'rgba(120,200,230,.28)',1, reduce?null:((t/6000 + i*.137)%1), 1));
    hubs.forEach(h=>{ const p=proj(h[0],h[1]); if(p.v){ ctx.beginPath(); ctx.arc(p.x,p.y,2.2,0,7); ctx.fillStyle='rgba(200,225,245,.75)'; ctx.fill(); }});
    const A=[mine[0].lat,mine[0].lon], B=[mine[2].lat,mine[2].lon], C=[mine[1].lat,mine[1].lon], U=[mine[3].lat,mine[3].lon];
    dests.forEach((d,i)=>arc(A,d,'rgba(255,194,58,.55)',1.3, reduce?null:((t/4200 + i*.19)%1), 1.6));
    arc(A,B,'rgba(255,194,58,.85)',1.8, reduce?null:((t/3000)%1), 1.8);
    arc(A,C,'rgba(255,194,58,.85)',1.6, null, 1);
    arc(A,U,'rgba(255,106,43,.98)',2.8, reduce?null:((t/3200)%1), 1.5);
    ctx.font='600 13px "Hanken Grotesk", sans-serif';
    mine.forEach(m=>{
      const p=proj(m.lat,m.lon); if(!p.v) return;
      const pulse = reduce?0:((t/1400)%1);
      if(m.main){ ctx.beginPath(); ctx.arc(p.x,p.y,4+pulse*14,0,7); ctx.strokeStyle='rgba(255,106,43,'+(1-pulse)+')'; ctx.lineWidth=1.5; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(p.x,p.y,m.main?4.5:3,0,7); ctx.fillStyle='#fff'; ctx.fill();
      if(m.main){ ctx.fillStyle='#fff'; ctx.font = m.big ? '700 17px "Bricolage Grotesque", sans-serif' : '600 13px "Hanken Grotesk", sans-serif'; ctx.fillText(m.n, p.x+10, p.y+(m.n==='Hanoi'?-6:(m.big?-8:14))); }
    });
  }
  function loop(t){
    if(visible){
      const dt = last? Math.min(50,t-last):16; last=t;
      if(!reduce) lon0 = 185 + 38*Math.sin(t/14000);
      draw(t);
    } else last = 0;
    requestAnimationFrame(loop);
  }
  size(); window.addEventListener('resize', size);
  new IntersectionObserver(e=>{ visible = e[0].isIntersecting; }).observe(cv);
  if(reduce){ draw(0); } else requestAnimationFrame(loop);
})();
