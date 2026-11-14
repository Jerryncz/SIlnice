// Druhy silnic, budov a zboží.

// lanes = výchozí počet pruhů v každém směru, cost = Kč za pole délky, laneCost = za každý další pruh
const RK={
  alley:{name:"Ulička",lanes:1,min:1,max:1,speed:0.6,median:0,side:0.08,cost:4,laneCost:0,front:true,walk:true,rank:0,line:"none"},
  street:{name:"Ulice",lanes:1,min:1,max:1,speed:0.8,median:0,side:0.1,cost:6,laneCost:0,front:true,walk:true,rank:1,line:"dash"},
  road:{name:"Silnice",lanes:1,min:1,max:10,speed:1.0,median:0,side:0.12,cost:10,laneCost:8,front:true,walk:true,rank:2,line:"solid"},
  oneway:{name:"Jednosměrka",lanes:1,min:1,max:10,speed:0.9,median:0,side:0.12,cost:8,laneCost:7,front:true,walk:true,oneway:true,rank:2,line:"none"},
  blvd:{name:"Bulvár",lanes:2,min:2,max:10,speed:1.25,median:0.34,side:0.14,cost:22,laneCost:10,front:true,walk:true,rightOnly:true,rank:3},
  hwy:{name:"Dálnice",lanes:2,min:2,max:10,speed:1.9,median:0.24,side:0,cost:36,laneCost:14,front:false,walk:false,rank:5},
  ramp:{name:"Nájezd",lanes:1,min:1,max:10,speed:1.3,median:0,side:0,cost:14,laneCost:8,front:false,walk:false,oneway:true,rank:4}
};
const ROAD_KINDS=["alley","street","road","oneway","blvd","hwy","ramp"];
const LEVEL_NAMES=["Zem","Most","Vysoký most"];

const R_HOUSE=1,R_FLAT=2,R_BLD=3,R_LOT=4,R_FORE=5,R_GAR=6,R_YARD=7;
const ROLE_OF={h:R_HOUSE,b:R_BLD,p:R_LOT,f:R_FORE,g:R_GAR,y:R_YARD};
const isLotRole=r=>r===R_LOT||r===R_FORE||r===R_YARD;

const GOODS={
  wood:{name:"dřevo",pay:4,color:"#8a6a3a"},stone:{name:"kámen",pay:4,color:"#9a9a92"},ore:{name:"železná ruda",pay:5,color:"#9a4f3a"},
  lumber:{name:"řezivo",pay:9,color:"#c9a26a"},steel:{name:"ocel",pay:22,color:"#5d6f86"}};

