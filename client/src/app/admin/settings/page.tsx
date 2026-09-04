'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
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

/**
 * Store settings.
 *
 * Prefilled with Fast Traders' real details by the seeder; this screen is how
 * Sharjeel changes them without a developer.
 *
 * There are no delivery zones or tax rates here. The site quotes nothing and
 * charges nothing — delivery is agreed on the phone along with the price, and
 * varies by what is being sent and where. A shipping table on this screen was
 * a leftover from the commerce build and would have implied a fixed charge the
 * business does not have.
 */
export default function AdminSettingsPage(): JSX.Element {
  const { data: settings, isPending } = useAdminSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Record<string, unknown>>({});

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
  }, [settings]);

  const set = (key: string, value: unknown): void => setForm((current) => ({ ...current, [key]: value }));
  const text = (key: string): string => String(form[key] ?? '');
  /** An optional field's value, or `null` to remove it. Never `''`. */
  const blank = (key: string): string | null => text(key) || null;

  const save = async (): Promise<void> => {
    try {
      await update.mutateAsync({
        storeName: text('storeName'),
        tagline: text('tagline'),
        email: text('email'),
        phone: text('phone'),
        address: text('address'),
        /*
         * `null` for a cleared box, never omitted. Omitting is what a PATCH
         * reads as "leave it alone", so the old landline came straight back
         * and the toast still said "Settings saved". `blank()` is deliberately
         * used on every optional field rather than a chosen few — the next
         * field added here inherits the right behaviour by default.
         */
        landline: blank('landline'),
        whatsapp: blank('whatsapp'),
        social: {
          facebook: blank('facebook'),
          instagram: blank('instagram'),
          linkedin: blank('linkedin'),
        },
        announcement: {
          text: blank('announcementText'),
          link: blank('announcementLink'),
          isActive: form.announcementActive === true,
        },
        /*
         * All-or-nothing, and explicitly `null` when emptied. These details go
         * out on quotations; a half-cleared bank block is worse than either a
         * complete one or none at all.
         */
        bankDetails:
          text('bankName') && text('accountNumber')
            ? {
                bankName: text('bankName'),
                accountTitle: text('accountTitle'),
                accountNumber: text('accountNumber'),
                iban: blank('iban'),
              }
            : null,
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
        description="Contact details, bank details and the announcement bar."
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
            <TabsTrigger value="payments">Bank details</TabsTrigger>
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

          <TabsContent value="payments">
            <Alert variant="info" className="mb-4 text-xs">
              Nothing is paid through the website. These details go out with a quote so a
              customer who accepts can settle by transfer.
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
              Sent to customers with a quote. A bank switch should not need a deploy.
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
