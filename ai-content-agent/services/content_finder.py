import logging
import os

import aiohttp
import feedparser
from bs4 import BeautifulSoup

from config import Config

logger = logging.getLogger(__name__)


class ContentFinder:
    """Internetdan AI haqidagi kontentlarni qidirish."""

    RSS_FEEDS = {
        "openai_blog": "https://openai.com/blog/rss.xml",
        "huggingface": "https://huggingface.co/blog/feed.xml",
        "techcrunch_ai": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "arxiv_ai": "http://export.arxiv.org/rss/cs.AI",
        "mit_ai": "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml",
        "venturebeat_ai": "https://venturebeat.com/category/ai/feed/",
        "the_verge_ai": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    }

    REDDIT_SUBS = ["artificial", "MachineLearning", "ChatGPT", "LocalLLaMA"]

    def __init__(self):
        self.session: aiohttp.ClientSession | None = None
        os.makedirs(Config.MEDIA_DIR, exist_ok=True)

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    )
                }
            )
        return self.session

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def fetch_rss_feed(self, feed_name: str) -> list[dict]:
        """RSS feeddan kontentlarni olish."""
        url = self.RSS_FEEDS.get(feed_name)
        if not url:
            return []

        try:
            session = await self._get_session()
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    logger.warning(f"RSS feed {feed_name} xatosi: {resp.status}")
                    return []
                text = await resp.text()

            feed = feedparser.parse(text)
            results = []

            for entry in feed.entries[:5]:
                content_text = ""
                if hasattr(entry, "summary"):
                    content_text = entry.summary
                elif hasattr(entry, "description"):
                    content_text = entry.description

                soup = BeautifulSoup(content_text, "html.parser")
                clean_text = soup.get_text(strip=True)

                image_url = None
                img_tag = soup.find("img")
                if img_tag and img_tag.get("src"):
                    image_url = img_tag["src"]

                if not image_url and hasattr(entry, "media_content"):
                    for media in entry.media_content:
                        if "image" in media.get("type", ""):
                            image_url = media.get("url")
                            break

                results.append(
                    {
                        "title": entry.get("title", ""),
                        "text": clean_text[:2000],
                        "url": entry.get("link", ""),
                        "image_url": image_url,
                        "source": feed_name,
                    }
                )

            return results
        except Exception as e:
            logger.error(f"RSS {feed_name} xatosi: {e}")
            return []

    async def fetch_reddit(self) -> list[dict]:
        """Reddit AI subredditlaridan kontent olish."""
        results = []
        session = await self._get_session()

        for sub in self.REDDIT_SUBS:
            try:
                url = f"https://www.reddit.com/r/{sub}/hot.json?limit=5"
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status != 200:
                        continue
                    data = await resp.json()

                for post in data.get("data", {}).get("children", []):
                    post_data = post.get("data", {})
                    if post_data.get("stickied"):
                        continue

                    image_url = None
                    post_url = post_data.get("url", "")
                    if any(
                        post_url.endswith(ext)
                        for ext in [".jpg", ".jpeg", ".png", ".gif"]
                    ):
                        image_url = post_url

                    preview = post_data.get("preview", {})
                    if not image_url and preview:
                        images = preview.get("images", [])
                        if images:
                            image_url = images[0].get("source", {}).get("url", "")
                            if image_url:
                                image_url = image_url.replace("&amp;", "&")

                    results.append(
                        {
                            "title": post_data.get("title", ""),
                            "text": post_data.get("selftext", "")[:2000]
                            or post_data.get("title", ""),
                            "url": f"https://reddit.com{post_data.get('permalink', '')}",
                            "image_url": image_url,
                            "source": f"reddit_r/{sub}",
                        }
                    )
            except Exception as e:
                logger.error(f"Reddit r/{sub} xatosi: {e}")

        return results

    async def search_web(self, query: str = "AI news today") -> list[dict]:
        """Web qidiruv orqali kontent topish (DuckDuckGo)."""
        try:
            session = await self._get_session()
            url = "https://html.duckduckgo.com/html/"
            async with session.post(
                url,
                data={"q": query, "kl": "us-en"},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status != 200:
                    return []
                html = await resp.text()

            soup = BeautifulSoup(html, "html.parser")
            results = []

            for result in soup.select(".result")[:5]:
                title_tag = result.select_one(".result__title a")
                snippet_tag = result.select_one(".result__snippet")

                if title_tag:
                    title = title_tag.get_text(strip=True)
                    link = title_tag.get("href", "")
                    snippet = (
                        snippet_tag.get_text(strip=True)
                        if snippet_tag
                        else ""
                    )

                    results.append(
                        {
                            "title": title,
                            "text": snippet,
                            "url": link,
                            "image_url": None,
                            "source": "web_search",
                        }
                    )

            return results
        except Exception as e:
            logger.error(f"Web qidiruv xatosi: {e}")
            return []

    async def download_image(self, url: str, filename: str) -> str | None:
        """Rasmni yuklab olish."""
        try:
            session = await self._get_session()
            async with session.get(
                url, timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    return None
                content_type = resp.headers.get("Content-Type", "")
                if "image" not in content_type and "octet" not in content_type:
                    return None

                filepath = os.path.join(Config.MEDIA_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(await resp.read())
                return filepath
        except Exception as e:
            logger.error(f"Rasm yuklash xatosi: {e}")
            return None

    async def find_content(self) -> list[dict]:
        """Barcha manbalardan kontent qidirish."""
        all_content: list[dict] = []

        for source in Config.CONTENT_SOURCES:
            if source == "reddit_ai":
                items = await self.fetch_reddit()
            elif source in self.RSS_FEEDS:
                items = await self.fetch_rss_feed(source)
            else:
                items = await self.search_web(f"{source} AI artificial intelligence")
            all_content.extend(items)

        logger.info(f"Jami {len(all_content)} ta kontent topildi")
        return all_content
