/* flow.js — 34-step flow table (owner A). Texts are Kai's verbatim spec wording. */
window.DAYOF = window.DAYOF || {};
(function () {
  var W = '凱凱在哪裡？';
  function lyr(n, song) { return { n: n, type: 'lyrics', song: song, btn: n === 6 ? '看看下一首' : '繼續看看' }; }
  function where(n, scene, desc) { return { n: n, type: 'where', scene: scene, title: W, desc: desc, btn: '繼續看看' }; }
  function qa(n, q, buttons, note) {
    var r = { n: n, type: 'qa', key: 'q' + n, q: q, buttons: buttons };
    if (note) r.note = note;
    return r;
  }

  DAYOF.FLOW = [
    { n: 1, type: 'landing', title: '看看', btn: '開始' },
    { n: 2, type: 'form', title: '請輸入暱稱，和email', nicknameLabel: '暱稱', emailLabel: 'email', btn: '送出' },
    { n: 3, type: 'rules', popup: true, title: '今天的守則',
      items: ['可以吃蛋糕', '可以喝酒', '想哭就哭想笑就笑', '可以加入這個LINE社群同步聊天', '請大家一步一步跟著這個網頁走'],
      lineItem: 3, btn: 'OK' },
    lyr(4, '我消失了'),
    where(5, 'park', '這張圖是大家在公園的大廣場，很熱鬧有街頭藝人在踩大球，有伯伯在餵很多鴿子（飛鳥~）吃麵包，有人在拉小提琴'),
    lyr(6, '飛鳥'),
    where(7, 'escalator', '在下班時間的上下手扶梯，大家看起來很茫然的樣子'),
    lyr(8, '回家'),
    qa(9, '如果上太空之前，你可以留下一段話在你的社群上給大家，你會留什麼？（請注意：太空人可能一去不返）', ['送出', '跳過']),
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
    where(17, 'bridge', '大家在一座橋上，河的倒影是今天大大的滿月。季節是冬天，大家從聖誕市集要回家，手上拿著一些東西，比如有小朋友邊拿著棉花糖，指著那個合理的月亮倒影看起來好開心的樣子。'),
    lyr(18, 'Always'),
    where(19, 'bookstore', '大家在沐月書店裡面看音樂會的樣子，大家的手在空中左右搖擺'),
    lyr(20, '滿ちてゆく'),
    qa(21, '如果世界是一片披薩，你是一種配料，你是什麼配料，為什麼？', ['送出', '蛤']),
    lyr(22, 'Maybe maybe'),
    where(23, 'office', '在一個很高的辦公樓裡，每一格裡面都有一個人。'),
    lyr(24, '大人中'),
    where(25, 'fireworks', '大家穿著浴衣在日本的煙火大會的晚上，在大街上興高采烈朝著煙火的方向走去。'),
    lyr(26, '明日晴れるかな'),
    where(27, 'newyork', '在紐約的城市的車水馬龍之中'),
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
