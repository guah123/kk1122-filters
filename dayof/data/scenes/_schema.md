# data/scenes/<id>.json — 凱凱在哪裡 圖片模式設定

id ∈ `park escalator bridge bookstore office fireworks newyork`。檔案不存在、或 `views.main` 圖載不到（4 秒內沒載完且 HEAD 也找不到）→ 引擎自動改用程式畫的場景（`js/where/scenes/<id>.js`）。

**座標一律是背景圖寬/高的比例（0~1）**，左上角 (0,0)。量座標用 `tools/place.html?scene=<id>`。

```jsonc
{
  "id": "park",
  "views": { "main": "assets/scenes/s05-park.jpg" },          // bookstore 另有 "selfie"；>1 個 view 會出現「更換前後鏡頭」
  "initView": "main",                                          // 一進場顯示哪個鏡頭
  "kai": { "view": "main", "x": 0.62, "y": 0.51, "h": 0.09,     // x,y = 腳底中心；h = 整張貼圖高 / 圖高
           "flip": false, "rot": 0,                            // 貼圖原本面向右；flip=true 左右翻；rot 順時針度數
           "visible": 1 },                                     // 從頭頂往下露出的比例（<1 = 下半身被裁掉，像躲在人群後）；找到時會整隻露出
  "occluders": [ { "view": "main", "x": 0.3, "y": 0.6, "w": 0.06, "h": 0.04 } ],   // 背景裁一塊重畫在貼圖「上面」（假前景）；x,y = 左上角
  "bonus": [                                                   // 可選彩蛋（右上「彩蛋 n/3」清單）；找到凱凱後仍可繼續找
    { "id": "sister", "label": "姊姊（袋熊）", "sprite": "assets/scenes/wombat.png", "view": "main", "x": 0.3, "y": 0.77, "h": 0.05, "flip": false, "visible": 0.75 },
    { "id": "pick", "label": "凱凱掉的吉他彈片", "sprite": "assets/scenes/pick.png", "view": "main", "x": 0.55, "y": 0.74, "h": 0.02, "rot": 20 },
    { "id": "item", "label": "踩大球的街頭藝人", "view": "main", "x": 0.45, "y": 0.33, "w": 0.12, "h": 0.19 }   // 沒有 sprite = 畫在背景裡的東西；x,y,w,h = 框
  ],
  "hotspots": [ { "view": "main", "x": 0.14, "y": 0.32, "w": 0.09, "h": 0.1, "say": "不是我啦～" } ],   // 誘餌（紅白條紋角色）→ 點了冒泡泡
  "ambient": null,                                             // 或下列其一（座標同為比例）：
  //  { "type": "escalator", "lanes": [ { "x0":0.24,"y0":0.76,"x1":0.37,"y1":0.1,"w":0.28,"dir":"up" } ] }  // x0,y0 底部中心、x1,y1 頂部中心、w 底寬（頂寬 = w×topScale(0.55)）
  //     也可用 "quads": [ { "pts": [[左上],[右上],[右下],[左下]], "dir": "down" } ]；可選 n, speed, color, opacity
  //  { "type": "fireworks", "bursts": [ { "x":0.4,"y":0.1,"r":0.07 } ], "period": 3.4 }      // r = 半徑 / 圖寬
  //  { "type": "moon", "rect": { "x":0.54,"y":0.7,"w":0.27,"h":0.21 }, "n": 10 }             // 倒影波光區
  "bgColor": "#EFE6D4",                                        // 可選：載圖前/邊緣底色
  "loadTimeoutMs": 4000                                        // 可選
}
```

## 判定
- 凱凱：貼圖「露出部分」外框 + 各邊 30% padding（+13px 螢幕 padding）。貼圖載不到 → 同位置改畫程式凱凱。
- 彩蛋：sprite 同上（露出部分 +30%）；框型 item 外擴 15%。存 `state.found[n].bonus = {sister:true, pick:true, item:true}`（sister 另存 `found[n].sister` 相容）。
- 時間軸（秒，從按「開始找」起算）：30 出現放大鏡鈕＋自動把鏡頭拉到凱凱所在的「四分之一」並脈動該區外框（不圈凱凱）→ 45 自動在凱凱身上脈動圓圈 → 60 出現「直接看下一首」（存 `found[n].skipped=true` 後 `ctx.next()`）。手動按放大鏡：第一次=四分之一、之後=圓圈。config：`HINT_AFTER_SEC` 30、`AUTO_HINT_SEC` 45、`SKIP_AFTER_SEC` 60。
- 畫在背景裡的凱凱（書店 selfie）：`"kai": {"view":"selfie","painted":true,"rect":{x,y,w,h},"foundOnView":true}` → 不放貼圖；按「更換前後鏡頭」翻到該鏡頭約 0.8 秒後自動算找到（點 rect 內也算）；提示改成讓換鏡頭鈕脈動＋泡泡「試試換鏡頭？」。

## 除錯
- `?noimg=1` 強制程式場景；`?scenesBase=<url/>` 把 `assets/scenes/` 換成別的資料夾。
- Console：`DAYOF.Where.current().mode()` → `image` / `procedural`；`.getKai()`、`.getBonus()`、`.solveBonus(id)`、`DAYOF.debug.solveWhere()`。
- 彩蛋頁（34）只用背景圖（cover + 慢速漂移），不放任何貼圖/UI。
