'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { useAddresses, useAddressMutations } from '@/lib/api/account';
import { addressFields } from '@/lib/forms';
import { PROVINCES } from '@/types/user.types';
import type { Address } from '@/types';

/** Address book. Max eight, exactly one default — both enforced server-side. */
export default function AddressesPage(): JSX.Element {
  const { data: addresses, isPending } = useAddresses();
  const mutations = useAddressMutations();
  const [adding, setAdding] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Address>({
    resolver: zodResolver(addressFields),
    defaultValues: { label: 'Delivery', province: 'Punjab', isDefault: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutations.add.mutateAsync(values);
      reset();
      setAdding(false);
      toast.success('Address saved');
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
          Addresses
        </h1>
        {!adding ? (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus />
            Add address
          </Button>
        ) : null}
      </div>

      {adding ? (
        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4 rounded-lg border border-border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" htmlFor="ad-label" hint="Office, warehouse, site…">
              <Input id="ad-label" {...register('label')} />
            </Field>
            <Field label="Address line 1" htmlFor="ad-line1" required error={errors.line1?.message}>
              <Input id="ad-line1" {...register('line1')} hasError={Boolean(errors.line1)} />
            </Field>
            <Field label="Address line 2" htmlFor="ad-line2">
              <Input id="ad-line2" {...register('line2')} />
            </Field>
            <Field label="City" htmlFor="ad-city" required error={errors.city?.message}>
              <Input id="ad-city" {...register('city')} hasError={Boolean(errors.city)} />
            </Field>
            <Field label="Province" htmlFor="ad-province" required>
              <Select value={watch('province')} onValueChange={(value) => setValue('province', value as Address['province'])}>
                <SelectTrigger id="ad-province">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Postal code" htmlFor="ad-postal">
              <Input id="ad-postal" {...register('postalCode')} />
            </Field>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="ad-default"
              checked={watch('isDefault')}
              onCheckedChange={(checked) => setValue('isDefault', checked === true)}
            />
            <Label htmlFor="ad-default" className="font-normal">
              Use as my default address
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="cta" isLoading={mutations.add.isPending}>
              Save address
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setAdding(false); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {isPending ? (
        <Skeleton className="mt-5 h-32 w-full" />
      ) : !addresses || addresses.length === 0 ? (
        !adding ? (
          <EmptyState
            className="mt-5"
            title="No saved addresses"
            description="Save an address to speed up checkout next time."
            icon={<MapPin />}
          />
        ) : null
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {addresses.map((address, index) => (
            <li key={`${address.line1}-${index}`} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
                    {address.label}
                    {address.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded bg-brand-cyan/10 px-1.5 py-0.5 text-2xs font-bold uppercase text-brand-cyan">
                        <Star className="size-2.5" aria-hidden />
                        Default
                      </span>
                    ) : null}
                  </p>
                  <address className="mt-1.5 text-sm not-italic text-muted-foreground">
                    {address.line1}
                    {address.line2 ? <>, {address.line2}</> : null}
                    <br />
                    {address.city}, {address.province}
                    {address.postalCode ? ` ${address.postalCode}` : ''}
                  </address>
                </div>

                <button
                  type="button"
                  onClick={() => mutations.remove.mutate(index)}
                  aria-label={`Delete ${address.label}`}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {!address.isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => mutations.update.mutate({ index, patch: { isDefault: true } })}
                >
                  Make default
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
