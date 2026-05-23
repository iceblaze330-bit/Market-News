export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'stock market economy finance';

  // 嘗試中文繁體 + 英文兩個 feed
  const feeds = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
  ];

  for (const rssUrl of feeds) {
    try {
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketPulse/1.0)' }
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const items = [];
      const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

      for (const match of itemMatches) {
        const block = match[1];

        // title
        let title = (
          block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
          block.match(/<title>([\s\S]*?)<\/title>/)
        )?.[1]?.trim() || '';
        title = title.replace(/ - [^-]{2,60}$/, '').trim();

        // link — Google News puts actual URL after <link>
        let link = '';
        const linkMatch = block.match(/<link\s*\/?>(.*?)<\/link>|<link>(.*?)<\/link>/);
        if (linkMatch) {
          link = (linkMatch[1] || linkMatch[2] || '').trim();
        }
        // fallback: <guid>
        if (!link) {
          link = block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]?.trim() || '';
        }

        const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
        const source = (
          block.match(/<source[^>]*>([\s\S]*?)<\/source>/) ||
          block.match(/<source>([\s\S]*?)<\/source>/)
        )?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || 'Google News';

        if (title && link) items.push({ title, link, pubDate, source });
        if (items.length >= 20) break;
      }

      if (items.length > 0) {
        return new Response(JSON.stringify({ ok: true, items }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
          }
        });
      }
    } catch (e) {
      console.error('Feed error:', e.message);
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'All feeds failed' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
