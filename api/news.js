export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'stock market economy finance';
  
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  
  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketPulse/1.0)' }
    });
    
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
    
    const xml = await res.text();
    
    // Parse XML to JSON
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
      const link = (item.match(/<link>(.*?)<\/link>/) || item.match(/<link .*?href="(.*?)"/))?.[1]?.trim() || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || '';
      const source = (item.match(/<source.*?>(.*?)<\/source>/))?.[1]?.trim() || 'Google News';
      
      if (title) {
        items.push({
          title: title.replace(/ - [^-]{2,50}$/, '').trim(),
          link,
          pubDate,
          source,
        });
      }
      if (items.length >= 20) break;
    }
    
    return new Response(JSON.stringify({ ok: true, items }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
