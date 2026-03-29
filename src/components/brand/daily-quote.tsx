'use client';

import { useEffect, useState } from 'react';

const QUOTES = [
  { text: 'You don\u2019t have to love your job to be strategic about it.', author: null },
  { text: 'Quiet progress is still progress.', author: null },
  { text: 'The best career moves are the ones nobody sees coming.', author: null },
  { text: 'You\u2019re not stuck. You\u2019re gathering data.', author: null },
  { text: 'Today doesn\u2019t have to be great. It just has to be documented.', author: null },
  { text: 'The person who tracks their work controls the narrative.', author: null },
  { text: 'Patience is a competitive advantage.', author: null },
  { text: 'You don\u2019t need permission to know your own value.', author: null },
  { text: 'The exit plan is not about quitting. It\u2019s about choosing.', author: null },
  { text: 'Small moves, consistently made, change everything.', author: null },
  { text: 'Your career is the longest project you\u2019ll ever manage.', author: null },
  { text: 'Nobody else is tracking your contributions. That\u2019s on you.', author: null },
  { text: 'Rest is not laziness. It\u2019s strategy.', author: null },
  { text: 'You are one conversation away from a different trajectory.', author: null },
  { text: 'The data doesn\u2019t lie. Even when your feelings do.', author: null },
  { text: 'Burnout is a signal, not a failure.', author: null },
  { text: 'Your runway is your freedom. Every dollar extends it.', author: null },
  { text: 'The meeting is in an hour. You\u2019re already prepared.', author: null },
  { text: 'Don\u2019t perform productivity. Track impact.', author: null },
  { text: 'A clear record beats a good memory every time.', author: null },
  { text: 'You\u2019ve done more than you think. The proof is here.', author: null },
  { text: 'The difference between employed and empowered is information.', author: null },
  { text: 'Not every week is a good week. But every week is data.', author: null },
  { text: 'Control what you can. Document the rest.', author: null },
  { text: 'The best time to update your resume is when you don\u2019t need to.', author: null },
  { text: 'Your work speaks. But only if you write it down.', author: null },
  { text: 'Career security isn\u2019t about being indispensable. It\u2019s about being portable.', author: null },
  { text: 'Today is one entry closer to knowing your pattern.', author: null },
  { text: 'The people who get promoted are the ones who can articulate what they did.', author: null },
  { text: 'You\u2019re building a file that future-you will be grateful for.', author: null },
];

interface DailyQuoteProps {
  onComplete: () => void;
}

export function DailyQuote({ onComplete }: DailyQuoteProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  // Pick quote based on day of year (deterministic per day)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  useEffect(() => {
    // Fade in
    const showTimer = setTimeout(() => setVisible(true), 100);

    // Start fade out after 4.2 seconds
    const fadeTimer = setTimeout(() => setFading(true), 4200);

    // Complete after fade out (5 seconds total)
    const completeTimer = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={() => {
        setFading(true);
        setTimeout(onComplete, 400);
      }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-bg-primary">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(201, 168, 76, 0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(124, 139, 158, 0.03) 0%, transparent 60%)',
            animation: 'pulse-gentle 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Quote */}
      <div
        className="relative z-10 max-w-lg px-8 text-center"
        style={{
          opacity: fading ? 0 : visible ? 1 : 0,
          transform: fading
            ? 'translateY(-8px)'
            : visible
              ? 'translateY(0)'
              : 'translateY(8px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <p className="text-xl md:text-2xl font-light text-text-primary leading-relaxed tracking-tight">
          &ldquo;{quote.text}&rdquo;
        </p>
        {quote.author && (
          <p className="text-sm text-text-tertiary mt-4">\u2014 {quote.author}</p>
        )}
      </div>

      {/* Tap hint */}
      <div
        className="absolute bottom-12 text-[11px] text-text-tertiary/40 tracking-wider"
        style={{
          opacity: visible && !fading ? 1 : 0,
          transition: 'opacity 1s ease 1.5s',
        }}
      >
        tap anywhere
      </div>
    </div>
  );
}