// jobs = pracovní místa (nebo jobsPerTile), slots = parkovací místa na pole parkoviště
const KIND={
  gas:{name:"Pumpa",letter:"B",color:"#d0841c",slots:2,pay:3,demolish:120,jobs:2},
  pub:{name:"Hospoda",letter:"H",color:"#8a5a2b",slots:4,pay:4,pull:6,demolish:120,jobs:3,evening:true},
  shop:{name:"Obchod",letter:"O",color:"#2f7f6f",slots:4,pay:4,pull:6,demolish:120,jobs:4},
  mall:{name:"Nákupní centrum",letter:"N",color:"#8a3f8f",slots:4,pay:9,pull:20,demolish:150,jobs:15},
  hyper:{name:"Obchodní zóna",letter:"Z",color:"#6a3fa0",slots:4,pay:12,pull:40,demolish:150,jobs:30},
  park:{name:"Parkovací dům",letter:"P",color:"#2b5fa8",cap:20,pay:2,demolish:120,jobs:0},
  office:{name:"Kanceláře",letter:"K",color:"#3f6f9e",slots:4,pay:0,demolish:160,jobsPerTile:10},
  school:{name:"Škola",letter:"Š",color:"#c9952a",slots:2,pay:0,demolish:200,jobs:6,kids:150},
  // vybavenost obcí (vzniká sama podle velikosti obce); leisure = kdo sem chodí na vycházku
  playground:{name:"Hřiště",letter:"Hř",color:"#d0943a",slots:0,pay:0,demolish:60,jobs:0,leisure:"kids",amenity:true},
  parkland:{name:"Park",letter:"Pa",color:"#5f9a52",slots:0,pay:0,demolish:60,jobs:1,leisure:"adults",amenity:true},
  cafe:{name:"Kavárna",letter:"Ka",color:"#9a5b3f",slots:2,pay:3,pull:4,demolish:120,jobs:3,amenity:true},
  church:{name:"Kostel",letter:"Ko",color:"#8a8478",slots:2,pay:1,pull:3,seniorOnly:true,demolish:300,jobs:1,amenity:true},
  square:{name:"Náměstí",letter:"Ná",color:"#b9a98a",slots:0,pay:0,demolish:200,jobs:0,leisure:"all",amenity:true},
  logging:{name:"Těžba dřeva",letter:"D",color:"#55702f",slots:3,pay:0,jobs:6,out:"wood",res:FOREST,demolish:150,industry:true},
  quarry:{name:"Lom",letter:"L",color:"#77736a",slots:3,pay:0,jobs:8,out:"stone",res:ROCK,demolish:150,industry:true},
  mine:{name:"Důl na železo",letter:"Ž",color:"#8a4b3a",slots:3,pay:0,jobs:10,out:"ore",res:ORE,demolish:200,industry:true},
  sawmill:{name:"Pila",letter:"Pi",color:"#a0763a",slots:4,pay:0,jobs:12,out:"lumber",need:{wood:1},rate:0.08,demolish:200,industry:true},
  steel:{name:"Ocelárna",letter:"Oc",color:"#4d5d73",slots:4,pay:0,jobs:24,out:"steel",need:{ore:1,stone:1},rate:0.05,demolish:300,industry:true}
};
const units=b=>b.tiles.length/4;          // velikost budovy v polích (pole = 2 × 2 buňky)
const jobsOf=b=>{const K=KIND[b.type];if(!K)return 0;return K.jobsPerTile?Math.round(K.jobsPerTile*units(b)):(K.jobs||0)};

