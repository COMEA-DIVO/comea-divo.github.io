const fs = require('fs');
const https = require('https');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

// 你要展示的游戏 AppID 列表（替换成你自己的）
const TARGET_GAMES = [1172470, 271590, 284160]; // Apex, GTA V, BeamNG

// 1. 获取游戏库（包含每个游戏的时长）
const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true&format=json`;

// 2. 获取玩家摘要（包含当前正在玩的游戏）
const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${API_KEY}&steamids=${STEAM_ID}`;

// 发起两个请求
Promise.all([
  fetchJson(gamesUrl),
  fetchJson(summaryUrl)
]).then(([gamesData, summaryData]) => {
  const games = gamesData.response.games || [];
  const player = summaryData.response.players[0] || {};

  // 过滤出目标游戏
  const filtered = games.filter(g => TARGET_GAMES.includes(g.appid));

  // 格式化为前端需要的结构
  const result = {
    games: filtered.map(g => ({
      appid: g.appid,
      name: g.name,
      playtime_hours: Math.round(g.playtime_forever / 60),  // 分钟转小时
      icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
    })),
    currentlyPlaying: player.gameextrainfo || null,          // 当前正在玩的游戏名称，没有则为 null
    lastUpdated: new Date().toISOString()
  };

  // 写入文件
  ensureDirSync('assets/data');
  fs.writeFileSync('assets/data/steam.json', JSON.stringify(result, null, 2));
  console.log('steam.json updated');
}).catch(err => {
  console.error(err);
  process.exit(1);
});

// 辅助函数：获取 JSON 数据
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 辅助函数：确保目录存在
function ensureDirSync(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}
