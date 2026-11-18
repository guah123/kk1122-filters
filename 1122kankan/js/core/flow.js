/* flow.js — 34-step flow table (owner A). Texts are Kai's verbatim spec wording. */
window.DAYOF = window.DAYOF || {};
(function () {
  var W = '凱凱在哪裡？';
  function lyr(n, song) { return { n: n, type: 'lyrics', song: song, btn: '繼續看看👀' }; }  // v=261116aa (Kai): all lyrics pages
  function where(n, scene, desc) { return { n: n, type: 'where', scene: scene, title: W, desc: desc, btn: '繼續看看👀' }; }
  function qa(n, q, buttons, note) {
    var r = { n: n, type: 'qa', key: 'q' + n, q: q, buttons: buttons };
    if (note) r.note = note;
    return r;
  }

  DAYOF.FLOW = [
    { n: 1, type: 'landing', title: '看看', btn: '開始' },
    { n: 2, type: 'form', title: '請輸入暱稱，和email', nicknameLabel: '暱稱', emailLabel: 'email', btn: '送出' },
    { n: 3, type: 'rules', popup: true, title: '今天的守則',
      items: ['可以吃蛋糕', '可以吧檯點酒', '想笑就笑想哭就哭', '可以加入這個LINE社群同步聊天', '請大家一步一步跟著這個網頁走'],
      lineItem: 3, btn: 'OK' },
    lyr(4, '我消失了'),
    where(5, 'park', '星期天的午後，\n廣場上的鴿子比人還多。\n有人踩著一顆大球，搖搖晃晃地笑；\n伯伯把麵包撕成小小的雲，\n鴿子就飛起來、又落下。\n小提琴的聲音繞著廣場轉了一圈，\n凱凱也在這裡——\n你看見他了嗎？'),
    lyr(6, '飛鳥'),
    where(7, 'escalator', '鴿子飛走以後，天就暗了。\n下班的人潮擠進車站，\n手扶梯一邊往上，一邊往下，\n每張臉都有點累、有點發呆。\n凱凱跟著人群上上下下，\n像一顆被帶著走的小石頭。\n在這麼多疲倦的肩膀之間，\n找找看，他在哪裡？'),
    lyr(8, '回家'),
    qa(9, '如果上太空之前，\n你可以留下一段話在你的社群上給大家，\n你會留什麼？\n（請注意：太空人可能一去不返）', ['送出', '跳過']),
    lyr(10, '創作-太空人'),
    { n: 11, type: 'suitcase', key: 'suitcase', title: '上太空的行李箱你要帶什麼去？',
      hint: '把想帶的東西拖進行李箱，拖完之後點一下行李箱，把行李箱關起來',
      items: [
        { id: 'switch', label: 'Switch' },
        { id: 'headphones', label: '全罩耳機' },
        { id: 'book', label: '咖啡色書皮的書' },
        { id: 'monstera', label: '龜背芋盆栽' },
        { id: 'guitar', label: '一把吉他' },
        { id: 'chips', label: '一包洋芋片' },
        { id: 'football', label: '一顆足球' },
        { id: 'familyphoto', label: '一個全家福相框' },
        { id: 'cigarettes', label: '一包菸' },
        { id: 'dress', label: '一套洋裝（和帽子一起）' }
      ] },
    lyr(12, '行李'),
    { n: 13, type: 'yesno', key: 'yes13', q: '如果2026/11/22的這個當下，你正在跟誰賭氣，你可以放下面子好好跟他說一句話嗎？', yes: 'Yes', no: 'No' },
    lyr(14, '搬到合歡山上'),
    qa(15, '如果今天是陳柏凱的喪禮，你想跟大家分享一件他的事，你會分享什麼？', ['送出', '跳過'], '（如果你有回他，他也會回你這一題）'),
    lyr(16, '創作-毛毛雨'),
    where(17, 'bridge', '走出車站，已經是冬天了。\n聖誕市集一攤一攤收起燈泡，\n大家抱著袋子，走上橋回家。\n河裡躺著一個大大的滿月，\n拿著棉花糖的小朋友指著它笑，\n好像月亮掉進了水裡。\n凱凱也停下來看月亮，\n他站在橋上的哪裡呢？'),
    lyr(18, 'Always'),
    where(19, 'bookstore', '順著月光，\n走進一間地下室的小書店。\n沐月書店亮著暖暖的燈，\n音樂開始了，\n大家的手在空中左右搖擺。\n可是台下怎麼都找不到凱凱……\n也許，要換個方向看看？'),
    lyr(20, '滿ちてゆく'),
    qa(21, '如果世界是一片披薩，你是一種配料，你是什麼配料，為什麼？', ['送出', '蛤']),
    lyr(22, 'Maybe maybe'),
    where(23, 'office', '音樂會散場，城市還沒有睡。\n一棟好高好高的辦公大樓，\n每一扇窗裡都有一個人，\n有人加班，有人發呆，有人望著窗外。\n聽說凱凱就在某一扇窗裡，\n一層一層數數看，他在幾樓呢？'),
    lyr(24, '大人中'),
    where(25, 'fireworks', '一眨眼，夏天來了。\n大家穿上浴衣，\n提著燈籠走向街的盡頭，\n天空一朵一朵開出煙火。\n凱凱也換上了條紋浴衣，\n混在人群裡慢慢往前走，\n你找得到他嗎？'),
    lyr(26, '明日晴れるかな'),
    where(27, 'newyork', '煙火散去，\n凱凱搭上一班很遠很遠的飛機。\n醒來的時候，他在紐約。\n黃色計程車按著喇叭，\n人們從四面八方穿過馬路，\n每個人都趕著去某個地方。\n這一路走了好遠，最後一次了——\n再找一次凱凱吧。'),
    lyr(28, 'Hey there Delilah'),
    { n: 29, type: 'photo', text: '現在就拍一張照吧，我也想看看你的世界', btn: '拍照', doneBtn: '拍完了' },
    lyr(30, '創作-記得我'),
    qa(31, '如果你只能帶著這輩子的一件記憶到下輩子，你想帶著哪一件事？', ['送出', '跳過']),
    lyr(32, '我記得'),
    { n: 33, type: 'credits', btn: '繼續看看' },
    { n: 34, type: 'egg', lineLabel: '加入LINE社群', coffeeLabel: 'Buy Kai a Coffee' }
  ];

  DAYOF.FILTERS = [
    { id: 'helmet', unlock: 10, icon: 'helmet', label: '太空人' },
    { id: 'rain', unlock: 16, icon: 'rain', label: '下雨' },
    { id: 'sun', unlock: 26, icon: 'sun', label: '太陽' },
    { id: 'fish', unlock: 30, icon: 'fish', label: '魚眼' },
    { id: 'home', unlock: 32, icon: 'home', label: '家' }
  ];

  DAYOF.STEPS = DAYOF.FLOW.length; // 34
})();
