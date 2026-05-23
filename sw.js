const CACHE = 'mp-v1';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30分鐘

// 安裝 Service Worker
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

// 接收主頁面傳來的訊息
self.addEventListener('message', e => {
  if (e.data.type === 'START_WATCH') {
    startWatching(e.data.watchlist);
  }
  if (e.data.type === 'UPDATE_WATCHLIST') {
    watchlist = e.data.watchlist;
    seenTitles = JSON.parse(self._seenCache || '[]');
  }
});

let watchlist = [];
let seenTitles = new Set();
let timer = null;

function startWatching(wl) {
  watchlist = wl;
  // 載入已看過的新聞標題（避免重複通知）
  try { seenTitles = new Set(JSON.parse(self._seenCache || '[]')); } catch { seenTitles = new Set(); }

  if (timer) clearInterval(timer);
  checkNews();
  timer = setInterval(checkNews, CHECK_INTERVAL);
}

async function checkNews() {
  if (!watchlist.length) return;

  for (const sym of watchlist) {
    try {
      const res = await fetch(`/api/news?q=${encodeURIComponent(sym)}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.ok || !data.items.length) continue;

      // 取最新一則
      const latest = data.items[0];
      if (!seenTitles.has(latest.title)) {
        seenTitles.add(latest.title);
        // 只保留最近 100 筆避免無限增長
        if (seenTitles.size > 100) {
          const arr = Array.from(seenTitles);
          seenTitles = new Set(arr.slice(-100));
        }
        self._seenCache = JSON.stringify(Array.from(seenTitles));

        // 推播通知
        await self.registration.showNotification(`📈 ${sym} 最新新聞`, {
          body: latest.title,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: sym, // 同股票的通知會覆蓋，不會洗版
          data: { url: latest.link },
          vibrate: [200, 100, 200],
        });
      }
    } catch (e) {
      console.warn(`[SW] ${sym} check failed:`, e.message);
    }
  }
}

// 點擊通知時開啟對應新聞
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // 如果已有開啟的視窗就聚焦，否則開新分頁
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'OPEN_URL', url });
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

// 定期在背景自動喚醒檢查（即使頁面關閉）
self.addEventListener('periodicsync', e => {
  if (e.tag === 'news-check') {
    e.waitUntil(checkNews());
  }
});
