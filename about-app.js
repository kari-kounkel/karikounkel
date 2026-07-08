/* karikounkel.com/about — the story spiral. Served from GitHub Pages;
   the DreamHost /about shell just loads this file. Edit + push = live everywhere. */
(function(){
  var PAGES = "https://kari-kounkel.github.io/karikounkel/";

  // --- Google Analytics (GA4) ---
  var ga = document.createElement("script");
  ga.async = true;
  ga.src = "https://www.googletagmanager.com/gtag/js?id=G-WHKMKCD1SD";
  document.head.appendChild(ga);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", "G-WHKMKCD1SD");

  // --- fonts ---
  var f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap";
  document.head.appendChild(f);

  // --- styles ---
  var style = document.createElement("style");
  style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{--ink:#3a2f50;--muted:#8a82a0;--pink:#E5006E;--purple:#8B3DFF;}
  body{font-family:"Nunito Sans",system-ui,sans-serif;color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;
    background:radial-gradient(ellipse at 50% 0%, #fff 0%, #f5eff9 55%, #ece3f3 100%);min-height:100vh;overflow-x:hidden;}
  .wrap{max-width:900px;margin:0 auto;padding:0 22px;}
  header{text-align:center;padding:52px 22px 4px;}
  .eyebrow{font-family:"Caveat",cursive;font-weight:700;font-size:30px;color:var(--pink);transform:rotate(-2deg);}
  .logo{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:clamp(40px,8vw,78px);line-height:1;letter-spacing:-.01em;
    background:linear-gradient(100deg,#E5006E,#8B3DFF);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .logo em{font-style:italic;font-weight:400;}
  .sub{font-family:"Caveat",cursive;font-weight:700;font-size:24px;color:var(--purple);margin-top:8px;}
  .pq{max-width:640px;margin:26px auto 6px;text-align:center;padding:22px 24px;background:rgba(255,255,255,.6);
    border-radius:24px;box-shadow:0 12px 34px -18px rgba(70,40,110,.4);}
  .pq-big{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:700;font-size:clamp(22px,3.4vw,30px);line-height:1.25;
    background:linear-gradient(100deg,#E5006E,#8B3DFF);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .pq-small{font-size:15px;color:#4a3d63;margin-top:12px;line-height:1.55;max-width:520px;margin-left:auto;margin-right:auto;}
  .tl{position:relative;width:100%;max-width:660px;margin:22px auto 8px;aspect-ratio:1/1;}
  .tl-path{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:visible;}
  .mnode{position:absolute;transform:translate(-50%,-50%);z-index:2;}
  .mnode .bubble{width:100%;height:100%;}
  .myr{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:5px;font-family:"Caveat",cursive;
    font-weight:700;font-size:15px;color:var(--pink);white-space:nowrap;line-height:1;pointer-events:none;text-shadow:0 1px 4px #fff,0 0 3px #fff;}
  .bubble{flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;
    font-family:Georgia,"Times New Roman",serif;font-weight:400;text-align:center;line-height:1.1;cursor:pointer;border:none;padding:0;position:relative;
    text-shadow:0 1px 3px rgba(0,0,0,.35);animation:bob 6s ease-in-out infinite;transition:transform .2s, box-shadow .25s;
    -webkit-user-select:none;user-select:none;}
  .bubble:hover{transform:scale(1.1);}
  .bubble:active{transform:scale(.97);}
  .bubble .shine{position:absolute;top:18%;left:22%;width:30%;height:24%;border-radius:50%;background:rgba(255,255,255,.8);filter:blur(2px);pointer-events:none;}
  .bubble .blab{padding:0 6px;pointer-events:none;}
  @keyframes bob{0%,100%{margin-top:0;}50%{margin-top:-7px;}}
  .ev-modal{position:fixed;inset:0;z-index:500;background:rgba(58,47,80,.5);backdrop-filter:blur(6px);
    display:none;align-items:center;justify-content:center;padding:22px;}
  .ev-modal.open{display:flex;}
  .ev-card{background:#fff;border-radius:28px;max-width:540px;width:100%;max-height:88vh;overflow-y:auto;padding:38px 34px 34px;text-align:center;position:relative;
    box-shadow:0 30px 80px -20px rgba(58,47,80,.5);animation:pop .3s cubic-bezier(.34,1.4,.5,1);}
  @keyframes pop{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:scale(1);}}
  .ev-x{position:absolute;top:14px;right:18px;background:none;border:none;font-size:26px;color:var(--muted);cursor:pointer;line-height:1;}
  .ev-big{width:116px;height:116px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;
    color:#fff;font-family:Georgia,serif;position:relative;text-shadow:0 1px 3px rgba(0,0,0,.35);}
  .ev-big .shine{position:absolute;top:18%;left:22%;width:30%;height:24%;border-radius:50%;background:rgba(255,255,255,.8);filter:blur(2px);}
  .ev-yr{font-family:"Caveat",cursive;font-weight:700;font-size:26px;color:var(--pink);line-height:1;}
  .ev-ti{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:25px;color:var(--ink);margin:2px 0 16px;line-height:1.25;}
  .ev-detail{font-size:16.5px;color:#4a3d63;line-height:1.7;white-space:pre-line;text-align:left;}
  .close-statement{max-width:600px;margin:24px auto 0;text-align:center;padding:34px 24px;cursor:pointer;
    background:linear-gradient(120deg,#E5006E,#8B3DFF);border-radius:26px;color:#fff;box-shadow:0 18px 44px -18px rgba(139,61,255,.6);
    transition:transform .2s, box-shadow .2s;}
  .close-statement:hover{transform:translateY(-2px);box-shadow:0 24px 54px -18px rgba(139,61,255,.7);}
  .close-statement .cs-lines{font-family:Georgia,"Times New Roman",serif;font-size:19px;line-height:1.7;opacity:.92;}
  .close-statement .cs-punch{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-style:italic;font-size:clamp(21px,3vw,27px);margin-top:14px;line-height:1.35;}
  .cs-super{font-family:"Caveat",cursive;font-weight:700;font-size:23px;margin-top:10px;color:#fff;opacity:.96;}
  .cs-hint{font-family:"Caveat",cursive;font-weight:700;font-size:20px;margin-top:16px;color:#fff;opacity:.9;}
  .keeper-reveal{max-width:380px;margin:6px auto 4px;text-align:center;max-height:0;overflow:hidden;pointer-events:none;
    transition:max-height .8s ease, margin .6s ease;}
  .keeper-reveal.show{max-height:760px;margin:26px auto 4px;pointer-events:auto;}
  .keeper-img{width:100%;max-width:340px;height:auto;display:block;margin:0 auto;mix-blend-mode:multiply;}
  .keeper-cap{margin-top:2px;}
  .kc-name{display:block;font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:25px;
    background:linear-gradient(100deg,#E5006E,#8B3DFF);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .kc-sub{display:block;font-family:"Caveat",cursive;font-weight:700;font-size:19px;color:var(--muted);margin-top:2px;}
  footer{text-align:center;padding:26px 22px 60px;color:var(--muted);font-size:13px;}
  footer .wink{font-family:"Caveat",cursive;font-weight:700;font-size:22px;color:var(--pink);display:block;margin-top:8px;}
  footer a{color:var(--purple);text-decoration:none;font-weight:700;}
  .logo,.sub,.pq-big,.pq-small,.ev-ti,.cs-punch,.cs-super,.cs-hint,.cs-lines,.kc-name,.kc-sub{text-wrap:balance;}
  .ev-detail{text-wrap:pretty;}
  @media(max-width:520px){ .myr{font-size:12px;} }
  @media(max-width:400px){ .myr{display:none;} }
  `;
  document.head.appendChild(style);

  // --- markup ---
  document.body.insertAdjacentHTML("beforeend", `
<div class="wrap">
  <header>
    <div class="eyebrow">the story behind the systems&hellip;</div>
    <div class="logo">About <em>Kari</em></div>
    <div class="sub">I've lived five different lives &mdash; and every one made me more useful.</div>
  </header>
  <div class="pq">
    <div class="pq-big">&ldquo;Some people think my life went south.<br>I think it went <em>everywhere</em>.&rdquo;</div>
    <div class="pq-small">And that&rsquo;s exactly why I can help almost any business owner who walks through my door. Follow the spiral &mdash; click a marble to hear that chapter.</div>
  </div>
  <div class="tl" id="tl">
    <svg class="tl-path" id="tlpath" preserveAspectRatio="none"></svg>
  </div>
  <div class="close-statement" id="closeStmt">
    <div class="cs-lines">I don&rsquo;t sell bookkeeping.<br>I don&rsquo;t sell AI.<br>I don&rsquo;t sell payroll.</div>
    <div class="cs-punch">I help businesses see what they&rsquo;ve been missing.</div>
    <div class="cs-super">It&rsquo;s almost like it&rsquo;s my super power.</div>
    <div class="cs-hint" id="csHint">&#128273; click to meet The Keeper &mdash; aka Kari Kounkel</div>
  </div>
  <div class="keeper-reveal" id="keeperReveal" aria-hidden="true">
    <img class="keeper-img" src="${PAGES}keeper.png" alt="Kari as The Keeper, holding a jar of gathered marbles and a ring of keys" onerror="this.style.display='none'">
    <div class="keeper-cap">
      <span class="kc-name">The Keeper</span>
      <span class="kc-sub">every marble, gathered &middot; every chapter, a key</span>
    </div>
  </div>
  <footer>
    &copy; 2026 &middot; Kari Kounkel &middot; K Co LLC
    <span class="wink">every chapter had a gift.</span>
    <div style="margin-top:10px;"><a href="https://karikounkel.com">&larr; back to the marbles</a></div>
  </footer>
</div>
<div class="ev-modal" id="evmodal">
  <div class="ev-card">
    <button class="ev-x" id="evx" aria-label="close">&times;</button>
    <div class="ev-big" id="evbig"><span class="shine"></span><span id="evbiglab"></span></div>
    <div class="ev-yr" id="evyr"></div>
    <div class="ev-ti" id="evti"></div>
    <div class="ev-detail" id="evdetail"></div>
  </div>
</div>
  `);

  // --- the chat widget ---
  var wjs = document.createElement("script");
  wjs.src = "https://chat.karikounkel.com/widget.js";
  wjs.defer = true;
  document.body.appendChild(wjs);

  // ============================================================
  //  Kari's story — chapters, not ups-and-downs. Every one a gift.
  //  Edit year / bubble / title / detail / color freely.
  //  Use \n inside detail for a line break (the poetic cadence).
  // ============================================================
  var EVENTS = [
    { year:"Born, 1969", bubble:"born", title:"Getting There With Care", color:"#E5006E",
      detail:"I was born into a family business where transportation wasn't just a job — it was dinner-table conversation. I thought we bled yellow.\n\nI learned early that every problem has a solution, if you're willing to keep looking." },
    { year:"Age 21", bubble:"21", title:"“I don't know… but I'll find out.”", color:"#8B3DFF",
      detail:"I'd worked part-time at Hoglund's since I was 12, and became full-time at 21 — with my baby on my hip and no desire to go to law school. Dad let me bring my baby to work.\n\nI answered phones knowing almost nothing about school transportation. So my favorite phrase became, “I don't know… but I'll find out.”\n\nThat curiosity turned into everything." },
    { year:"More than the buses", bubble:"service", title:"The Community Years", color:"#00B4D8",
      detail:"I was never just the bus company.\n\nI played piano and served at church. I was a Rotarian and a member of the Chamber of Commerce. I was the key person in my community for foreign exchange students.\n\nShowing up for people was always the throughline." },
    { year:"The expert", bubble:"expert", title:"“I'll find out” became knowing", color:"#F4B400",
      detail:"What started as curiosity became expertise — teaching districts, solving compliance problems, becoming the person people called when they were stuck.\n\nIn 1996, after sitting on the panel that wrote the new laws, I wrote my first manual: How to Hire and Train a School Bus Driver." },
    { year:"National recognition", bubble:"awards", title:"Excellence Is a Choice", color:"#FF8C42",
      detail:"My newsletter — 100% mine — won national awards four years in a row.\n\nThe entire newsletter grew from one philosophy:\n\nCompliance is an obligation. Excellence is a choice." },
    { year:"April 10, 1997", bubble:"1997", title:"Everything Changed", color:"#2F4B7C",
      detail:"A dump truck blew a stop sign and hit our bus, killing three nine-year-old children.\n\nIt was national news. The NTSB arrived on our doorstep.\n\nParadigm-shifting, in the deepest sense of the word. Nothing was ever the same.\n\nWhen I tell this story, rooms full of busy professionals go still — no one moves until it's over." },
    { year:"35 years", bubble:"fixer", title:"The Fixer", color:"#7B2FF7",
      detail:"For decades, Dad sent me across Minnesota — negotiating contracts, teaching transportation management, improving operations, and finding profit where others couldn't.\n\nCadillac service at Pinto pricing. That was the standard." },
    { year:"1999–2011", bubble:"battle", title:"The Long Battle", color:"#C8369A",
      detail:"For twelve years we fought an intense fight for our bus contract — against First Student and a consultant who desperately wanted them to have it.\n\nTwelve years of proving — again and again, to the community, the district, and ourselves — that we deserved the job." },
    { year:"The math story", bubble:"math", title:"“There's only one right number.”", color:"#EF476F",
      detail:"That same consultant publicly dismissed my bid calculations and slid them back across the table.\n\nI slid them right back.\n\n“With all due respect, Mr. Watson… the beauty of math is there's only one right number.”\n\nWe won the contract.\n\nIt wasn't relationships or personalities that won it, either — it was clear systems, clean spreadsheets, and understanding our business.\n\nThey never hired him again." },
    { year:"The hard lesson", bubble:"lesson", title:"You can't save a business that doesn't want saving", color:"#5A6ACF",
      detail:"I could see better systems. Better purchasing. Better margins. Better long-term decisions.\n\nBut sometimes being right isn't enough — if leadership won't listen.\n\nEventually, I had to leave." },
    { year:"Rock bottom", bubble:"reset", title:"Starting Over", color:"#6A3D7A",
      detail:"I left everything: marriage, career, community, church.\n\nWhat started as my respite became addiction.\n\nEverything I'd built disappeared." },
    { year:"Recovery", bubble:"rise", title:"Learning to Live Again", color:"#06D6A0",
      detail:"After seven years of trying, it took four more years to rebuild from nothing — and I mean nothing.\n\nMy first job out of Teen Challenge was collecting urine specimens for controlled-substance testing.\n\nRecovery didn't just give me my life back. It taught me how to rebuild, one piece at a time — and I rebuilt my business along the way." },
    { year:"Today", bubble:"now", title:"The Keeper", color:"#FF4D8D",
      detail:"Now I delight in helping others find the thing they can't see.\n\nSometimes it's their books. Sometimes it's AI. Sometimes it's the way forward they've been missing.\n\nProblem-solving. System-building. Seeing what everyone else missed. And, every time, a way through.\n\nI love solving puzzles." },
    { year:"What's next?", bubble:"next?", title:"The best chapters aren't written yet", color:"#FFB703",
      detail:"Books. AI. Systems. Founders who feel stuck.\n\nEvery chapter taught me something the next chapter needed — and I wouldn't erase a single one.\n\nSome people think my life went south. I think it went everywhere.\n\nMore chickens, marbles, and sanctified shenanigans ahead." }
  ];

  var tl = document.getElementById("tl");
  var svg = document.getElementById("tlpath");
  var N = EVENTS.length, nodes = [];
  EVENTS.forEach(function(e, i){
    var node = document.createElement("div"); node.className = "mnode";
    var bub = document.createElement("button"); bub.className = "bubble";
    bub.style.background = "radial-gradient(circle at 35% 30%, " + e.color + "66, " + e.color + "DD 60%, " + e.color + " 100%)";
    bub.style.boxShadow = "0 0 22px " + e.color + "AA, 0 0 9px " + e.color + ", inset 0 -6px 12px rgba(0,0,0,.28)";
    bub.style.animationDelay = (-i * 0.5) + "s";
    bub.innerHTML = "<span class='shine'></span><span class='blab'>" + e.bubble + "</span>";
    bub.onclick = function(){ openEv(i); };
    node.appendChild(bub);
    tl.appendChild(node);
    nodes.push({ node:node, bub:bub, e:e });
  });

  // lay the marbles along a spiral — small near the center (1969), growing outward to what's next
  function layout(){
    var S = tl.clientWidth; if(!S) return;
    var cx = S/2, cy = S/2;
    var TURNS = 1.9, dth = TURNS * 2*Math.PI / (N-1), th0 = -Math.PI/2;
    var r0 = S*0.12, rmax = S*0.40, dr = (rmax - r0) / (N-1);
    var baseSize = S<420 ? 30 : (S<560 ? 40 : 46);
    var grow = S<420 ? 1.5 : (S<560 ? 2.2 : 2.9);
    var pts = [];
    nodes.forEach(function(o, i){
      var x, y, size = baseSize + i*grow;
      if(i === N-1){
        // "what's next?" launches up to the top-left — heading a new direction
        x = S*0.085; y = S*0.16; size = baseSize + (N-5)*grow;
      } else {
        var th = th0 + i*dth, r = r0 + i*dr;
        x = cx + r*Math.cos(th); y = cy + r*Math.sin(th);
      }
      o.node.style.left = x + "px"; o.node.style.top = y + "px";
      o.node.style.width = size + "px"; o.node.style.height = size + "px";
      o.bub.style.fontSize = (o.e.bubble.length > 3 ? size*0.22 : size*0.42) + "px";
      pts.push({ x:x, y:y });
    });
    var d = "M" + pts[0].x + "," + pts[0].y;
    for(var i=1;i<N-1;i++){
      var xc = (pts[i-1].x + pts[i].x)/2, yc = (pts[i-1].y + pts[i].y)/2;
      d += " Q" + pts[i-1].x + "," + pts[i-1].y + " " + xc + "," + yc;
    }
    d += " L" + pts[N-2].x + "," + pts[N-2].y;   // land into 'Today'
    d += " L" + pts[N-1].x + "," + pts[N-1].y;   // straight kick out to 'what's next?'
    svg.setAttribute("viewBox", "0 0 " + S + " " + S);
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="#c9b8e8" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 11" opacity="0.92"/>';
  }
  setTimeout(layout, 60);
  window.addEventListener("resize", layout);
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(layout); }

  // modal
  var modal = document.getElementById("evmodal");
  function openEv(i){
    var e = EVENTS[i];
    var big = document.getElementById("evbig");
    big.style.background = "radial-gradient(circle at 35% 30%, " + e.color + "66, " + e.color + "DD 60%, " + e.color + " 100%)";
    big.style.boxShadow = "0 0 30px " + e.color + "AA, inset 0 -8px 16px rgba(0,0,0,.28)";
    var lab = document.getElementById("evbiglab");
    lab.textContent = e.bubble;
    lab.style.fontSize = (e.bubble.length > 3 ? 16 : 34) + "px";
    document.getElementById("evyr").textContent = e.year;
    document.getElementById("evti").textContent = e.title;
    document.getElementById("evdetail").textContent = e.detail;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  window.openEv = openEv;
  function closeEv(){ modal.classList.remove("open"); document.body.style.overflow = ""; }
  document.getElementById("evx").onclick = closeEv;
  modal.addEventListener("click", function(ev){ if(ev.target === modal) closeEv(); });
  document.addEventListener("keydown", function(ev){ if(ev.key === "Escape") closeEv(); });

  // finale: click the pink-purple closing box → The Keeper floats in
  var closeStmt = document.getElementById("closeStmt"), keeperReveal = document.getElementById("keeperReveal");
  if(closeStmt){
    closeStmt.addEventListener("click", function(){
      keeperReveal.classList.add("show");
      var h = document.getElementById("csHint"); if(h) h.textContent = "there she is. 🔑";
      setTimeout(function(){ keeperReveal.scrollIntoView({ behavior:"smooth", block:"center" }); }, 260);
    });
  }
})();
