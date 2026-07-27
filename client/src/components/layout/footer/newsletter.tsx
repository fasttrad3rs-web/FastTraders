'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

/**
 * Newsletter signup.
 * Wired to `POST /newsletter` in Phase 6; here it validates and reports
 * optimistically so the interaction can be reviewed.
 */
export function NewsletterSignup(): JSX.Element {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }

    setIsLoading(true);
    // Placeholder for the real mutation.
    setTimeout(() => {
      setIsLoading(false);
      setEmail('');
      toast.success('Subscribed', { description: 'You will hear from us when new stock lands.' });
    }, 600);
  };

  return (
    <div className="border-y border-white/10 bg-white/[0.03]">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 lg:flex-row">
        <div className="text-center lg:text-left">
          <p className="font-heading text-base font-bold uppercase tracking-tight text-white">
            New stock &amp; price updates
          </p>
          <p className="mt-1 text-sm text-white/60">
            Occasional emails about new arrivals and trade offers. No spam.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            aria-label="Email address for the newsletter"
            required
            className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-brand-cyan"
          />
          <Button type="submit" variant="cta" size="lg" isLoading={isLoading} loadingText="Sending">
            <Send />
            Subscribe
          </Button>
        </form>
      </div>
    </div>
  );
}
