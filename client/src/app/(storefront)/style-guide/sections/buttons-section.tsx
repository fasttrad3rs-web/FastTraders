'use client';

import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, Chip, StockBadge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, initialsOf } from '@/components/ui/avatar';
import { SectionHeading } from '@/components/ui/separator';

export function ButtonsSection(): JSX.Element {
  const [loading, setLoading] = useState(false);

  const demoLoading = (): void => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
  };

  return (
    <section id="buttons" className="scroll-mt-24">
      <SectionHeading title="Buttons, badges & avatars" />

      <div className="space-y-6 rounded-lg border border-border bg-white p-6">
        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Variants</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="cta">Add to Inquiry</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">
              <Trash2 />
              Delete
            </Button>
            <Button variant="link">Text link</Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Sizes</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              <Plus />
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            States
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button isLoading>Loading</Button>
            <Button variant="cta" isLoading={loading} loadingText="Adding…" onClick={demoLoading}>
              <Download />
              Click to load
            </Button>
            <Button variant="outline" block className="max-w-xs">
              Full width
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Badges</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="accent">New</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="muted">Muted</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Stock states
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status="in_stock" />
            <StockBadge status="low_stock" />
            <StockBadge status="out_of_stock" />
            <StockBadge status="on_order" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Filter chips
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Schneider Electric" onRemove={() => undefined} />
            <Chip label="Ready Stock" onRemove={() => undefined} />
            <Chip label="In stock" onRemove={() => undefined} />
            <Chip label="Read-only chip" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Avatars</p>
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initialsOf('Sharjeel Bin Ejaz')}</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>{initialsOf('Muhammad Imran')}</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>{initialsOf('Ayesha Khan')}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </section>
  );
}