const HOUSE_SHAPES=[
  {name:"Domek",w:6,cells:[[0,0]]},
  {name:"Dvojdomek",w:3,cells:[[0,0],[1,0]]},
  {name:"Dům se zahradou",w:2,cells:[[0,0],[0,1]]},
  {name:"Statek do L",w:2,min:16,cells:[[0,0],[1,0],[0,1]]},
  {name:"Dlouhý statek do L",w:0.8,min:30,cells:[[0,0],[1,0],[2,0],[0,1]]},
  {name:"Statek do Z",w:1.2,min:24,cells:[[0,0],[1,0],[1,1],[2,1]]},
  {name:"Statek do U",w:1,min:40,cells:[[0,0],[0,1],[1,1],[2,1],[2,0]]}
];
// bytovky mají před domem venkovní stání (p)
const FLAT_SHAPES=[
  {name:"Bytový dům",w:3,cells:[[0,0,"p"],[1,0,"p"],[0,1],[1,1]]},
  {name:"Panelový dům",w:2,cells:[[0,0,"p"],[1,0,"p"],[2,0,"p"],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]},
  {name:"Bytový blok",w:1.5,cells:[[0,0,"p"],[1,0,"p"],[0,1],[0,2],[1,1],[1,2]]}
];
const row=(v,n,r)=>Array.from({length:n},(_,u)=>[u,v,r]);
const SVC_SHAPES={
  pub:[[...row(0,3,"p"),...row(1,3,"p"),...row(2,3,"b")],[...row(0,2,"p"),...row(1,2,"p"),...row(2,2,"b")],[[0,0,"p"],[1,0,"p"],[0,1,"b"],[1,1,"b"]],[[0,0,"p"],[0,1,"b"]]],
  shop:[[...row(0,3,"p"),...row(1,3,"p"),...row(2,3,"b")],[...row(0,2,"p"),...row(1,2,"p"),...row(2,2,"b")],[[0,0,"p"],[1,0,"p"],[0,1,"b"],[1,1,"b"]],[[0,0,"p"],[0,1,"b"],[1,1,"b"]]],
  mall:[[...row(0,4,"p"),...row(1,4,"p"),...row(2,4,"p"),...row(3,4,"b")],[...row(0,3,"p"),...row(1,3,"p"),...row(2,3,"p"),...row(3,3,"b")],[...row(0,3,"p"),...row(1,3,"p"),...row(2,3,"b")],[...row(0,2,"p"),...row(1,2,"p"),...row(2,2,"b")]],
  hyper:[[...row(0,4,"p"),...row(1,4,"p"),...row(2,4,"p"),...row(3,4,"b"),...row(4,4,"b")],[...row(0,4,"p"),...row(1,4,"p"),...row(2,4,"b"),...row(3,4,"b")],[...row(0,3,"p"),...row(1,3,"p"),...row(2,3,"b"),...row(3,3,"b")]],
  gas:[[[0,0,"f"],[1,0,"f"],[0,1,"b"],[1,1,"b"]],[[0,0,"f"],[1,0,"f"],[0,1,"b"]]],
  park:[[[0,0,"g"],[1,0,"g"],[0,1,"g"],[1,1,"g"]],[[0,0,"g"],[1,0,"g"],[2,0,"g"]]],
  office:[[...row(0,2,"p"),...row(1,2,"b"),...row(2,2,"b")],[...row(0,3,"p"),...row(1,3,"b")],[[0,0,"p"],[0,1,"b"],[1,1,"b"]]],
  school:[[...row(0,3,"y"),...row(1,3,"b")],[...row(0,2,"y"),...row(1,2,"b")]],
  playground:[[[0,0,"y"],[1,0,"y"],[0,1,"y"],[1,1,"y"]],[[0,0,"y"],[1,0,"y"]]],
  parkland:[[...row(0,3,"y"),...row(1,3,"y"),...row(2,3,"y")],[...row(0,2,"y"),...row(1,2,"y"),...row(2,2,"y")],[...row(0,2,"y"),...row(1,2,"y")]],
  cafe:[[[0,0,"y"],[1,0,"p"],[0,1,"b"],[1,1,"b"]],[[0,0,"y"],[0,1,"b"]]],
  church:[[[0,0,"y"],[1,0,"y"],[0,1,"b"],[1,1,"b"],[0,2,"b"],[1,2,"b"]],[[0,0,"y"],[0,1,"b"],[0,2,"b"]]],
  square:[[...row(0,3,"y"),...row(1,3,"y"),...row(2,3,"y")],[...row(0,3,"y"),...row(1,3,"y")]],
  logging:[[[0,0,"y"],[1,0,"y"],[0,1,"b"],[1,1,"y"]],[[0,0,"y"],[0,1,"b"]]],
  quarry:[[[0,0,"y"],[1,0,"y"],[0,1,"b"],[1,1,"b"]],[[0,0,"y"],[0,1,"b"]]],
  mine:[[[0,0,"y"],[1,0,"y"],[0,1,"b"],[1,1,"b"]],[[0,0,"y"],[0,1,"b"]]],
  sawmill:[[...row(0,3,"y"),[0,1,"b"],[1,1,"b"],[2,1,"y"]],[[0,0,"y"],[1,0,"y"],[0,1,"b"],[1,1,"b"]]],
  steel:[[...row(0,3,"y"),...row(1,3,"b"),...row(2,3,"b")],[[0,0,"y"],[1,0,"y"],[0,1,"b"],[1,1,"b"]]]
};
// tvary jsou v polích; na jemné síti je každé pole 2 × 2 buňky (v = 0 je řada u silnice)
const fineShape=cells=>{const o=[];for(const c of cells)for(let b=0;b<2;b++)for(let a=0;a<2;a++)o.push([c[0]*2+a,c[1]*2+b,c[2]]);return o};
for(const s of HOUSE_SHAPES)s.cells=fineShape(s.cells);
for(const s of FLAT_SHAPES)s.cells=fineShape(s.cells);
for(const k in SVC_SHAPES)SVC_SHAPES[k]=SVC_SHAPES[k].map(fineShape);
const housePop=n=>[0,4,6,8,9,10,11][Math.round(n)]||11;   // n = počet polí
const isHome=b=>b&&(b.type==="house"||b.type==="flat");
