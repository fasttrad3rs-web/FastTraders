'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Checkbox, RadioGroup, RadioGroupItem, Switch } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionHeading } from '@/components/ui/separator';

export function FormsSection(): JSX.Element {
  const [range, setRange] = useState<[number, number]>([10, 250]);
  const [poles, setPoles] = useState('3p');

  return (
    <section id="forms" className="scroll-mt-24">
      <SectionHeading title="Form controls" description="Every control is keyboard-navigable and carries a visible focus ring at WCAG AA contrast." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-lg border border-border bg-white p-6">
          <Field label="Full name" htmlFor="sg-name" required>
            <Input id="sg-name" placeholder="Muhammad Imran" />
          </Field>

          <Field label="Search" htmlFor="sg-search" hint="Prefix-matches SKU and part number.">
            <Input id="sg-search" placeholder="SCH-CVS100F" leadingIcon={<Search />} />
          </Field>

          <Field label="Email" htmlFor="sg-email" error="Enter a valid email address">
            <Input id="sg-email" defaultValue="not-an-email" hasError />
          </Field>

          <Field label="Category" htmlFor="sg-cat">
            <Select defaultValue="mccb">
              <SelectTrigger id="sg-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcb">MCB</SelectItem>
                <SelectItem value="mccb">MCCB</SelectItem>
                <SelectItem value="acb">ACB</SelectItem>
                <SelectItem value="rccb">RCCB &amp; ELCB</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Requirements" htmlFor="sg-note" hint="Rating, poles, breaking capacity, quantity.">
            <Textarea id="sg-note" placeholder="Need 6 × 250A 3P MCCB, 36kA, for a new LT panel…" />
          </Field>

          <Field label="Disabled" htmlFor="sg-disabled">
            <Input id="sg-disabled" disabled defaultValue="Read only" />
          </Field>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-white p-6">
          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Checkboxes
            </p>
            <div className="space-y-2.5">
              {['In stock only', 'Featured products', 'Has datasheet'].map((label, index) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Checkbox id={`sg-cb-${index}`} defaultChecked={index === 0} />
                  <Label htmlFor={`sg-cb-${index}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
              <div className="flex items-center gap-2.5">
                <Checkbox id="sg-cb-ind" checked="indeterminate" />
                <Label htmlFor="sg-cb-ind" className="font-normal">
                  Indeterminate
                </Label>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Radio group — poles
            </p>
            <RadioGroup value={poles} onValueChange={setPoles}>
              {[
                { value: '1p', label: '1 Pole' },
                { value: '3p', label: '3 Pole' },
                { value: '4p', label: '4 Pole' },
              ].map((option) => (
                <div key={option.value} className="flex items-center gap-2.5">
                  <RadioGroupItem value={option.value} id={`sg-r-${option.value}`} />
                  <Label htmlFor={`sg-r-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Switches
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sg-sw1" className="font-normal">
                  Show quote-only products
                </Label>
                <Switch id="sg-sw1" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sg-sw2" className="font-normal">
                  Email me when new stock arrives
                </Label>
                <Switch id="sg-sw2" />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Quantity range
            </p>
            {/* A plain range slider. The price version went with the pivot —
                nothing on this site is priced, so it had nothing to filter. */}
            <Slider min={0} max={500} value={range} onValueChange={(next) => setRange(next as [number, number])} />
          </div>
        </div>
      </div>
    </section>
  );
}
