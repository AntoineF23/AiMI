/**
 * Keyless, provider-agnostic web awareness: URLs mentioned in chat are
 * prefetched here (title/excerpt, or YouTube oEmbed) and injected as context,
 * so it works with every model — no tool-calling support required.
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi

function isYoutube(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)\//i.test(url)
}

async function youtubeInfo(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return null
    const data = (await res.json()) as { title?: string; author_name?: string }
    if (!data.title) return null
    return `YouTube video: "${data.title}" by ${data.author_name ?? 'unknown channel'}`
  } catch {
    return null
  }
}

async function pageExcerpt(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'Mozilla/5.0 AiMI-desktop-pet', accept: 'text/html' }
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('text/html') && !type.includes('text/plain')) return null
    const html = (await res.text()).slice(0, 400_000)
    const title = /<title[^>]*>([^<]{1,200})/i.exec(html)?.[1]?.trim()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200)
    if (!title && text.length < 40) return null
    return `Page ${url}\nTitle: ${title ?? '(none)'}\nExcerpt: ${text}`
  } catch {
    return null
  }
}

/** Fetch context for up to `max` URLs found in the text. Empty string if none. */
export async function webContextFor(text: string, max = 2): Promise<string> {
  const urls = [...new Set(text.match(URL_RE) ?? [])].slice(0, max)
  if (urls.length === 0) return ''
  const results = await Promise.all(urls.map((u) => (isYoutube(u) ? youtubeInfo(u) : pageExcerpt(u))))
  const found = results.filter(Boolean)
  if (found.length === 0) return ''
  return `Context your human just shared (fetched from the web):\n${found.join('\n---\n')}`
}
