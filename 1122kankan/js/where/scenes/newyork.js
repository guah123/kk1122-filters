(function(){
DAYOF.Where = DAYOF.Where || { _scenes:{} };
DAYOF.Where._scenes = DAYOF.Where._scenes || {};
DAYOF.Where._scenes['newyork'] = { W:2000, H:2600, bgColor:'#E9E0D0', build(S){
  var W=S.W, H=S.H, L=S.layer;
  var ROAD0=1200, ROAD1=1760;
  // ---- sky + ground ----
  S.rect(0,0,W,H,{fill:'#E9E0D0'},L.bg);
  S.rect(0,0,W,760,{fill:'#DCE3E2'},L.bg);
  S.wash(-100,-80,W+200,520,'#C9D8DD',.6,L.bg);
  S.wash(200,200,700,200,'#F3E6D0',.55,L.bg);
  S.wash(1200,120,600,200,'#F3E6D0',.5,L.bg);
  // sidewalks
  S.rect(0,900,W,ROAD0-900,{fill:'#D9CDB8'},L.bg);
  S.rect(0,ROAD1,W,H-ROAD1,{fill:'#D9CDB8'},L.bg);
  for(var i=0;i<60;i++){var sx=S.range(0,W),sy=S.range(920,1190);S.rect(sx,sy,S.range(50,110),2,{fill:'#C4B79F',opacity:.6},L.bg);}
  for(i=0;i<90;i++){sx=S.range(0,W);sy=S.range(1780,2580);S.rect(sx,sy,S.range(50,110),2,{fill:'#C4B79F',opacity:.6},L.bg);}
  // road
  S.rect(0,ROAD0,W,ROAD1-ROAD0,{fill:'#9C9A9A',filter:'url(#wc)'},L.bg);
  S.wash(0,ROAD0+40,W,120,'#B3AFA9',.4,L.bg);
  S.rect(0,ROAD0-14,W,14,{fill:'#BDB19A'},L.bg);
  S.rect(0,ROAD1,W,14,{fill:'#BDB19A'},L.bg);
  for(i=0;i<20;i++) S.rect(i*110+20,(ROAD0+ROAD1)/2-5,64,10,{fill:'#E8C86A',opacity:.9},L.bg);
  // crosswalk zebra
  for(i=0;i<9;i++) S.rect(740+i*58,ROAD0+6,32,ROAD1-ROAD0-12,{fill:'#EFE8D8',opacity:.92},L.bg);
  for(i=0;i<9;i++){S.rect(740+i*58,ROAD0-70,32,56,{fill:'#EFE8D8',opacity:.8},L.bg);S.rect(740+i*58,ROAD1+14,32,56,{fill:'#EFE8D8',opacity:.8},L.bg);}
  // manhole + steam
  S.el('ellipse',{cx:300,cy:1640,rx:44,ry:16,fill:'#6F6C6C'},L.bg);
  S.el('ellipse',{cx:300,cy:1636,rx:30,ry:9,fill:'none',stroke:'#8A8686','stroke-width':3},L.bg);
  var steam=[];
  for(i=0;i<4;i++){var sg=S.el('g',{},L.mid);S.el('ellipse',{cx:0,cy:0,rx:40,ry:28,fill:'#F6F2EA',filter:'url(#wc)'},sg);steam.push(sg);}
  // ---- skyline ----
  var BC=['#B9B6B8','#C6BBB0','#A9AFB5','#CDBFAE','#B5A89C','#9FA8AE'];
  function sky(x,w,h,c){
    S.rect(x,900-h,w,h,{fill:c,filter:'url(#wc)'},L.bg);
    for(var wy=900-h+30;wy<860;wy+=44) for(var wx=x+16;wx<x+w-24;wx+=34) S.rect(wx,wy,16,22,{fill:S.rng()<.25?'#F1DFA6':'#D8D8D6',opacity:.75},L.bg);
  }
  var x=-20; while(x<W){var w=S.range(130,230),h=S.range(380,820);sky(x,w,h,S.pick(BC));x+=w-S.range(0,30);}
  // empire-ish spire
  S.rect(1530,150,100,750,{fill:'#BDB4A6',filter:'url(#wc)'},L.bg);
  S.rect(1555,70,50,90,{fill:'#C8BFB0'},L.bg);S.rect(1577,0,6,76,{fill:'#9A9288'},L.bg);
  // brownstones row (front of skyline)
  var BR=['#B8806C','#A56F5C','#C48F74','#9B6B58','#B27A62'];
  x=-30; while(x<W){var bw=S.range(160,230);var bh=S.range(300,420);var c=S.pick(BR);
    S.rect(x,900-bh,bw,bh,{fill:c,filter:'url(#wc)'},L.bg);
    S.rect(x-6,900-bh-14,bw+12,18,{fill:'#8A5E4E'},L.bg);
    for(var r=0;r<3;r++) for(var k=0;k<3;k++) S.rect(x+22+k*(bw-60)/2.4,900-bh+34+r*92,34,54,{fill:'#EDE0BC',stroke:'#6E5446','stroke-width':3,opacity:.9},L.bg);
    S.rect(x+bw/2-20,900-80,40,80,{fill:'#5E4A40'},L.bg);
    for(var st=0;st<4;st++) S.rect(x+bw/2-30-st*3,900-st*10-2,60+st*6,6,{fill:'#CFC3AE'},L.bg);
    x+=bw+S.range(0,10);}
  // ---- traffic lights / lampposts ----
  var lights=[];
  function tlight(px,py){
    S.rect(px-5,py-300,10,300,{fill:'#58554F'},L.mid);
    S.rect(px-5,py-300,90,8,{fill:'#58554F'},L.mid);
    var g=S.el('g',{},L.mid);
    S.rect(px+60,py-296,34,86,{rx:8,fill:'#47443F'},g);
    var red=S.circle(px+77,py-276,10,{fill:'#C65B4C'},g),grn=S.circle(px+77,py-236,10,{fill:'#7FA77A'},g);
    S.circle(px+77,py-256,10,{fill:'#E0B64E',opacity:.5},g);
    lights.push([red,grn]);
  }
  tlight(680,ROAD0-10);tlight(1320,ROAD1+60);
  function lamp(px,py){S.rect(px-5,py-250,10,250,{fill:'#5E5A52'},L.mid);S.circle(px,py-262,18,{fill:'#F3E2A4',stroke:'#5E5A52','stroke-width':4},L.mid);S.wash(px-60,py-330,120,120,'#F6E6B0',.3,L.mid);}
  lamp(120,1140);lamp(1880,1170);lamp(540,2200);lamp(1700,2520);
  // ---- vehicles ----
  var cars=[];
  function taxi(y,dir,col){
    var g=S.el('g',{},L.mid);
    S.el('ellipse',{cx:0,cy:6,rx:105,ry:12,fill:'#6E6A66',opacity:.35},g);
    S.path('M-100 0 L-100 -40 Q-96 -52 -70 -54 L-50 -86 Q-44 -94 -30 -94 L40 -94 Q54 -94 62 -84 L82 -54 Q100 -50 102 -36 L102 0Z',{fill:col,stroke:'#8A6A3A','stroke-width':3,filter:'url(#wc)'},g);
    S.path('M-44 -56 L-28 -84 L-6 -84 L-6 -56Z M6 -56 L6 -84 L36 -84 L56 -56Z',{fill:'#CFE0E4',opacity:.9},g);
    S.rect(-20,-108,40,14,{fill:'#F3E8C0',stroke:'#8A6A3A','stroke-width':2},g);
    S.circle(-62,2,19,{fill:'#4A4743'},g);S.circle(62,2,19,{fill:'#4A4743'},g);
    S.circle(-62,2,8,{fill:'#BDB6A8'},g);S.circle(62,2,8,{fill:'#BDB6A8'},g);
    if(dir<0) g.setAttribute('data-flip','1');
    cars.push({g:g,y:y,dir:dir,v:S.range(110,200),x:S.range(0,W),flip:dir<0});
  }
  function bus(y,dir){
    var g=S.el('g',{},L.mid);
    S.el('ellipse',{cx:0,cy:6,rx:210,ry:12,fill:'#6E6A66',opacity:.35},g);
    S.rect(-200,-130,400,130,{rx:16,fill:'#8FB0B3',stroke:'#5E7C80','stroke-width':3,filter:'url(#wc)'},g);
    S.rect(-200,-52,400,16,{fill:'#E7DDB8'},g);
    for(var k=0;k<7;k++) S.rect(-180+k*52,-112,38,40,{fill:'#E4EEF0',opacity:.9},g);
    S.circle(-120,2,21,{fill:'#4A4743'},g);S.circle(120,2,21,{fill:'#4A4743'},g);
    cars.push({g:g,y:y,dir:dir,v:S.range(80,120),x:S.range(0,W),flip:dir<0});
  }
  var Y1=ROAD0+250, Y2=ROAD1-60;
  taxi(Y1,1,'#E3B94E');taxi(Y2,-1,'#E8C25C');taxi(Y2,-1,'#D9AF48');bus(Y1,1);
  taxi(Y1,1,'#DDB247');
  // ---- fixed street props ----
  // subway entrance (lower-left)
  var sbx=250,sby=2060;
  S.rect(sbx-10,sby-12,220,16,{fill:'#6E6A66'},L.mid);
  S.rect(sbx,sby-120,10,120,{fill:'#5E5A52'},L.mid);S.rect(sbx+190,sby-120,10,120,{fill:'#5E5A52'},L.mid);
  S.rect(sbx-6,sby-150,212,34,{rx:6,fill:'#7FA77A',stroke:'#4F6F4C','stroke-width':3},L.mid);
  S.text(sbx+100,sby-124,'SUBWAY',{'text-anchor':'middle','font-size':24,fill:'#F1ECDD','font-family':'sans-serif','font-weight':'bold'},L.mid);
  S.circle(sbx+14,sby-170,9,{fill:'#E0B64E'},L.mid);S.circle(sbx+186,sby-170,9,{fill:'#E0B64E'},L.mid);
  for(i=0;i<6;i++) S.rect(sbx+20+i*28,sby-10+i*4,160-i*20+0,5,{fill:'#9A958A'},L.bg);
  // newspaper stand / mailbox
  S.rect(1780,2000,70,100,{fill:'#5A7A98',stroke:'#3E586F','stroke-width':3,rx:6},L.mid);S.rect(1770,1990,90,18,{fill:'#4A6784'},L.mid);
  // fire hydrant
  S.rect(1120,1830,28,44,{fill:'#C4684F',rx:6},L.mid);S.circle(1134,1826,16,{fill:'#C4684F'},L.mid);
  // ---- crowds (static) ----
  var KAI={x:1445,y:2190};
  var av=[{x:KAI.x,y:KAI.y-30,r:80}];
  S.crowd({x:100,y:960,w:1800,h:200,n:22,sMin:.5,sMax:.62,avoid:av,sortByY:true});
  S.crowd({x:740,y:1230,w:520,h:500,n:16,sMin:.6,sMax:.78,sortByY:true});
  S.crowd({x:80,y:1830,w:1800,h:260,n:22,sMin:.7,sMax:.85,avoid:av.concat([{x:300,y:2060,r:130}]),sortByY:true});
  S.crowd({x:60,y:2120,w:1880,h:380,n:34,sMin:.82,sMax:.98,avoid:av.concat([{x:300,y:2060,r:130}]),sortByY:true});
  // ---- Kai behind hot-dog cart ----
  S.kai({x:KAI.x,y:KAI.y,s:.9});
  var cx=1355,cy=2215, cart=S.el('g',{'pointer-events':'none'},L.fg);
  S.el('ellipse',{cx:cx+10,cy:cy+4,rx:120,ry:12,fill:'#6E6A66',opacity:.3},cart);
  S.rect(cx-90,cy-80,170,70,{rx:8,fill:'#C6584A',stroke:'#7E3A31','stroke-width':3,filter:'url(#wc)'},cart);
  S.rect(cx-90,cy-82,170,14,{fill:'#E8DCB8'},cart);
  S.rect(cx-70,cy-130,60,50,{rx:6,fill:'#D9D2C2',stroke:'#8A8478','stroke-width':3},cart);
  S.circle(cx-60,cy+0,18,{fill:'#4A4743'},cart);S.circle(cx+50,cy+0,18,{fill:'#4A4743'},cart);
  S.rect(cx+78,cy-110,10,100,{fill:'#6B6258'},cart);
  S.path('M'+(cx-70)+' '+(cy-180)+' Q'+(cx+40)+' '+(cy-250)+' '+(cx+150)+' '+(cy-180)+' Z',{fill:'#E5C65A',stroke:'#8A6A3A','stroke-width':3,filter:'url(#wc)'},cart);
  S.rect(cx+36,cy-186,8,100,{fill:'#6B6258'},cart);
  S.text(cx+4,cy-38,'HOT DOGS',{'text-anchor':'middle','font-size':22,fill:'#F6EDD0','font-family':'sans-serif','font-weight':'bold'},cart);
  // a few foreground figures in front
  S.crowd({x:1180,y:2280,w:150,h:60,n:2,sMin:.9,sMax:1,sortByY:true,parent:L.fg});
  S.crowd({x:1500,y:2290,w:200,h:60,n:3,sMin:.9,sMax:1,sortByY:true,parent:L.fg});
  // pigeons (static)
  function pigeon(px,py,fl){var g=S.el('g',{},L.mid);S.el('ellipse',{cx:px,cy:py-10,rx:14,ry:10,fill:'#8D93A0'},g);S.circle(px+(fl?-12:12),py-18,6,{fill:'#7A8090'},g);S.path('M'+(px+(fl?-17:17))+' '+(py-18)+'l'+(fl?-6:6)+' 2',{stroke:'#C99A4A','stroke-width':3},g);S.rect(px-2,py-2,3,9,{fill:'#C99A4A'},g);return g;}
  [[1000,1900],[1050,1915],[620,2050],[900,2420],[1700,1900]].forEach(function(p,j){pigeon(p[0],p[1],j%2);});
  // ---- animated: plane + birds ----
  var plane=S.el('g',{},L.top);
  S.path('M-80 0 Q-70 -14 0 -14 L70 -10 Q90 -6 90 0 Q90 6 70 8 L0 12 Q-70 12 -80 0Z',{fill:'#F3EFE6',stroke:'#9A9A9A','stroke-width':2},plane);
  S.path('M-10 -12 L-40 -50 L-24 -50 L20 -12Z M-10 10 L-36 44 L-20 44 L20 10Z',{fill:'#E4DFD4',stroke:'#9A9A9A','stroke-width':2},plane);
  S.path('M-72 -10 L-92 -36 L-76 -36 L-52 -12Z',{fill:'#C98A6A'},plane);
  var contrail=S.path('M-90 0 L-420 0',{stroke:'#fff','stroke-width':10,opacity:.55,'stroke-linecap':'round'},plane);
  var birds=[];
  for(i=0;i<14;i++){
    var bg=S.el('g',{},L.top);
    S.path('M-14 0 Q-7 -10 0 0 Q7 -10 14 0',{stroke:'#6C6A66','stroke-width':3,fill:'none','stroke-linecap':'round'},bg);
    birds.push({g:bg,x:S.range(0,W),y:S.range(180,620),v:S.range(40,90)*(i%2?1:-1),ph:S.range(0,6),s:S.range(.8,1.5)});
  }
  // ---- animation ----
  S.anim(function(t,dt){
    cars.forEach(function(c){
      c.x+=c.dir*c.v*dt; if(c.dir>0&&c.x>W+260)c.x=-260; if(c.dir<0&&c.x<-260)c.x=W+260;
      c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+c.y+') scale('+(c.flip?-1:1)+' 1)');
    });
    var green=(Math.floor(t/3)%2)===0;
    lights.forEach(function(l){l[0].setAttribute('opacity',green?.3:1);l[1].setAttribute('opacity',green?1:.3);});
    var px=((t*70)%(W+700))-300;
    plane.setAttribute('transform','translate('+px.toFixed(1)+' 120) scale(1.2)');
    birds.forEach(function(b){
      b.x+=b.v*dt; if(b.x>W+40)b.x=-40; if(b.x<-40)b.x=W+40;
      var yy=b.y+Math.sin(t*2+b.ph)*14;
      b.g.setAttribute('transform','translate('+b.x.toFixed(1)+' '+yy.toFixed(1)+') scale('+b.s+' '+(b.s*(0.6+0.4*Math.sin(t*9+b.ph)))+')');
    });
    steam.forEach(function(s,j){var u=((t*.4+j*.25)%1);s.setAttribute('transform','translate('+(300+Math.sin(u*5+j)*14)+' '+(1630-u*160)+') scale('+(.6+u*.9)+')');s.setAttribute('opacity',(.55*(1-u)).toFixed(2));});
  });
}};
})();
