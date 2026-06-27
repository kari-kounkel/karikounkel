/* karikounkel.com — the app. Injects styles + markup + behavior, reads window.MARBLES.
   Served from GitHub Pages; the DreamHost shell just loads this. Edit + push = live. */
(function(){
  var PAGES = "https://kari-kounkel.github.io/karikounkel/";
  var JAR = PAGES + "jar.png";

  // --- fonts ---
  var f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Caveat:wght@600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap";
  document.head.appendChild(f);

  // --- styles ---
  var style = document.createElement("style");
  style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{--ink:#3a2f50;--muted:#8a82a0;}
  body{font-family:"Nunito Sans",system-ui,sans-serif;color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;
    background:radial-gradient(ellipse at 50% 0%, #fff 0%, #f5eff9 55%, #ece3f3 100%);min-height:100vh;overflow-x:hidden;}
  .wrap{max-width:1100px;margin:0 auto;padding:0 22px;}
  header{text-align:center;padding:44px 22px 4px;}
  .eyebrow{font-family:"Caveat",cursive;font-weight:700;font-size:30px;color:#E5006E;transform:rotate(-2deg);}
  .logo{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:clamp(44px,8vw,86px);line-height:1;letter-spacing:-.01em;color:#8B3DFF;}
  .logo em{font-style:italic;font-weight:400;color:#8B3DFF;}
  .story{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:400;font-size:clamp(16px,2.3vw,22px);color:#4a3d63;margin:14px auto 0;max-width:540px;text-wrap:balance;line-height:1.4;}
  .sub{font-family:"Caveat",cursive;font-weight:700;font-size:26px;color:#8B3DFF;margin-top:10px;}
  .stage{position:relative;height:500px;margin-top:4px;}
  .marble{position:absolute;touch-action:none;border-radius:50%;cursor:grab;border:none;padding:0;display:flex;align-items:center;justify-content:center;
    color:#fff;font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:12px;text-align:center;line-height:1.1;text-shadow:0 1px 3px rgba(0,0,0,.35);
    animation:bob 6s ease-in-out infinite;transition:box-shadow .25s, transform .2s;-webkit-user-select:none;user-select:none;z-index:7;}
  .marble span.t{padding:0 6px;pointer-events:none;}
  .marble .shine{position:absolute;top:18%;left:22%;width:30%;height:24%;border-radius:50%;background:rgba(255,255,255,.8);filter:blur(2px);pointer-events:none;}
  .marble:hover{transform:scale(1.07);}
  .marble.drag{cursor:grabbing;animation:none;z-index:9999;transform:scale(1.12);}
  @keyframes bob{0%,100%{margin-top:0;}50%{margin-top:-9px;}}
  .jarzone{position:absolute;left:50%;transform:translateX(-50%);bottom:8px;width:400px;z-index:6;pointer-events:none;}
  .glass{width:400px;height:auto;display:block;transition:filter .2s;mix-blend-mode:multiply;}
  .jarzone.hot .glass{filter:drop-shadow(0 0 18px #E5006E);}
  .droplabel{position:absolute;top:54%;left:0;right:0;text-align:center;font-family:"Caveat",cursive;font-weight:700;font-size:22px;color:#b6abcb;transition:opacity .3s;}
  .controls{text-align:center;margin-top:14px;}
  .btn{font-family:"Nunito Sans";font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;
    background:#3a2f50;color:#fff;border:none;border-radius:30px;padding:12px 24px;cursor:pointer;box-shadow:0 8px 20px -6px rgba(70,40,110,.5);}
  .btn:hover{transform:translateY(-2px);}
  .tray{max-width:820px;margin:18px auto 0;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:10px;}
  .chip{display:inline-flex;align-items:center;gap:10px;background:#fff;border-radius:30px;padding:8px 8px 8px 14px;
    box-shadow:0 6px 18px -8px rgba(70,40,110,.4);animation:pop .35s cubic-bezier(.34,1.5,.5,1);}
  .chip .dot{width:14px;height:14px;border-radius:50%;flex-shrink:0;}
  .cmeta{display:flex;flex-direction:column;line-height:1.15;text-align:left;}
  .cnm{font-weight:800;font-size:13px;}
  .cds{font-size:11px;color:#9a92ab;font-weight:600;}
  .chip a{background:var(--c);color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:7px 13px;border-radius:30px;text-decoration:none;white-space:nowrap;}
  .akbtn{background:#F4B400;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:7px 13px;border-radius:30px;border:none;cursor:pointer;white-space:nowrap;}
  .chip .soon{background:#f0edf5;color:#a99fbb;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:7px 13px;border-radius:30px;white-space:nowrap;}
  .cd{background:#fff;color:#C8369A;border:1.5px solid #C8369A;font-size:11px;font-weight:800;padding:6px 12px;border-radius:30px;white-space:nowrap;}
  @keyframes pop{from{opacity:0;transform:scale(.6);}to{opacity:1;transform:scale(1);}}
  footer{text-align:center;padding:30px 22px 56px;color:var(--muted);font-size:13px;}
  footer .wink{font-family:"Caveat",cursive;font-weight:700;font-size:22px;color:#E5006E;display:block;margin-top:6px;}
  .skip{position:fixed;top:16px;right:16px;z-index:300;font-family:"Caveat",cursive;font-weight:700;font-size:20px;
    background:#fff;color:#3a2f50;border:none;border-radius:30px;padding:7px 18px;cursor:pointer;box-shadow:0 6px 18px -6px rgba(70,40,110,.4);}
  .skip:hover{transform:translateY(-1px);}
  .listview{position:fixed;inset:0;z-index:400;background:rgba(245,239,249,.97);display:none;overflow-y:auto;padding:42px 22px 60px;}
  .listview.open{display:block;}
  .lvinner{max-width:560px;margin:0 auto;}
  .lvback{font-family:"Caveat",cursive;font-weight:700;font-size:22px;color:#8B3DFF;background:none;border:none;cursor:pointer;margin-bottom:16px;}
  .lvtitle{font-family:"Caveat",cursive;font-weight:700;font-size:42px;line-height:1;background:linear-gradient(100deg,#E5006E,#8B3DFF);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .lvsub{color:#8a82a0;font-size:14px;margin:4px 0 22px;}
  .lvrow{display:flex;align-items:center;gap:12px;background:#fff;border-radius:30px;padding:8px 8px 8px 16px;margin-bottom:10px;box-shadow:0 5px 16px -8px rgba(70,40,110,.35);}
  .lvrow .dot{width:15px;height:15px;border-radius:50%;flex-shrink:0;}
  .lvmeta{flex:1;display:flex;flex-direction:column;line-height:1.16;min-width:0;}
  .lvnm{font-weight:800;font-size:14px;}
  .lvds{font-size:12px;color:#9a92ab;font-weight:600;}
  .lvcta{background:#8B3DFF;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:8px 15px;border-radius:30px;text-decoration:none;white-space:nowrap;}
  .lvsoon{background:#f0edf5;color:#a99fbb;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:8px 15px;border-radius:30px;white-space:nowrap;}
  .lvcd{background:#fff;color:#C8369A;border:1.5px solid #C8369A;font-size:11px;font-weight:800;padding:7px 13px;border-radius:30px;white-space:nowrap;}
  `;
  document.head.appendChild(style);

  // --- markup ---
  document.body.insertAdjacentHTML("afterbegin", `
<button class="skip" id="skip">skip the game &rarr;</button>
<div class="listview" id="listview"><div class="lvinner">
  <button class="lvback" id="lvback">&larr; back to the marbles</button>
  <div class="lvtitle">Everything, in a list.</div>
  <div class="lvsub">For when you just want where you're going.</div>
  <div id="lvrows"></div>
</div></div>
<div class="wrap">
  <header>
    <div class="eyebrow">once upon a time&hellip;</div>
    <div class="logo">Kari <em>Kounkel</em></div>
    <div class="story">I thought I'd lost my marbles. Turns out they were never lost &mdash; just scattered.</div>
    <div class="sub">help me gather my marbles &darr;</div>
  </header>
  <div class="stage" id="stage">
    <div class="jarzone" id="jarzone">
      <img class="glass" id="glass" src="${JAR}" alt="The Marble Bag jar" />
      <div class="droplabel" id="droplabel"></div>
    </div>
  </div>
  <div class="controls"><button class="btn" id="scatter">&#8635; Spill them again</button></div>
  <div class="tray" id="tray"></div>
  <footer>
    &copy; 2026 &middot; Kari Kounkel &middot; K Co LLC
    <span class="wink">more chickens, marbles, and sanctified shenanigans ahead.</span>
  </footer>
</div>
  `);

  // --- data + behavior ---
  var items = window.MARBLES || [];
  var SIZE=90, INJAR=46, dropped=0;
  var stage=document.getElementById("stage"), glass=document.getElementById("glass"),
      jarzone=document.getElementById("jarzone"), tray=document.getElementById("tray"), droplabel=document.getElementById("droplabel");
  var opened={};
  function rnd(a,b){return a+Math.random()*(b-a);}
  function scatterPos(){
    var w=stage.clientWidth, h=stage.clientHeight, sr=stage.getBoundingClientRect(), jr=jarzone.getBoundingClientRect();
    var jx=jr.left-sr.left, jy=jr.top-sr.top, jw=jr.width||400, jh=jr.height||jw, pad=12;
    stage.querySelectorAll(".marble").forEach(function(m){
      m.style.display="flex"; m.style.opacity="1"; m.style.zIndex="7"; m.style.width=SIZE+"px"; m.style.height=SIZE+"px"; m.style.fontSize="12.5px"; m.style.transition="box-shadow .25s, transform .2s";
      var x,y,t=0;
      do{ x=rnd(6,Math.max(10,w-SIZE-6)); y=rnd(6,Math.max(10,h-SIZE-6)); t++; }
      while(t<50 && x+SIZE>jx-pad && x<jx+jw+pad && y+SIZE>jy-pad && y<jy+jh+pad);
      m.style.left=x+"px"; m.style.top=y+"px";
    });
  }
  function makeMarble(it,i){
    var m=document.createElement("button"); m.className="marble";
    m.style.width=SIZE+"px"; m.style.height=SIZE+"px";
    m.style.background="radial-gradient(circle at 35% 30%, "+it.color+"66, "+it.color+"DD 60%, "+it.color+" 100%)";
    m.style.boxShadow="0 0 22px "+it.color+"AA, 0 0 9px "+it.color+", inset 0 -6px 12px rgba(0,0,0,.28)";
    m.style.animationDelay=(-i*0.45)+"s";
    m.innerHTML="<span class='shine'></span><span class='t'>"+it.label+"</span>";
    m._it=it; attachDrag(m); stage.appendChild(m);
  }
  function attachDrag(m){
    var ox=0,oy=0;
    m.addEventListener("pointerdown",function(e){
      if(e.button!==undefined && e.button!==0)return;
      m.setPointerCapture(e.pointerId); m.classList.add("drag");
      var r=m.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
      function move(ev){
        var s=stage.getBoundingClientRect();
        m.style.left=(ev.clientX-s.left-ox)+"px"; m.style.top=(ev.clientY-s.top-oy)+"px";
        jarzone.classList.toggle("hot", overJar(ev.clientX,ev.clientY));
      }
      function up(ev){
        m.releasePointerCapture(e.pointerId);
        m.removeEventListener("pointermove",move); m.removeEventListener("pointerup",up);
        m.classList.remove("drag"); jarzone.classList.remove("hot");
        if(overJar(ev.clientX,ev.clientY)) dropIn(m);
      }
      m.addEventListener("pointermove",move); m.addEventListener("pointerup",up);
    });
  }
  function overJar(cx,cy){ var r=glass.getBoundingClientRect(); return cx>r.left && cx<r.right && cy>r.top && cy<r.bottom; }
  function dropIn(m){
    var it=m._it, jr=glass.getBoundingClientRect(), sr=stage.getBoundingClientRect();
    var cx=(jr.left-sr.left)+jr.width*0.5, bottomY=(jr.top-sr.top)+jr.height*0.80;
    var msize=36, r=msize/2, sx=30, sy=24, rowCounts=[5,4,4,3,2,2,2,2];
    var n=dropped++, row=0, idx=n;
    while(idx>=rowCounts[row]){ idx-=rowCounts[row]; row++; }
    var cnt=rowCounts[row], startX=cx-((cnt-1)*sx)/2;
    var x=startX + idx*sx + rnd(-7,7) - r;
    var y=bottomY - row*sy + rnd(-6,6) - r;
    m.style.transition="left .5s cubic-bezier(.3,1.25,.5,1), top .5s cubic-bezier(.3,1.25,.5,1), width .4s ease, height .4s ease";
    m.style.zIndex="8"; m.style.left=x+"px"; m.style.top=y+"px"; m.style.width=msize+"px"; m.style.height=msize+"px"; m.style.fontSize="8px"; m.style.animation="none";
    droplabel.style.opacity="0";
    if(!opened[it.name]){ opened[it.name]=true; addChip(it); }
  }
  function addChip(it){
    var c=document.createElement("div"); c.className="chip"; c.style.setProperty("--c",it.color);
    var meta="<span class='cmeta'><span class='cnm'>"+it.name+"</span><span class='cds'>"+it.desc+"</span></span>";
    var act;
    if(it.countdown) act="<span class='cd' data-cd='"+it.countdown+"'>&hellip;</span>";
    else if(it.contact) act="<button class='akbtn' onclick='openAskKari()'>Say hi &rarr;</button>";
    else if(it.live) act="<a href='"+it.link+"' target='_blank' rel='noopener'>Enter &rarr;</a>";
    else act="<span class='soon'>Coming soon</span>";
    c.innerHTML="<span class='dot' style='background:"+it.color+"'></span>"+meta+act;
    tray.appendChild(c); startCountdowns();
  }
  function startCountdowns(){
    document.querySelectorAll(".cd,.lvcd").forEach(function(el){
      if(el._t) return;
      var target=new Date(el.getAttribute("data-cd")+"T00:00:00").getTime();
      function tick(){
        var d=target-new Date().getTime();
        if(d<=0){ el.textContent="\u{1F389} It's here!"; clearInterval(el._t); return; }
        var days=Math.floor(d/86400000), h=Math.floor(d%86400000/3600000), m=Math.floor(d%3600000/60000), s=Math.floor(d%60000/1000);
        el.textContent="⏳ "+days+"d "+h+"h "+m+"m "+s+"s";
      }
      tick(); el._t=setInterval(tick,1000);
    });
  }
  items.forEach(makeMarble);
  scatterPos();
  glass.addEventListener("load",scatterPos);
  document.getElementById("scatter").addEventListener("click",function(){ opened={}; dropped=0; tray.innerHTML=""; droplabel.style.opacity="1"; scatterPos(); });
  window.addEventListener("resize",function(){ if(!Object.keys(opened).length) scatterPos(); });

  var lv=document.getElementById("listview"), lvrows=document.getElementById("lvrows");
  items.forEach(function(it){
    var row=document.createElement("div"); row.className="lvrow";
    var cta;
    if(it.countdown) cta="<span class='lvcd' data-cd='"+it.countdown+"'>&hellip;</span>";
    else if(it.contact) cta="<button class='akbtn' onclick='openAskKari()'>Say hi &rarr;</button>";
    else if(it.live) cta="<a class='lvcta' style='background:"+it.color+"' href='"+it.link+"' target='_blank' rel='noopener'>Enter &rarr;</a>";
    else cta="<span class='lvsoon'>Coming soon</span>";
    row.innerHTML="<span class='dot' style='background:"+it.color+"'></span><span class='lvmeta'><span class='lvnm'>"+it.name+"</span><span class='lvds'>"+it.desc+"</span></span>"+cta;
    lvrows.appendChild(row);
  });
  window.openAskKari=function(){ var b=document.getElementById("ak-bub"); if(b){ b.click(); } else { window.location.href="mailto:kari@karikounkel.com"; } };
  startCountdowns();
  document.getElementById("skip").addEventListener("click",function(){ lv.classList.add("open"); });
  document.getElementById("lvback").addEventListener("click",function(){ lv.classList.remove("open"); });

  // --- Ask Kari widget ---
  var w=document.createElement("script"); w.src="https://chat.karikounkel.com/widget.js"; w.defer=true; document.body.appendChild(w);
})();
