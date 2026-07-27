'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminSettings, useUpdateSettings } from '@/lib/api/admin-resources';
import type { ShippingRule } from '@/types';

/**
 * Store settings.
 *
 * Prefilled with Fast Traders' real details by the seeder; this screen is how
 * Sharjeel changes them without a developer. Shipping rules drive the delivery
 * charge the checkout applies, so the order matters: the first city match wins,
 * with `*` as the fallback.
 */
export default function AdminSettingsPage(): JSX.Element {
  const { data: settings, isPending } = useAdminSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [rules, setRules] = useState<ShippingRule[]>([]);

  useEffect(() => {
    if (!settings) return;
    setForm({
      storeName: settings.storeName,
      tagline: settings.tagline,
      email: settings.email,
      phone: settings.phone,
      landline: settings.landline ?? '',
      whatsapp: settings.whatsapp ?? '',
      address: settings.address,
      defaultTaxRate: settings.defaultTaxRate,
      announcementText: settings.announcement?.text ?? '',
      announcementLink: settings.announcement?.link ?? '',
      announcementActive: settings.announcement?.isActive ?? false,
      facebook: settings.social?.facebook ?? '',
      instagram: settings.social?.instagram ?? '',
      linkedin: settings.social?.linkedin ?? '',
      bankName: settings.bankDetails?.bankName ?? '',
      accountTitle: settings.bankDetails?.accountTitle ?? '',
      accountNumber: settings.bankDetails?.accountNumber ?? '',
      iban: settings.bankDetails?.iban ?? '',
    });
    setRules(settings.shippingRules ?? []);
  }, [settings]);

  const set = (key: string, value: unknown): void => setForm((current) => ({ ...current, [key]: value }));
  const text = (key: string): string => String(form[key] ?? '');

  const save = async (): Promise<void> => {
    try {
      await update.mutateAsync({
        storeName: text('storeName'),
        tagline: text('tagline'),
        email: text('email'),
        phone: text('phone'),
        ...(text('landline') ? { landline: text('landline') } : {}),
        ...(text('whatsapp') ? { whatsapp: text('whatsapp') } : {}),
        address: text('address'),
        defaultTaxRate: Number(form.defaultTaxRate ?? 18),
        social: {
          ...(text('facebook') ? { facebook: text('facebook') } : {}),
          ...(text('instagram') ? { instagram: text('instagram') } : {}),
          ...(text('linkedin') ? { linkedin: text('linkedin') } : {}),
        },
        shippingRules: rules,
        announcement: {
          ...(text('announcementText') ? { text: text('announcementText') } : {}),
          ...(text('announcementLink') ? { link: text('announcementLink') } : {}),
          isActive: form.announcementActive === true,
        },
        ...(text('bankName') && text('accountNumber')
          ? {
              bankDetails: {
                bankName: text('bankName'),
                accountTitle: text('accountTitle'),
                accountNumber: text('accountNumber'),
                ...(text('iban') ? { iban: text('iban') } : {}),
              },
            }
          : {}),
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  };

  if (isPending) {
    return (
      <>
        <PageHeader title="Settings" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store details, delivery charges and the announcement bar."
        actions={
          <Button variant="cta" size="sm" isLoading={update.isPending} onClick={() => void save()}>
            <Save />
            Save all
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-white p-5">
        <Tabs defaultValue="store">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="store">Store</TabsTrigger>
            <TabsTrigger value="shipping">Shipping &amp; tax</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="announcement">Announcement</TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name" htmlFor="st-name" required>
                <Input id="st-name" value={text('storeName')} onChange={(e) => set('storeName', e.target.value)} />
              </Field>
              <Field label="Tagline" htmlFor="st-tagline">
                <Input id="st-tagline" value={text('tagline')} onChange={(e) => set('tagline', e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="st-email" required>
                <Input id="st-email" type="email" value={text('email')} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Mobile / WhatsApp" htmlFor="st-phone" required>
                <Input id="st-phone" value={text('phone')} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Landline" htmlFor="st-landline">
                <Input id="st-landline" value={text('landline')} onChange={(e) => set('landline', e.target.value)} />
              </Field>
              <Field label="WhatsApp digits" htmlFor="st-wa" hint="No + or spaces, e.g. 923244234990.">
                <Input id="st-wa" value={text('whatsapp')} onChange={(e) => set('whatsapp', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" htmlFor="st-address" required>
                  <Textarea id="st-address" rows={2} value={text('address')} onChange={(e) => set('address', e.target.value)} />
                </Field>
              </div>
              {(['facebook', 'instagram', 'linkedin'] as const).map((key) => (
                <Field key={key} label={key} htmlFor={`st-${key}`} className="capitalize">
                  <Input id={`st-${key}`} type="url" value={text(key)} onChange={(e) => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shipping">
            <Field label="Default sales tax (%)" htmlFor="st-tax" hint="Applied to orders unless a product overrides it.">
              <Input
                id="st-tax"
                type="number"
                min={0}
                max={100}
                className="max-w-[140px]"
                value={String(form.defaultTaxRate ?? 18)}
                onChange={(e) => set('defaultTaxRate', Number(e.target.value))}
              />
            </Field>

            <p className="mb-2 mt-6 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Delivery zones
            </p>
            <Alert variant="info" className="mb-3 text-xs">
              Matched top to bottom — the first city match wins, and <code className="font-mono">*</code>{' '}
              is the fallback for everywhere else. Keep the wildcard last.
            </Alert>

            <ul className="space-y-2">
              {rules.map((rule, index) => (
                // eslint-disable-next-line react/no-array-index-key -- rules are positional
                <li key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
                  {([
                    ['label', 'Label', 'text'],
                    ['city', 'City or *', 'text'],
                    ['cost', 'Cost (Rs.)', 'number'],
                    ['freeAbove', 'Free above (Rs.)', 'number'],
                    ['etaDays', 'ETA', 'text'],
                  ] as const).map(([key, label, kind]) => (
                    <Input
                      key={key}
                      type={kind}
                      placeholder={label}
                      aria-label={`${label} for zone ${index + 1}`}
                      value={String(rule[key] ?? '')}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item, position) =>
                            position === index
                              ? { ...item, [key]: kind === 'number' ? Number(event.target.value) : event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  ))}
                  <div className="sm:col-span-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setRules((current) => current.filter((_, position) => position !== index))}
                    >
                      <Trash2 />
                      Remove zone
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                setRules((current) => [...current, { label: '', city: '', cost: 0, etaDays: '' }])
              }
            >
              <Plus />
              Add zone
            </Button>
          </TabsContent>

          <TabsContent value="payments">
            <Alert variant="info" className="mb-4 text-xs">
              COD, bank transfer and card are enabled. JazzCash and Easypaisa are wired as adapters
              on the server but not contracted, so the checkout shows them disabled.
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['bankName', 'Bank name'],
                ['accountTitle', 'Account title'],
                ['accountNumber', 'Account number'],
                ['iban', 'IBAN'],
              ] as const).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`st-${key}`}>
                  <Input id={`st-${key}`} value={text(key)} onChange={(e) => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
            <p className="mt-3 text-2xs text-muted-foreground">
              These appear at checkout when a customer picks bank transfer, and on the PDF invoice.
            </p>
          </TabsContent>

          <TabsContent value="announcement">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="st-ann"
                  checked={form.announcementActive === true}
                  onCheckedChange={(checked) => set('announcementActive', checked === true)}
                />
                <Label htmlFor="st-ann" className="font-normal">
                  Show the announcement bar at the top of every page
                </Label>
              </div>
              <Field label="Message" htmlFor="st-ann-text">
                <Input id="st-ann-text" maxLength={200} value={text('announcementText')} onChange={(e) => set('announcementText', e.target.value)} />
              </Field>
              <Field label="Link" htmlFor="st-ann-link" hint="Optional — where the bar links to.">
                <Input id="st-ann-link" value={text('announcementLink')} onChange={(e) => set('announcementLink', e.target.value)} />
              </Field>

              {form.announcementActive === true && text('announcementText') ? (
                <div className="rounded-lg border border-border">
                  <p className="border-b border-border bg-surface px-3 py-1.5 text-2xs font-bold uppercase text-muted-foreground">
                    Preview
                  </p>
                  <div className="bg-brand-cyan px-4 py-2 text-center text-xs font-medium text-white">
                    {text('announcementText')}
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
