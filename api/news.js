export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const baseQuery = cleanText(searchParams.get('q') || 'stock market economy finance').slice(0, 120);
  const hours = clampNumber(searchParams.get('hours'), 24, 1, 168);
  const googleQuery = withFreshness(baseQuery, hours);

  const feeds = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(googleQuery)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(googleQuery)}&hl=en-US&gl=US&ceid=US:en`,
  ];

  const allItems = [];
  const seen = new Set();

  for (const rssUrl of feeds) {
    try {
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketPulse/1.0)' },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

      for (const match of itemMatches) {
        const item = parseItem(match[1]);
        if (!item.title || !item.link) continue;

        const key = `${item.title}|${item.source}`.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        allItems.push(item);
      }
    } catch (e) {
      console.error('Feed error:', e.message);
    }
  }

  const maxAgeMs = (hours + 12) * 60 * 60 * 1000;
  const items = allItems
    .filter(item => !item.pubDate || Date.now() - toTime(item.pubDate) <= maxAgeMs)
    .sort((a, b) => toTime(b.pubDate) - toTime(a.pubDate))
    .slice(0, 20);

  if (items.length > 0) {
    return json({ ok: true, items, query: googleQuery, hours }, 200, {
      'Cache-Control': 's-maxage=120, stale-while-revalidate=60',
    });
  }

  return json({ ok: false, error: 'No recent news found' }, 404);
}

function parseItem(block) {
  let title = decodeXml(
    (
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
      block.match(/<title>([\s\S]*?)<\/title>/)
    )?.[1]?.trim() || ''
  );
  title = title.replace(/ - [^-]{2,80}$/, '').trim();

  let link = '';
  const linkMatch = block.match(/<link\s*\/?>(.*?)<\/link>|<link>(.*?)<\/link>/);
  if (linkMatch) link = cleanUrl(decodeXml((linkMatch[1] || linkMatch[2] || '').trim()));
  if (!link) link = cleanUrl(decodeXml(block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1]?.trim() || ''));

  const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
  const source = decodeXml(
    (
      block.match(/<source[^>]*>([\s\S]*?)<\/source>/) ||
      block.match(/<source>([\s\S]*?)<\/source>/)
    )?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || 'Google News'
  );

  return { title, link, pubDate, source };
}

function withFreshness(query, hours) {
  if (/\bwhen:\S+/i.test(query)) return query;
  const days = Math.max(1, Math.ceil(hours / 24));
  return `${query} when:${days}d`;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function cleanText(value) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXml(value) {
  return cleanText(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function cleanUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function toTime(value) {
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? t : 0;
}
