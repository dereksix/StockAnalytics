'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: string;
}

export default function LatestNews() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          setNews((data.news || []).slice(0, 5));
        }
      } catch {
        // News is optional
      }
    }
    fetchNews();
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">Latest News</h3>
      <div className="space-y-2">
        {news.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-elevated transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                {item.headline}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{item.source}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
