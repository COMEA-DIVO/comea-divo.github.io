const fs = require('fs');
const https = require('https');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

// 目标游戏 AppID 列表（按需修改）
const TARGET_GAMES = [1172470, 271590, 284160]; // Apex, GTA V, BeamNG

// API 接口
const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true&format=json`;
const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${API_KEY}&steamids=${STEAM_ID}`;
const friendsUrl = `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${API_KEY}&steamid=${STEAM_ID}&relationship=friend`;
const badgesUrl = `https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=${API_KEY}&steamid=${STEAM_ID}&format=json`;

Promise.all([
  fetchJson(gamesUrl),
  fetchJson(summaryUrl),
  fetchJson(friendsUrl).catch(() => null),
  fetchJson(badgesUrl).catch(() => null)
]).then(([gamesData, summaryData, friendsData, badgesData]) => {
  const games = gamesData.response.games || [];
  const player = summaryData.response.players[0] || {};

  // 过滤目标游戏
  const filtered = games.filter(g => TARGET_GAMES.includes(g.appid));

  // 好友数量
  let friendCount = 0;
  if (friendsData && friendsData.friendslist && friendsData.friendslist.friends) {
    friendCount = friendsData.friendslist.friends.length;
  }

  // 徽章数量
  let badgeCount = 0;
  if (badgesData && badgesData.response && badgesData.response.badges) {
    badgeCount = badgesData.response.badges.length;
  }

  const result = {
    games: filtered.map(g => ({
      appid: g.appid,
      name: g.name,
      playtime_hours: Math.round(g.playtime_forever / 60),
      icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
    })),
    currentlyPlaying: player.gameextrainfo || null,
    gameCount: games.length,
    friendCount: friendCount,
    badgeCount: badgeCount,          // 新增徽章数量
    lastUpdated: new Date().toISOString()
  };

  ensureDirSync('assets/data');
  fs.writeFileSync('assets/data/steam.json', JSON.stringify(result, null, 2));
  console.log('steam.json updated');
}).catch(err => {
  console.error(err);
  process.exit(1);
});

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

function ensureDirSync(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}
