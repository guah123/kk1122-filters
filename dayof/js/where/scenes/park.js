(function(){
DAYOF.Where = DAYOF.Where || { _scenes:{} };
DAYOF.Where._scenes = DAYOF.Where._scenes || {};
DAYOF.Where._scenes['park'] = { W:2000, H:2600, bgColor:'#EFE6D4', build(S){
  var W=S.W, H=S.H, L=S.layer, P=S.pal, cx=1000, cy=1350;
  var STONE=['#E4D8BF','#DCCFB3','#E9DFC8','#D8CBB0'];
  // ---- ground ----
  S.rect(0,0,W,H,{fill:'#EFE6D4'},L.bg);
  S.wash(-100,-100,W+200,700,'#B9C79A',.55,L.bg);
  S.wash(-100,H-500,W+200,600,'#B9C79A',.5,L.bg);
  S.wash(-100,500,380,1700,'#C3CFA2',.45,L.bg);
  S.wash(W-280,500,380,1700,'#C3CFA2',.45,L.bg);
  // plaza ellipse
  S.el('ellipse',{cx:cx,cy:cy,rx:880,ry:1020,fill:'#E6DBC2',filter:'url(#wc)'},L.bg);
  S.el('ellipse',{cx:cx,cy:cy,rx:880,ry:1020,fill:'none',stroke:'#C9B999','stroke-width':6,opacity:.7},L.bg);
  // paving rings + spokes
  [300,560,820].forEach(function(r){S.el('ellipse',{cx:cx,cy:cy,rx:r,ry:r*1.16,fill:'none',stroke:'#CDBD9E','stroke-width':3,'stroke-dasharray':'2 0',opacity:.8},L.bg);});
  for(var a=0;a<24;a++){var t=a/24*Math.PI*2;
    S.path('M'+(cx+Math.cos(t)*300)+' '+(cy+Math.sin(t)*348)+'L'+(cx+Math.cos(t)*860)+' '+(cy+Math.sin(t)*998),{stroke:'#D1C2A4','stroke-width':2.5,fill:'none',opacity:.75},L.bg);}
  for(var i=0;i<70;i++){var x=S.range(200,1800),y=S.range(400,2300);
    S.rect(x,y,S.range(30,70),S.range(18,40),{fill:S.pick(STONE),opacity:.5,transform:'rotate('+S.range(-8,8)+' '+x+' '+y+')'},L.bg);}
  // fountain
  var fx=cx,fy=620;
  S.el('ellipse',{cx:fx,cy:fy+10,rx:190,ry:120,fill:'#C9BFA8',filter:'url(#wc)'},L.bg);
  S.el('ellipse',{cx:fx,cy:fy,rx:170,ry:104,fill:'#A9CBD0',stroke:'#8FA9A8','stroke-width':8,filter:'url(#wc)'},L.bg);
  S.el('ellipse',{cx:fx,cy:fy-10,rx:100,ry:60,fill:'#C5DEDF',opacity:.8},L.bg);
  S.rect(fx-14,fy-90,28,90,{fill:'#BDB39C'},L.mid);
  S.el('ellipse',{cx:fx,cy:fy-92,rx:60,ry:20,fill:'#CFC6AF',stroke:'#A99F88','stroke-width':3},L.mid);
  [-40,0,40].forEach(function(d){S.path('M'+fx+' '+(fy-110)+'Q'+(fx+d*1.5)+' '+(fy-190)+' '+(fx+d*2.2)+' '+(fy-100),{stroke:'#9CC6D0','stroke-width':5,fill:'none',opacity:.8,'stroke-linecap':'round'},L.mid);});
  // lamp + bench + tree helpers
  function lamp(x,y){S.rect(x-5,y-170,10,170,{fill:'#6E6556'},L.mid);S.circle(x,y-185,20,{fill:'#F5E2A0',stroke:'#6E6556','stroke-width':4},L.mid);S.wash(x-60,y-250,120,120,'#F8E8B0',.35,L.mid);}
  function bench(x,y,w,par){par=par||L.mid;S.rect(x,y-46,w,14,{fill:'#9C7A56'},par);S.rect(x,y-24,w,12,{fill:'#B08A62'},par);S.rect(x+8,y-12,8,24,{fill:'#6E5A44'},par);S.rect(x+w-16,y-12,8,24,{fill:'#6E5A44'},par);}
  function tree(x,y,r,par){par=par||L.mid;S.rect(x-r*.1,y-r*.9,r*.2,r*.9,{fill:'#7A6650'},par);
    var gs=['#8FAE7A','#A3BE86','#7C9E6D','#B3C98E'];
    S.circle(x,y-r*1.5,r,{fill:S.pick(gs),filter:'url(#wc)'},par);
    S.circle(x-r*.6,y-r*1.15,r*.7,{fill:S.pick(gs),filter:'url(#wc)',opacity:.9},par);
    S.circle(x+r*.6,y-r*1.2,r*.72,{fill:S.pick(gs),filter:'url(#wc)',opacity:.9},par);
    S.circle(x+r*.2,y-r*1.7,r*.5,{fill:'#C9DAA0',opacity:.55},par);}
  function note(x,y){S.el('ellipse',{cx:x,cy:y,rx:9,ry:6.5,fill:'#B0825A',transform:'rotate(-20 '+x+' '+y+')'},L.top);S.path('M'+(x+8)+' '+y+'v-36q14 4 14 16',{stroke:'#B0825A','stroke-width':3,fill:'none'},L.top);}
  // back trees
  [[160,420,130],[560,330,120],[1440,340,125],[1850,430,135],[90,1020,120],[1930,1000,125],[100,1700,130],[1920,1750,125],[170,2380,135],[1830,2400,130]].forEach(function(t){tree(t[0],t[1],t[2]);});
  [[300,760],[1700,760],[260,1300],[1740,1300],[300,1900],[1700,1950],[1000,2330]].forEach(function(l){lamp(l[0],l[1]);});
  bench(420,860,150);bench(1430,860,150);bench(200,1560,140);bench(1660,1560,140);bench(380,2200,150);bench(1470,2200,150);

  // ---- crowd (back) ----
  var KAI={x:470,y:1230};
  var av=[{x:KAI.x,y:KAI.y,r:70}];
  S.crowd({x:300,y:820,w:1400,h:300,n:14,sMin:.55,sMax:.75,avoid:av,sortByY:true});
  S.crowd({x:260,y:1100,w:560,h:400,n:12,sMin:.7,sMax:.85,avoid:av,sortByY:true});
  S.crowd({x:1000,y:1180,w:760,h:420,n:14,sMin:.8,sMax:.95,avoid:[{x:1300,y:1500,r:150}],sortByY:true});
  // busker + ball
  var bx=1300,by=1500,R=95;
  S.el('ellipse',{cx:bx,cy:by+4,rx:R*.9,ry:22,fill:'#8A7A60',opacity:.35},L.mid);
  S.rect(bx-250,by+40,70,46,{fill:'#B6806A',stroke:'#7A5A48','stroke-width':3,rx:8},L.mid); // hat
  S.circle(bx-232,by+50,6,{fill:'#E8C45A'},L.mid);S.circle(bx-210,by+56,6,{fill:'#E8C45A'},L.mid);
  var ballG=S.el('g',{},L.mid);
  S.circle(bx,by-R,R,{fill:'#D9705A',filter:'url(#wc)'},ballG);
  S.path('M'+(bx-R)+' '+(by-R)+'Q'+bx+' '+(by-R-50)+' '+(bx+R)+' '+(by-R),{stroke:'#F3E3B8','stroke-width':16,fill:'none'},ballG);
  S.path('M'+(bx-70)+' '+(by-R+60)+'Q'+bx+' '+(by-R+20)+' '+(bx+70)+' '+(by-R+60),{stroke:'#5C8FA8','stroke-width':14,fill:'none'},ballG);
  S.circle(bx-30,by-R-40,14,{fill:'#fff',opacity:.35},ballG);
  var busk=S.el('g',{},L.mid);
  S.animal({kind:'bear',x:bx,y:by-2*R+10,s:1.25,pose:'wave',parent:busk});
  note(bx+20,by-2*R-150);note(bx-60,by-2*R-130);
  S.crowd({x:bx-420,y:by-40,w:240,h:320,n:7,sMin:.75,sMax:.9,sortByY:true});
  S.crowd({x:bx+170,y:by-40,w:330,h:320,n:8,sMin:.75,sMax:.9,sortByY:true});
  S.crowd({x:bx-200,y:by+110,w:420,h:200,n:6,sMin:.8,sMax:.95,sortByY:true});

  // ---- uncle + pigeons ----
  var ux=560,uy=1930;
  S.crowd({x:280,y:1740,w:520,h:220,n:6,sMin:.7,sMax:.85,sortByY:true,avoid:[{x:ux,y:uy,r:90}]});
  S.animal({kind:'elephant',x:ux,y:uy,s:1.15,pose:'hold',item:'bread',flip:false});
  S.text(ux+90,uy-130,'麵包～',{'font-size':26,fill:'#9A7A5A','text-anchor':'start',opacity:.8},L.mid);
  var pig=[],fly=[];
  function pigeon(x,y,fl,par){var g=S.el('g',{transform:'translate('+x+' '+y+') scale('+(fl?-1:1)+' 1)'},par||L.mid);
    S.el('ellipse',{cx:0,cy:-12,rx:15,ry:10,fill:'#9AA0A8'},g);
    S.circle(11,-21,7,{fill:'#7E8896'},g);S.circle(13,-22,1.6,{fill:'#2A2A2A'},g);
    S.path('M17 -21 l7 2 l-7 2z',{fill:'#E0A050'},g);
    S.path('M-14 -12 l-12 4 l12 2z',{fill:'#80868E'},g);
    S.path('M-2 -12 q6 4 10 0',{stroke:'#6E7580','stroke-width':3,fill:'none'},g);
    S.path('M-3 -3 v6 M3 -3 v6',{stroke:'#C98A7A','stroke-width':2},g);
    return g;}
  for(var k=0;k<46;k++){var a2=S.range(0,Math.PI*2),rr=S.range(70,300);
    var px=ux+110+Math.cos(a2)*rr*1.2,py=uy+30+Math.sin(a2)*rr*.45;
    var g=pigeon(px,py,S.rng()<.5);
    if(k<18)pig.push({g:g,x:px,y:py,fl:g.getAttribute('transform').indexOf('-1')>0,ph:S.rng()*6,sp:S.range(1.5,3)});}
  for(var c=0;c<8;c++)S.circle(ux+S.range(40,300),uy+S.range(10,70),3,{fill:'#E8CF9A'},L.mid);
  // flying pigeons (wing flap)
  for(var f=0;f<6;f++){var fx0=ux+S.range(-40,400),fy0=uy-S.range(150,420);
    var g=S.el('g',{transform:'translate('+fx0+' '+fy0+')'},L.top);
    S.el('ellipse',{cx:0,cy:0,rx:15,ry:9,fill:'#9AA0A8'},g);S.circle(13,-4,6,{fill:'#7E8896'},g);
    var w1=S.path('M-2 -4 Q-14 -34 -34 -26 Q-20 -12 -2 -2z',{fill:'#B2B8C0',stroke:'#7E8896','stroke-width':1.5},g);
    fly.push({g:g,w:w1,x:fx0,y:fy0,ph:S.rng()*6,r:S.range(30,70)});}

  // ---- violinist ----
  var vx=1480,vy=2090;
  S.el('ellipse',{cx:vx,cy:vy+4,rx:70,ry:16,fill:'#8A7A60',opacity:.25},L.mid);
  S.crowd({x:vx-330,y:vy-170,w:260,h:260,n:6,sMin:.75,sMax:.9,sortByY:true});
  S.crowd({x:vx+90,y:vy-170,w:300,h:260,n:6,sMin:.75,sMax:.9,sortByY:true});
  S.animal({kind:'fox',x:vx,y:vy,s:1.1,pose:'hold',item:'violin'});
  note(vx+70,vy-170);note(vx-80,vy-190);note(vx+30,vy-230);
  // lower crowd
  S.crowd({x:700,y:2080,w:560,h:260,n:9,sMin:.8,sMax:1,sortByY:true});
  S.crowd({x:250,y:2250,w:480,h:230,n:6,sMin:.85,sMax:1,sortByY:true});
  S.crowd({x:1200,y:700,w:500,h:140,n:5,sMin:.5,sMax:.65,sortByY:true});
  S.crowd({x:260,y:1380,w:420,h:260,n:6,sMin:.75,sMax:.9,avoid:av,sortByY:true});

  // ---- Kai ----
  S.kai({x:KAI.x,y:KAI.y,s:.85,pose:'stand'});
  // occluders after Kai
  var bush=S.el('g',{},L.fg);
  S.circle(KAI.x-30,KAI.y+8,48,{fill:'#8FAE7A',filter:'url(#wc)'},bush);
  S.circle(KAI.x+25,KAI.y+14,44,{fill:'#A3BE86',filter:'url(#wc)'},bush);
  S.circle(KAI.x-5,KAI.y-6,36,{fill:'#7C9E6D',filter:'url(#wc)',opacity:.95},bush);
  S.animal({kind:'rabbit',x:KAI.x+55,y:KAI.y+40,s:.8,pose:'stand',parent:L.fg});

  // fg decor
  tree(-30,2600,170,L.fg);tree(2040,2580,170,L.fg);
  S.wash(0,0,W,H,'#F6E7C8',.12,L.top);

  // ---- animation ----
  S.anim(function(t){
    var rock=Math.sin(t*1.6);
    ballG.setAttribute('transform','rotate('+(rock*14)+' '+bx+' '+(by-R)+') translate('+(rock*10)+' 0)');
    busk.setAttribute('transform','translate('+(rock*10)+' '+(Math.abs(Math.sin(t*3.2))*-4)+') rotate('+(rock*3)+' '+bx+' '+by+')');
    for(var i=0;i<pig.length;i++){var p=pig[i];var pk=Math.max(0,Math.sin(t*p.sp+p.ph));
      p.g.setAttribute('transform','translate('+p.x+' '+(p.y+pk*3)+') scale('+(p.fl?-1:1)+' 1) rotate('+(pk*28)+' 0 -12)');}
    for(var j=0;j<fly.length;j++){var q=fly[j];var a=t*.6+q.ph;
      q.g.setAttribute('transform','translate('+(q.x+Math.cos(a)*q.r)+' '+(q.y+Math.sin(a*1.7)*14)+')');
      var fl=Math.sin(t*14+q.ph);q.w.setAttribute('transform','scale(1 '+(0.35+0.65*fl)+')');}
  });
}};
})();
