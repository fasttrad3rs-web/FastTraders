# Fast Traders — Phase 6B source dump
Cart, inquiry, RFQ, checkout, orders, account, auth and static pages.
Total files: 44

---

## `client/src/lib/forms.ts`

```ts
import { z } from 'zod';
import { PROVINCES } from '@/types/user.types';

/**
 * Shared form schemas.
 *
 * These mirror the server validators from Phase 3 so the client rejects bad
 * input before a round trip — but the server remains authoritative.
 */

export const emailField = z.string().trim().toLowerCase().email('Enter a valid email address');

/** Pakistani mobile or landline: +92, 0092, leading 0, or bare. */
export const phoneField = z
  .string()
  .trim()
  .regex(/^(?:\+92|0092|92|0)?\d{9,11}$/, 'Enter a valid Pakistani phone number');

export const nameField = z.string().trim().min(2, 'Name is too short').max(120);

export const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Must contain a letter')
  .regex(/\d/, 'Must contain a number');

export const addressFields = z.object({
  label: z.string().trim().max(40).default('Delivery'),
  line1: z.string().trim().min(3, 'Address is too short').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required').max(80),
  province: z.enum(PROVINCES, { required_error: 'Select a province' }),
  postalCode: z.string().trim().max(10).optional(),
  isDefault: z.boolean().default(false),
});

export const customerFields = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  companyName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
});

/* --------------------------------- RFQ ----------------------------------- */

export const rfqSchema = z.object({
  customer: customerFields,
  message: z.string().trim().max(2000).optional(),
  requiredBy: z
    .string()
    .optional()
    .refine(
      (value) => !value || new Date(value).getTime() > Date.now(),
      'Required-by date must be in the future',
    ),
});
export type RfqInput = z.infer<typeof rfqSchema>;

/* ------------------------------- Checkout -------------------------------- */

export const checkoutSchema = z
  .object({
    customer: customerFields,
    shippingAddress: addressFields,
    billingAddress: addressFields.optional(),
    sameAsBilling: z.boolean().default(true),
    paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']),
    couponCode: z.string().trim().toUpperCase().max(32).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.sameAsBilling || data.billingAddress !== undefined, {
    message: 'A billing address is required when it differs from shipping',
    path: ['billingAddress'],
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* --------------------------------- Auth ---------------------------------- */

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  password: passwordField,
  companyName: z.string().trim().max(160).optional(),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirm: z.string(),
  })
  .refine((data) => data.newPassword === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export const profileSchema = z.object({
  name: nameField,
  phone: phoneField,
  companyName: z.string().trim().max(160).optional(),
  ntn: z
    .string()
    .trim()
    .regex(/^\d{7}-?\d$|^\d{13}$/, 'Enter a valid NTN or CNIC')
    .optional()
    .or(z.literal('')),
});

/* -------------------------------- Contact -------------------------------- */

export const contactSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField.optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Subject is too short').max(200),
  message: z.string().trim().min(10, 'Please add a little more detail').max(4000),
  /** Honeypot — must stay empty. */
  website: z.string().max(0).optional(),
});

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^FT-\d{6}-\d{4,}$/, 'Order numbers look like FT-202607-0001'),
  email: emailField,
});
```

## `client/src/lib/api/cart.types.ts`

```ts
/** Hydrated cart shapes returned by `/cart` and `/inquiry`. */

export interface HydratedCartLine {
  product: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
  unit: string;
  qty: number;
  minOrderQty: number;
  variant?: string;
  note?: string;
  price?: number;
  priceAtAdd?: number;
  priceChanged: boolean;
  subtotal?: number;
  stock: number;
  inStock: boolean;
  isAvailable: boolean;
}

export interface CartSummary {
  type: 'shopping' | 'inquiry';
  items: HydratedCartLine[];
  itemCount: number;
  lineCount: number;
  subtotal: number;
  taxAmount: number;
  estimatedTotal: number;
  hasIssues: boolean;
}

export interface OrderSummaryLine {
  product: string;
  name: string;
  sku: string;
  image?: string;
  price: number;
  qty: number;
  unit: string;
  subtotal: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  items: OrderSummaryLine[];
  customer: { name: string; email: string; phone: string; companyName?: string };
  shippingAddress: Record<string, string | boolean | undefined>;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  statusHistory: { status: string; note?: string; at: string }[];
  trackingNumber?: string;
  courier?: string;
  createdAt: string;
}

export interface QuotationResponse {
  id: string;
  quoteNumber: string;
  customer: { name: string; email: string; phone: string; companyName?: string; city?: string };
  items: {
    product: string;
    name: string;
    sku: string;
    qty: number;
    unit: string;
    customerNote?: string;
    quotedUnitPrice?: number;
    quotedTotal?: number;
  }[];
  message?: string;
  requiredBy?: string;
  status: string;
  quotedSubtotal?: number;
  quotedTax?: number;
  quotedTotal?: number;
  validUntil?: string;
  createdAt: string;
}
```

## `client/src/lib/api/mutations.ts`

```ts
'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { CartSummary, OrderResponse, QuotationResponse } from './cart.types';

/**
 * Client mutations and user-scoped queries.
 *
 * The server owns both carts (Phase 3 persists them against a user or a guest
 * `ft_session_id` cookie), so these hooks are the source of truth and the
 * Zustand store is only a fast-render mirror.
 */

export const cartKeys = {
  shopping: ['cart', 'shopping'] as const,
  inquiry: ['cart', 'inquiry'] as const,
  orders: ['account', 'orders'] as const,
  quotations: ['account', 'quotations'] as const,
  me: ['auth', 'me'] as const,
};

type CartKind = 'shopping' | 'inquiry';
const basePath = (kind: CartKind): string => (kind === 'shopping' ? '/cart' : '/inquiry');
const keyFor = (kind: CartKind): readonly string[] => (kind === 'shopping' ? cartKeys.shopping : cartKeys.inquiry);

export function useCart(kind: CartKind): UseQueryResult<CartSummary> {
  return useQuery({
    queryKey: keyFor(kind),
    queryFn: async () => unwrap(await apiClient.get<CartSummary>(`${basePath(kind)}/items`)),
    staleTime: 0,
  });
}

export interface CartMutationApi {
  add: UseMutationResult<CartSummary, Error, { product: string; qty: number; note?: string }>;
  update: UseMutationResult<CartSummary, Error, { productId: string; qty?: number; note?: string }>;
  remove: UseMutationResult<CartSummary, Error, string>;
  clear: UseMutationResult<CartSummary, Error, void>;
}

export function useCartMutations(kind: CartKind): CartMutationApi {
  const queryClient = useQueryClient();
  const key = keyFor(kind);
  const path = basePath(kind);

  // Every mutation returns the freshly hydrated cart, so we seed the cache
  // directly instead of triggering a second round trip.
  const onSuccess = (data: CartSummary): void => {
    queryClient.setQueryData(key, data);
  };

  return {
    add: useMutation({
      mutationFn: async (input) => unwrap(await apiClient.post<CartSummary>(`${path}/items`, input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: async ({ productId, ...patch }) =>
        unwrap(await apiClient.patch<CartSummary>(`${path}/items/${productId}`, patch)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (productId) =>
        unwrap(await apiClient.delete<CartSummary>(`${path}/items/${productId}`)),
      onSuccess,
    }),
    clear: useMutation({
      mutationFn: async () => unwrap(await apiClient.delete<CartSummary>(`${path}/items`)),
      onSuccess,
    }),
  };
}

/* -------------------------------- Orders --------------------------------- */

export function useCreateOrder(): UseMutationResult<OrderResponse, Error, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.post<OrderResponse>('/orders', input)),
    onSuccess: () => {
      // The server empties the cart on success; drop our copy too.
      queryClient.removeQueries({ queryKey: cartKeys.shopping });
      void queryClient.invalidateQueries({ queryKey: cartKeys.orders });
    },
  });
}

export function useCreateQuotation(): UseMutationResult<
  QuotationResponse,
  Error,
  Record<string, unknown>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.post<QuotationResponse>('/quotations', input)),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: cartKeys.inquiry });
      void queryClient.invalidateQueries({ queryKey: cartKeys.quotations });
    },
  });
}

export function useRespondToQuotation(): UseMutationResult<
  QuotationResponse,
  Error,
  { id: string; action: 'accept' | 'reject' | 'counter'; message?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) =>
      unwrap(await apiClient.post<QuotationResponse>(`/quotations/${id}/respond`, body)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cartKeys.quotations }),
  });
}

/** Guest order lookup — number plus the email used at checkout. */
export function useTrackOrder(): UseMutationResult<
  OrderResponse,
  Error,
  { orderNumber: string; email: string }
> {
  return useMutation({
    mutationFn: async ({ orderNumber, email }) =>
      unwrap(await apiClient.get<OrderResponse>(`/orders/${orderNumber}`, { params: { email } })),
  });
}
```

## `client/src/lib/api/account.ts`

```ts
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { OrderResponse, QuotationResponse } from './cart.types';
import type { Address, User } from '@/types';

/** Account-scoped queries and mutations. Never cached beyond the session. */

export const accountKeys = {
  me: ['account', 'me'] as const,
  orders: (page: number) => ['account', 'orders', page] as const,
  order: (orderNumber: string) => ['account', 'order', orderNumber] as const,
  quotations: (page: number) => ['account', 'quotations', page] as const,
  quotation: (quoteNumber: string) => ['account', 'quotation', quoteNumber] as const,
  addresses: ['account', 'addresses'] as const,
};

interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export function useMyOrders(page = 1): UseQueryResult<Paged<OrderResponse>> {
  return useQuery({
    queryKey: accountKeys.orders(page),
    queryFn: async () =>
      unwrap(await apiClient.get<Paged<OrderResponse>>('/orders/my', { params: { page, limit: 10 } })),
  });
}

export function useOrder(orderNumber: string): UseQueryResult<OrderResponse> {
  return useQuery({
    queryKey: accountKeys.order(orderNumber),
    queryFn: async () => unwrap(await apiClient.get<OrderResponse>(`/orders/${orderNumber}`)),
    enabled: orderNumber.length > 0,
  });
}

export function useMyQuotations(page = 1): UseQueryResult<Paged<QuotationResponse>> {
  return useQuery({
    queryKey: accountKeys.quotations(page),
    queryFn: async () =>
      unwrap(
        await apiClient.get<Paged<QuotationResponse>>('/quotations/my', { params: { page, limit: 10 } }),
      ),
  });
}

export function useQuotation(quoteNumber: string): UseQueryResult<QuotationResponse> {
  return useQuery({
    queryKey: accountKeys.quotation(quoteNumber),
    queryFn: async () => unwrap(await apiClient.get<QuotationResponse>(`/quotations/${quoteNumber}`)),
    enabled: quoteNumber.length > 0,
  });
}

export function useAddresses(): UseQueryResult<Address[]> {
  return useQuery({
    queryKey: accountKeys.addresses,
    queryFn: async () => unwrap(await apiClient.get<Address[]>('/auth/me/addresses')),
  });
}

export function useAddressMutations(): {
  add: UseMutationResult<Address[], Error, Address>;
  update: UseMutationResult<Address[], Error, { index: number; patch: Partial<Address> }>;
  remove: UseMutationResult<Address[], Error, number>;
} {
  const queryClient = useQueryClient();
  const onSuccess = (data: Address[]): void => {
    queryClient.setQueryData(accountKeys.addresses, data);
  };

  return {
    add: useMutation({
      mutationFn: async (address) => unwrap(await apiClient.post<Address[]>('/auth/me/addresses', address)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: async ({ index, patch }) =>
        unwrap(await apiClient.patch<Address[]>(`/auth/me/addresses/${index}`, patch)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (index) => unwrap(await apiClient.delete<Address[]>(`/auth/me/addresses/${index}`)),
      onSuccess,
    }),
  };
}

export function useUpdateProfile(): UseMutationResult<User, Error, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.patch<User>('/auth/me', input)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: accountKeys.me }),
  });
}

export function useChangePassword(): UseMutationResult<
  { accessToken: string },
  Error,
  { currentPassword: string; newPassword: string }
> {
  return useMutation({
    mutationFn: async (input) =>
      unwrap(await apiClient.patch<{ accessToken: string }>('/auth/me/password', input)),
  });
}
```

## `client/src/components/cart/cart-lines.tsx`

```tsx
'use client';

import Link from 'next/link';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { QuantityStepper } from '@/components/ui/commerce';
import { Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/product/product-image';
import { formatPKR } from '@/lib/utils';
import type { CartMutationApi } from '@/lib/api/mutations';
import type { HydratedCartLine } from '@/lib/api/cart.types';

/**
 * Shared line-item list for both carts.
 *
 * `showNote` is the only real difference: an inquiry line carries a free-text
 * requirement ("3P, 36 kA, needed by the 20th") that becomes the RFQ line note.
 */
export function CartLines({
  items,
  mutations,
  showNote,
  showPrice,
}: {
  items: HydratedCartLine[];
  mutations: CartMutationApi;
  showNote?: boolean;
  showPrice?: boolean;
}): JSX.Element {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-white">
      {items.map((line) => (
        <li key={`${line.product}-${line.variant ?? ''}`} className="p-4">
          <div className="flex gap-4">
            <Link href={`/products/${line.slug}`} className="shrink-0">
              <ProductImage
                image={
                  line.image
                    ? { url: line.image, publicId: 'cart', alt: line.name, isPrimary: true }
                    : undefined
                }
                sku={line.sku}
                sizes="96px"
                className="size-24 rounded-md border border-border"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.slug}`}
                    className="line-clamp-2 text-sm font-semibold text-foreground hover:text-brand-cyan"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{line.sku}</p>
                </div>

                <button
                  type="button"
                  onClick={() => mutations.remove.mutate(line.product)}
                  disabled={mutations.remove.isPending}
                  aria-label={`Remove ${line.name}`}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {!line.isAvailable ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  {line.stock <= 0 ? 'Out of stock' : `Only ${line.stock} available`}
                </p>
              ) : null}

              {line.priceChanged ? (
                <p className="mt-2 text-xs font-medium text-warning">
                  Price has changed since you added this item.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <QuantityStepper
                  value={line.qty}
                  min={line.minOrderQty}
                  max={showPrice ? Math.max(line.stock, line.minOrderQty) : 9999}
                  unit={line.unit}
                  disabled={mutations.update.isPending}
                  onChange={(qty) => mutations.update.mutate({ productId: line.product, qty })}
                />

                {showPrice ? (
                  <div className="text-right">
                    <p className="font-heading text-base font-bold tabular-nums text-brand-navy">
                      {typeof line.subtotal === 'number' ? formatPKR(line.subtotal) : '—'}
                    </p>
                    {typeof line.price === 'number' ? (
                      <p className="text-2xs text-muted-foreground">
                        {formatPKR(line.price)} / {line.unit}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {showNote ? (
                <div className="mt-3">
                  <label
                    htmlFor={`note-${line.product}`}
                    className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Requirements for this line
                  </label>
                  <Textarea
                    id={`note-${line.product}`}
                    defaultValue={line.note ?? ''}
                    placeholder="Rating, poles, breaking capacity, delivery date…"
                    className="mt-1 min-h-[60px] text-sm"
                    onBlur={(event) => {
                      if (event.target.value !== (line.note ?? '')) {
                        mutations.update.mutate({ productId: line.product, note: event.target.value });
                      }
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}

      <li className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutations.clear.mutate()}
          isLoading={mutations.clear.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
          Empty this list
        </Button>
      </li>
    </ul>
  );
}
```

## `client/src/components/checkout/order-summary.tsx`

```tsx
import Link from 'next/link';
import { formatPKR } from '@/lib/utils';
import type { CartSummary } from '@/lib/api/cart.types';

/**
 * Checkout sidebar.
 *
 * Delivery and coupon are marked "calculated at checkout" until the server
 * prices the order — those figures come from Settings shipping rules and the
 * coupon record, never from the client.
 */
export function OrderSummary({
  cart,
  shippingLabel,
}: {
  cart: CartSummary;
  shippingLabel?: string;
}): JSX.Element {
  return (
    <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
      <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        Order summary
      </h2>

      <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
        {cart.items.map((line) => (
          <li key={line.product} className="flex gap-3 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-brand-navy text-2xs font-bold text-white">
              {line.qty}
            </span>
            <span className="min-w-0 flex-1">
              <Link href={`/products/${line.slug}`} className="line-clamp-2 hover:text-brand-cyan">
                {line.name}
              </Link>
              <span className="block font-mono text-2xs text-muted-foreground">{line.sku}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {typeof line.subtotal === 'number' ? formatPKR(line.subtotal) : '—'}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-semibold tabular-nums">{formatPKR(cart.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Sales tax</dt>
          <dd className="font-semibold tabular-nums">{formatPKR(cart.taxAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="text-xs text-muted-foreground">{shippingLabel ?? 'Calculated on review'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-between border-t border-border pt-4">
        <span className="font-heading font-bold text-brand-navy">Estimated total</span>
        <span className="font-heading text-lg font-bold tabular-nums text-brand-navy">
          {formatPKR(cart.estimatedTotal)}
        </span>
      </div>

      <p className="mt-3 text-2xs text-muted-foreground">
        Final delivery charge and any discount are confirmed by our system when the order is placed.
      </p>
    </aside>
  );
}
```

## `client/src/components/checkout/payment-methods.tsx`

```tsx
'use client';

import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import type { Setting } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Payment selection.
 *
 * COD and bank transfer are what most Pakistani B2B customers actually use, so
 * they lead. Card is live via Stripe; JazzCash and Easypaisa are wired as
 * adapters on the server but not yet contracted, so they are shown disabled
 * rather than hidden — the client asked for them and customers look for them.
 */

export type PaymentMethod = 'cod' | 'bank_transfer' | 'stripe' | 'jazzcash' | 'easypaisa';

const METHODS: {
  value: PaymentMethod;
  label: string;
  body: string;
  Icon: typeof Banknote;
  disabled?: boolean;
}[] = [
  { value: 'cod', label: 'Cash on Delivery', body: 'Pay the courier or at our counter.', Icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', body: 'Transfer and send us the receipt.', Icon: Landmark },
  { value: 'stripe', label: 'Card', body: 'Visa or Mastercard, processed by Stripe.', Icon: CreditCard },
  { value: 'jazzcash', label: 'JazzCash', body: 'Coming soon — use COD or bank transfer.', Icon: Smartphone, disabled: true },
  { value: 'easypaisa', label: 'Easypaisa', body: 'Coming soon — use COD or bank transfer.', Icon: Smartphone, disabled: true },
];

export function PaymentMethods({
  value,
  onChange,
  settings,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  settings: Setting | null;
}): JSX.Element {
  const bank = settings?.bankDetails;

  return (
    <div className="space-y-3">
      <RadioGroup value={value} onValueChange={(next) => onChange(next as PaymentMethod)}>
        {METHODS.map(({ value: method, label, body, Icon, disabled }) => (
          <label
            key={method}
            htmlFor={`pay-${method}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
              disabled && 'cursor-not-allowed opacity-55',
              value === method ? 'border-brand-cyan bg-brand-cyan/5' : 'border-border bg-white hover:border-brand-navy/40',
            )}
          >
            <RadioGroupItem value={method} id={`pay-${method}`} disabled={disabled} className="mt-0.5" />
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-navy" aria-hidden />
            <span className="min-w-0">
              <Label htmlFor={`pay-${method}`} className="cursor-pointer">
                {label}
              </Label>
              <span className="mt-0.5 block text-xs text-muted-foreground">{body}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {value === 'bank_transfer' ? (
        bank ? (
          <Alert variant="info" title="Transfer to">
            <dl className="mt-1 space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Bank</dt>
                <dd className="font-medium text-foreground">{bank.bankName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Account title</dt>
                <dd className="font-medium text-foreground">{bank.accountTitle}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Account no.</dt>
                <dd className="font-mono font-medium text-foreground">{bank.accountNumber}</dd>
              </div>
              {bank.iban ? (
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">IBAN</dt>
                  <dd className="font-mono font-medium text-foreground">{bank.iban}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-2 text-xs">
              Quote your order number on the transfer and WhatsApp the receipt to +92 324 4234990.
            </p>
          </Alert>
        ) : (
          <Alert variant="warning" title="Bank details not published yet">
            Place the order and we will send the account details with your confirmation email.
          </Alert>
        )
      ) : null}

      {value === 'stripe' ? (
        <Alert variant="info">
          You will be redirected to Stripe&rsquo;s secure page to pay after the order is placed. We
          never see or store your card number.
        </Alert>
      ) : null}
    </div>
  );
}
```

## `client/src/components/checkout/steps.tsx`

```tsx
'use client';

import Link from 'next/link';
import type { UseFormReturn } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVINCES } from '@/types/user.types';
import type { CheckoutInput } from '@/lib/forms';
import type { Setting } from '@/types';
import { PaymentMethods, type PaymentMethod } from './payment-methods';

/**
 * Checkout steps 1–3. The review step stays in the page, next to the submit
 * button, so the form's own state does not have to cross another boundary.
 */
export function CheckoutSteps({
  step,
  form,
  isSignedIn,
  settings,
}: {
  step: number;
  form: UseFormReturn<CheckoutInput>;
  isSignedIn: boolean;
  settings: Setting | null;
}): JSX.Element | null {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;

  if (step === 0) {
    return (
      <fieldset className="space-y-4">
        <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Contact details
        </legend>

        {!isSignedIn ? (
          <Alert variant="info" className="text-xs">
            Checking out as a guest.{' '}
            <Link href="/login?next=/checkout" className="font-medium">
              Sign in
            </Link>{' '}
            to save this order to your account.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="co-name" required error={errors.customer?.name?.message}>
            <Input id="co-name" {...register('customer.name')} hasError={Boolean(errors.customer?.name)} />
          </Field>
          <Field label="Company" htmlFor="co-company">
            <Input id="co-company" {...register('customer.companyName')} />
          </Field>
          <Field label="Email" htmlFor="co-email" required error={errors.customer?.email?.message}>
            <Input
              id="co-email"
              type="email"
              {...register('customer.email')}
              hasError={Boolean(errors.customer?.email)}
            />
          </Field>
          <Field label="Phone" htmlFor="co-phone" required error={errors.customer?.phone?.message}>
            <Input
              id="co-phone"
              type="tel"
              placeholder="0300 1234567"
              {...register('customer.phone')}
              hasError={Boolean(errors.customer?.phone)}
            />
          </Field>
        </div>
      </fieldset>
    );
  }

  if (step === 1) {
    return (
      <fieldset className="space-y-4">
        <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Delivery address
        </legend>

        <Field label="Address line 1" htmlFor="co-line1" required error={errors.shippingAddress?.line1?.message}>
          <Input
            id="co-line1"
            {...register('shippingAddress.line1')}
            hasError={Boolean(errors.shippingAddress?.line1)}
          />
        </Field>

        <Field label="Address line 2" htmlFor="co-line2">
          <Input id="co-line2" {...register('shippingAddress.line2')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="co-city" required error={errors.shippingAddress?.city?.message}>
            <Input
              id="co-city"
              placeholder="Lahore"
              {...register('shippingAddress.city')}
              hasError={Boolean(errors.shippingAddress?.city)}
            />
          </Field>

          <Field label="Province" htmlFor="co-province" required error={errors.shippingAddress?.province?.message}>
            <Select
              value={watch('shippingAddress.province')}
              onValueChange={(value) =>
                setValue('shippingAddress.province', value as (typeof PROVINCES)[number])
              }
            >
              <SelectTrigger id="co-province">
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

          <Field label="Postal code" htmlFor="co-postal">
            <Input id="co-postal" {...register('shippingAddress.postalCode')} />
          </Field>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Checkbox
            id="co-same"
            checked={watch('sameAsBilling')}
            onCheckedChange={(checked) => setValue('sameAsBilling', checked === true)}
          />
          <Label htmlFor="co-same" className="font-normal">
            Billing address is the same as delivery
          </Label>
        </div>

        <Field label="Delivery notes" htmlFor="co-notes" hint="Gate timings, site contact, anything else.">
          <Textarea id="co-notes" rows={3} {...register('notes')} />
        </Field>
      </fieldset>
    );
  }

  if (step === 2) {
    return (
      <fieldset className="space-y-4">
        <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Payment method
        </legend>

        <PaymentMethods
          value={watch('paymentMethod')}
          onChange={(value: PaymentMethod) => setValue('paymentMethod', value)}
          settings={settings}
        />

        <Field
          label="Coupon code"
          htmlFor="co-coupon"
          hint="Validated by our system when the order is placed."
        >
          <Input id="co-coupon" placeholder="TRADE5" {...register('couponCode')} />
        </Field>
      </fieldset>
    );
  }

  return null;
}

/** Summary row on the review step, with a jump-back link. */
export function ReviewRow({
  label,
  children,
  onEdit,
}: {
  label: string;
  children: React.ReactNode;
  onEdit: () => void;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <dt className="text-2xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-foreground">{children}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-medium text-brand-cyan hover:underline"
      >
        Edit
      </button>
    </div>
  );
}
```

## `client/src/components/order/order-detail.tsx`

```tsx
import Link from 'next/link';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatPKR } from '@/lib/utils';
import type { OrderResponse } from '@/lib/api/cart.types';

/** Shared order presentation used by confirmation, tracking and the account. */

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'default',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'muted',
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Card (Stripe)',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

/** Fulfilment stages, in order. Cancelled and returned sit outside this path. */
const TIMELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;

export function OrderStatusBadge({ status }: { status: string }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status] ?? 'muted'}>{status.replace('_', ' ')}</Badge>;
}

export function OrderTimeline({ order }: { order: OrderResponse }): JSX.Element | null {
  const current = TIMELINE.indexOf(order.orderStatus as (typeof TIMELINE)[number]);
  if (current === -1) return null;

  return (
    <ol className="flex flex-wrap gap-2" aria-label="Order progress">
      {TIMELINE.map((stage, index) => (
        <li
          key={stage}
          className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${
            index <= current
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-border bg-white text-muted-foreground'
          }`}
          aria-current={index === current ? 'step' : undefined}
        >
          {index <= current ? <CheckCircle2 className="size-3.5 shrink-0" aria-hidden /> : null}
          {stage}
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail({ order }: { order: OrderResponse }): JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <OrderTimeline order={order} />

        <div className="rounded-lg border border-border bg-white">
          <h2 className="border-b border-border px-5 py-3 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Items
          </h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.sku} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded bg-brand-navy text-2xs font-bold text-white">
                  {item.qty}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/products/${item.product}`} className="line-clamp-2 hover:text-brand-cyan">
                    {item.name}
                  </Link>
                  <span className="mt-0.5 block font-mono text-2xs text-muted-foreground">
                    {item.sku} · {formatPKR(item.price)} / {item.unit}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPKR(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        {order.trackingNumber ? (
          <div className="flex items-start gap-3 rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-4 text-sm">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div>
              <p className="font-semibold text-brand-navy">On its way</p>
              <p className="mt-0.5 text-muted-foreground">
                {order.courier ? `${order.courier} · ` : ''}
                Tracking <span className="font-mono font-medium">{order.trackingNumber}</span>
              </p>
            </div>
          </div>
        ) : null}

        {order.statusHistory.length > 0 ? (
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              History
            </h2>
            <ol className="mt-3 space-y-2.5">
              {order.statusHistory.map((entry, index) => (
                // eslint-disable-next-line react/no-array-index-key -- history is append-only
                <li key={index} className="flex gap-3 text-sm">
                  <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="font-medium capitalize text-foreground">{entry.status}</p>
                    {entry.note ? <p className="text-xs text-muted-foreground">{entry.note}</p> : null}
                    <p className="text-2xs text-muted-foreground">{formatDate(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Summary
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPKR(order.subtotal)} />
            {order.discount > 0 ? (
              <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`- ${formatPKR(order.discount)}`} />
            ) : null}
            <Row label="Sales tax" value={formatPKR(order.taxAmount)} />
            <Row label="Delivery" value={order.shippingCost > 0 ? formatPKR(order.shippingCost) : 'Free'} />
          </dl>
          <div className="mt-4 flex justify-between border-t border-border pt-4">
            <span className="font-heading font-bold text-brand-navy">Total</span>
            <span className="font-heading text-lg font-bold tabular-nums text-brand-navy">
              {formatPKR(order.total)}
            </span>
          </div>
          <p className="mt-3 text-2xs text-muted-foreground">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} ·{' '}
            <span className="capitalize">{order.paymentStatus}</span>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 text-sm">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Delivery to
          </h2>
          <address className="mt-3 not-italic text-muted-foreground">
            <span className="block font-medium text-foreground">{order.customer.name}</span>
            {order.customer.companyName ? <span className="block">{order.customer.companyName}</span> : null}
            <span className="block">{String(order.shippingAddress.line1 ?? '')}</span>
            {order.shippingAddress.line2 ? <span className="block">{String(order.shippingAddress.line2)}</span> : null}
            <span className="block">
              {String(order.shippingAddress.city ?? '')}, {String(order.shippingAddress.province ?? '')}
            </span>
            <span className="mt-2 block">{order.customer.phone}</span>
            <span className="block">{order.customer.email}</span>
          </address>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
```

## `client/src/components/auth/auth-forms.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { apiClient, unwrap } from '@/lib/api-client';
import { loginSchema, registerSchema } from '@/lib/forms';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/types';

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;

interface AuthResponse {
  user: User;
  accessToken: string;
}

/** Password field with a show/hide toggle. */
function PasswordInput({
  id,
  registration,
  hasError,
  autoComplete,
}: {
  id: string;
  registration: ReturnType<typeof useForm<never>>['register'] extends never ? never : object;
  hasError?: boolean;
  autoComplete?: string;
}): JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      id={id}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      hasError={hasError}
      trailingIcon={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="text-muted-foreground transition-colors hover:text-brand-navy"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
      {...registration}
    />
  );
}

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const data = unwrap(await apiClient.post<AuthResponse>('/auth/login', values));
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
      router.push(searchParams.get('next') ?? '/account');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign you in.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Field label="Email" htmlFor="login-email" required error={errors.email?.message}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          {...register('email')}
          hasError={Boolean(errors.email)}
        />
      </Field>

      <Field label="Password" htmlFor="login-password" required error={errors.password?.message}>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          hasError={Boolean(errors.password)}
          registration={register('password')}
        />
      </Field>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-medium text-brand-cyan hover:underline">
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Signing in…">
        <LogIn />
        Sign in
      </Button>
    </form>
  );
}

export function RegisterForm(): JSX.Element {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const data = unwrap(await apiClient.post<AuthResponse>('/auth/register', values));
      setUser(data.user);
      toast.success('Account created', { description: 'Check your email to verify your address.' });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your account.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Field label="Full name" htmlFor="reg-name" required error={errors.name?.message}>
        <Input id="reg-name" autoComplete="name" {...register('name')} hasError={Boolean(errors.name)} />
      </Field>

      <Field label="Company" htmlFor="reg-company" hint="Optional — helps us apply trade pricing.">
        <Input id="reg-company" autoComplete="organization" {...register('companyName')} />
      </Field>

      <Field label="Email" htmlFor="reg-email" required error={errors.email?.message}>
        <Input id="reg-email" type="email" autoComplete="email" {...register('email')} hasError={Boolean(errors.email)} />
      </Field>

      <Field label="Phone / WhatsApp" htmlFor="reg-phone" required error={errors.phone?.message}>
        <Input id="reg-phone" type="tel" autoComplete="tel" placeholder="0300 1234567" {...register('phone')} hasError={Boolean(errors.phone)} />
      </Field>

      <Field
        label="Password"
        htmlFor="reg-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
      >
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          hasError={Boolean(errors.password)}
          registration={register('password')}
        />
      </Field>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Creating…">
        <UserPlus />
        Create account
      </Button>
    </form>
  );
}
```

## `client/src/components/auth/auth-shell.tsx`

```tsx
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/layout/logo';

/** Centred card used by all four auth screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-lg border border-border bg-white p-7 shadow-card">
          <h1 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>

          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-2xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-brand-cyan" aria-hidden />
          Your session is protected with httpOnly cookies.{' '}
          <Link href="/privacy-policy" className="underline hover:text-brand-cyan">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}
```

## `client/src/components/auth/password-forms.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/forms';

type ForgotInput = z.infer<typeof forgotPasswordSchema>;
type ResetInput = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm(): JSX.Element {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    // The API always answers 200 so an attacker cannot enumerate accounts;
    // the UI mirrors that and never confirms whether the address exists.
    await apiClient.post('/auth/forgot-password', values).catch(() => undefined);
    setSent(true);
  });

  if (sent) {
    return (
      <Alert variant="success" title="Check your email">
        If that address is registered, a reset link is on its way. The link is valid for 30
        minutes and can only be used once.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor="fp-email" required error={errors.email?.message}>
        <Input id="fp-email" type="email" autoComplete="email" {...register('email')} hasError={Boolean(errors.email)} />
      </Field>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Sending…">
        <Mail />
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }): JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await apiClient.post(`/auth/reset-password/${token}`, { password: values.password });
      toast.success('Password reset', { description: 'You are now signed in.' });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This link is invalid or has expired.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Field
        label="New password"
        htmlFor="rp-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
      >
        <Input
          id="rp-password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          hasError={Boolean(errors.password)}
        />
      </Field>

      <Field label="Confirm password" htmlFor="rp-confirm" required error={errors.confirm?.message}>
        <Input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          {...register('confirm')}
          hasError={Boolean(errors.confirm)}
        />
      </Field>

      <Alert variant="info" className="text-xs">
        Resetting your password signs out every other device.
      </Alert>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Saving…">
        <KeyRound />
        Set new password
      </Button>
    </form>
  );
}
```

## `client/src/components/shared/contact-form.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { contactSchema } from '@/lib/forms';

type ContactInput = z.infer<typeof contactSchema>;

/** Contact form with a hidden honeypot field the API also checks. */
export function ContactForm(): JSX.Element {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await apiClient.post('/contact', { ...values, source: 'contact_form' });
      reset();
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send your message.');
    }
  });

  if (sent) {
    return (
      <Alert variant="success" title="Message sent">
        Thank you — we will be in touch shortly. For anything urgent, WhatsApp +92 324 4234990.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ct-name" required error={errors.name?.message}>
          <Input id="ct-name" {...register('name')} hasError={Boolean(errors.name)} />
        </Field>
        <Field label="Phone" htmlFor="ct-phone" error={errors.phone?.message}>
          <Input id="ct-phone" type="tel" {...register('phone')} hasError={Boolean(errors.phone)} />
        </Field>
      </div>

      <Field label="Email" htmlFor="ct-email" required error={errors.email?.message}>
        <Input id="ct-email" type="email" {...register('email')} hasError={Boolean(errors.email)} />
      </Field>

      <Field label="Subject" htmlFor="ct-subject" required error={errors.subject?.message}>
        <Input id="ct-subject" placeholder="Stock enquiry — MCCB 250A" {...register('subject')} hasError={Boolean(errors.subject)} />
      </Field>

      <Field label="Message" htmlFor="ct-message" required error={errors.message?.message}>
        <Textarea id="ct-message" rows={5} {...register('message')} hasError={Boolean(errors.message)} />
      </Field>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label htmlFor="ct-website">Leave this empty</label>
        <input id="ct-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <Button type="submit" variant="cta" size="lg" isLoading={isSubmitting} loadingText="Sending…">
        <Send />
        Send message
      </Button>
    </form>
  );
}
```

## `client/src/components/shared/json-ld.tsx`

```tsx
/**
 * Renders one JSON-LD graph per page.
 *
 * Google prefers a single `@graph` over several loose script tags, and it lets
 * nodes cross-reference by `@id` (Product → seller → Organization).
 */
export function JsonLd({ schemas }: { schemas: Record<string, unknown>[] }): JSX.Element {
  const graph = { '@context': 'https://schema.org', '@graph': schemas };

  return (
    <script
      type="application/ld+json"
      // Structured data is generated by us, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
}
```

## `client/src/components/shared/legal-page.tsx`

```tsx
import { Breadcrumb } from '@/components/ui/pagination';
import { CONTACT } from '@/lib/constants';

/**
 * Shared shell for policy pages.
 *
 * The copy below is a reasonable starting position drafted from how the
 * business actually operates — it is not legal advice, and the client should
 * have a lawyer review it before launch. That caveat is printed on the page.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}): JSX.Element {
  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: title }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>

      <div className="mt-6 max-w-3xl space-y-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-base font-bold text-brand-navy">{section.heading}</h2>
            <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-lg border border-border bg-surface p-5 text-sm">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Questions about this policy
          </h2>
          <p className="mt-2 text-muted-foreground">
            Contact Fast Traders at {CONTACT.address.full}, on {CONTACT.mobile}, or by email at{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-brand-cyan hover:underline">
              {CONTACT.email}
            </a>
            .
          </p>
        </section>

        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-foreground">
          <strong>Note for Fast Traders:</strong> this text is a practical starting point based on
          how the business operates. Have it reviewed by a lawyer before launch — it is not legal
          advice.
        </p>
      </div>
    </div>
  );
}
```

## `client/src/app/cart/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingCart, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { CartLines } from '@/components/cart/cart-lines';
import { useCart, useCartMutations } from '@/lib/api/mutations';
import { formatPKR } from '@/lib/utils';

/**
 * Shopping cart.
 *
 * Client-rendered on purpose — it is per-visitor, never cacheable and blocked
 * in robots.txt, so there is nothing for a Server Component to gain here.
 */
export default function CartPage(): JSX.Element {
  const { data: cart, isPending, isError, refetch } = useCart('shopping');
  const mutations = useCartMutations('shopping');

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Cart' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Shopping Cart
      </h1>

      {isError ? (
        <ErrorState className="mt-6" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : cart.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Your cart is empty"
          description="Priced items you add will appear here. Quote-only products go to your inquiry list instead."
          icon={<ShoppingCart />}
          action={
            <Button asChild variant="cta">
              <Link href="/products">
                Browse the catalogue
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            {cart.hasIssues ? (
              <Alert variant="warning" title="Please review your cart">
                One or more items are out of stock or have changed price. Adjust them before
                checking out.
              </Alert>
            ) : null}

            <CartLines items={cart.items} mutations={mutations} showPrice />
          </div>

          <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Order summary
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})
                </dt>
                <dd className="font-semibold tabular-nums">{formatPKR(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated sales tax</dt>
                <dd className="font-semibold tabular-nums">{formatPKR(cart.taxAmount)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Delivery</dt>
                <dd className="text-xs">Calculated at checkout</dd>
              </div>
            </dl>

            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-heading font-bold text-brand-navy">Estimated total</span>
              <span className="font-heading text-lg font-bold tabular-nums text-brand-navy">
                {formatPKR(cart.estimatedTotal)}
              </span>
            </div>

            <p className="mt-2 text-2xs text-muted-foreground">
              Coupon codes are applied at checkout, once we know the delivery city.
            </p>

            <Button asChild variant="cta" size="lg" block className="mt-5" disabled={cart.hasIssues}>
              <Link href="/checkout">
                Proceed to checkout
                <ArrowRight />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="sm" block className="mt-2">
              <Link href="/products">Continue shopping</Link>
            </Button>

            <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-2xs text-muted-foreground">
              <Truck className="mt-0.5 size-3.5 shrink-0 text-brand-cyan" aria-hidden />
              Same-day collection from Grace Tower, Bull Road. Delivery across Pakistan in 1–6
              working days.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
```

## `client/src/app/inquiry/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { CartLines } from '@/components/cart/cart-lines';
import { useCart, useCartMutations } from '@/lib/api/mutations';

/**
 * Inquiry list — the RFQ side of the hybrid model.
 *
 * Deliberately shows no prices: nothing here has been quoted yet, and showing
 * a retail figure next to a "request a price" flow would confuse a trade buyer.
 */
export default function InquiryPage(): JSX.Element {
  const { data: cart, isPending, isError, refetch } = useCart('inquiry');
  const mutations = useCartMutations('inquiry');

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Inquiry list' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Inquiry List
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Build the list, add any requirements per line, then send it. We come back with one
        consolidated quotation — usually within a working day.
      </p>

      {isError ? (
        <ErrorState className="mt-6" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : cart.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Your inquiry list is empty"
          description="Add quote-only products, or use the “Bulk / trade price?” button on any priced product."
          icon={<FileText />}
          action={
            <Button asChild variant="cta">
              <Link href="/products?pricingMode=quote">
                Browse quote-only products
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <CartLines items={cart.items} mutations={mutations} showNote />

          <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Ready to send?
            </h2>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Lines</dt>
                <dd className="font-semibold">{cart.lineCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total quantity</dt>
                <dd className="font-semibold">{cart.itemCount}</dd>
              </div>
            </dl>

            <Alert variant="info" className="mt-4 text-xs">
              No prices are shown here — that is what the quotation is for.
            </Alert>

            <Button asChild variant="cta" size="lg" block className="mt-5">
              <Link href="/request-quote">
                Submit RFQ
                <ArrowRight />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="sm" block className="mt-2">
              <Link href="/products">Add more items</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
```

## `client/src/app/request-quote/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { useCart, useCreateQuotation } from '@/lib/api/mutations';
import { rfqSchema, type RfqInput } from '@/lib/forms';
import { useAuth } from '@/lib/auth-context';

/**
 * RFQ submission.
 *
 * The item list comes from the server-side inquiry cart, so the buyer cannot
 * tamper with it and it survives a page reload mid-form.
 */
export default function RequestQuotePage(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cart, isPending } = useCart('inquiry');
  const createQuotation = useCreateQuotation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RfqInput>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      customer: {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        companyName: user?.companyName ?? '',
        city: '',
      },
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const quotation = await createQuotation.mutateAsync({
        customer: values.customer,
        ...(values.message ? { message: values.message } : {}),
        ...(values.requiredBy ? { requiredBy: values.requiredBy } : {}),
      });

      toast.success(`Request ${quotation.quoteNumber} sent`, {
        description: 'We will respond within one working day.',
      });
      router.push(`/account/quotations/${quotation.quoteNumber}`);
    } catch (error) {
      toast.error('Could not send your request', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  });

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Request a quote' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Request a Quotation
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tell us who you are and what you need. We serve contractors, panel builders and factories,
        and quote against your bill of materials.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-lg border border-border bg-white p-6">
          <fieldset className="space-y-4">
            <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Your details
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="rfq-name" required error={errors.customer?.name?.message}>
                <Input id="rfq-name" {...register('customer.name')} hasError={Boolean(errors.customer?.name)} />
              </Field>
              <Field label="Company" htmlFor="rfq-company" hint="Optional, but helps us price correctly.">
                <Input id="rfq-company" {...register('customer.companyName')} />
              </Field>
              <Field label="Email" htmlFor="rfq-email" required error={errors.customer?.email?.message}>
                <Input id="rfq-email" type="email" {...register('customer.email')} hasError={Boolean(errors.customer?.email)} />
              </Field>
              <Field label="Phone / WhatsApp" htmlFor="rfq-phone" required error={errors.customer?.phone?.message}>
                <Input id="rfq-phone" type="tel" placeholder="0300 1234567" {...register('customer.phone')} hasError={Boolean(errors.customer?.phone)} />
              </Field>
              <Field label="City" htmlFor="rfq-city" hint="Where the goods are going.">
                <Input id="rfq-city" placeholder="Lahore" {...register('customer.city')} />
              </Field>
              <Field label="Required by" htmlFor="rfq-date" error={errors.requiredBy?.message}>
                <Input id="rfq-date" type="date" {...register('requiredBy')} hasError={Boolean(errors.requiredBy)} />
              </Field>
            </div>
          </fieldset>

          <Field
            label="Message"
            htmlFor="rfq-message"
            hint="Ratings, quantities, site conditions, or paste your bill of materials."
            error={errors.message?.message}
          >
            <Textarea id="rfq-message" rows={5} {...register('message')} />
          </Field>

          <Alert variant="info" title="Attachments">
            <span className="flex items-start gap-2 text-xs">
              <Paperclip className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              To attach a drawing or BOM spreadsheet, email it to{' '}
              <a href="mailto:fasttrad3rs@gmail.com" className="font-medium">
                fasttrad3rs@gmail.com
              </a>{' '}
              quoting the reference we send you, or WhatsApp it to +92 324 4234990.
            </span>
          </Alert>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            block
            isLoading={isSubmitting || createQuotation.isPending}
            loadingText="Sending…"
            disabled={!cart || cart.items.length === 0}
          >
            <Send />
            Send request
          </Button>
        </form>

        <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Items on this request
          </h2>

          {isPending ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : !cart || cart.items.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 px-0 py-6"
              title="Nothing on the list"
              description="Add products to your inquiry list first."
              icon={<FileText />}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/products">Browse products</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ul className="mt-4 divide-y divide-border text-sm">
                {cart.items.map((line) => (
                  <li key={line.product} className="py-2.5">
                    <p className="line-clamp-2 font-medium text-foreground">{line.name}</p>
                    <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                      {line.sku} · {line.qty} {line.unit}
                    </p>
                    {line.note ? (
                      <p className="mt-1 text-2xs italic text-muted-foreground">“{line.note}”</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <Button asChild variant="ghost" size="sm" block className="mt-3">
                <Link href="/inquiry">Edit the list</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
```

## `client/src/app/checkout/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Lock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { OrderSummary } from '@/components/checkout/order-summary';
import { CheckoutSteps, ReviewRow } from '@/components/checkout/steps';
import { useCart, useCreateOrder } from '@/lib/api/mutations';
import { useAuth } from '@/lib/auth-context';
import { checkoutSchema, type CheckoutInput } from '@/lib/forms';
import { cn, formatPKR } from '@/lib/utils';

const STEPS = ['Contact', 'Shipping', 'Payment', 'Review'] as const;

/**
 * Four-step checkout. Guests are welcome — the API accepts an order with a
 * null user, and the customer block is all we need to fulfil it.
 */
export default function CheckoutPage(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cart, isPending } = useCart('shopping');
  const createOrder = useCreateOrder();
  const [step, setStep] = useState(0);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: {
      customer: {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        companyName: user?.companyName ?? '',
      },
      shippingAddress: { label: 'Delivery', line1: '', city: '', province: 'Punjab', isDefault: false },
      sameAsBilling: true,
      paymentMethod: 'cod',
    },
  });

  const { handleSubmit, watch, trigger } = form;
  const paymentMethod = watch('paymentMethod');

  /** Validate only the fields belonging to the current step before advancing. */
  const next = async (): Promise<void> => {
    const fields: Record<number, (keyof CheckoutInput | `customer.${string}` | `shippingAddress.${string}`)[]> = {
      0: ['customer.name', 'customer.email', 'customer.phone'],
      1: ['shippingAddress.line1', 'shippingAddress.city', 'shippingAddress.province'],
      2: ['paymentMethod'],
    };

    const valid = await trigger(fields[step] as never);
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const order = await createOrder.mutateAsync({
        ...values,
        ...(values.sameAsBilling ? { billingAddress: undefined } : {}),
      });
      toast.success(`Order ${order.orderNumber} placed`);
      router.push(`/order-confirmation/${order.orderNumber}`);
    } catch (error) {
      toast.error('Could not place your order', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  });

  if (isPending) {
    return (
      <div className="container grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Nothing to check out"
          description="Your cart is empty."
          icon={<ShoppingCart />}
          action={
            <Button asChild variant="cta">
              <Link href="/products">Browse the catalogue</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Checkout
      </h1>

      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Checkout progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                index === step
                  ? 'border-brand-cyan bg-brand-cyan/10 text-brand-navy'
                  : index < step
                    ? 'border-success/30 bg-success/5 text-success'
                    : 'border-border bg-white text-muted-foreground',
              )}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-current/10">
                {index < step ? <Check className="size-3" /> : index + 1}
              </span>
              {label}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="rounded-lg border border-border bg-white p-6">
          <CheckoutSteps step={step} form={form} isSignedIn={Boolean(user)} settings={null} />

          {step === 3 ? (
            <div className="space-y-5">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                Review &amp; place order
              </h2>

              <dl className="space-y-3 text-sm">
                <ReviewRow label="Contact" onEdit={() => setStep(0)}>
                  {watch('customer.name')} · {watch('customer.email')} · {watch('customer.phone')}
                </ReviewRow>
                <ReviewRow label="Deliver to" onEdit={() => setStep(1)}>
                  {watch('shippingAddress.line1')}
                  {watch('shippingAddress.line2') ? `, ${watch('shippingAddress.line2')}` : ''},{' '}
                  {watch('shippingAddress.city')}, {watch('shippingAddress.province')}
                </ReviewRow>
                <ReviewRow label="Payment" onEdit={() => setStep(2)}>
                  {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Card (Stripe)'}
                </ReviewRow>
              </dl>

              <Alert variant="info" className="text-xs">
                Totals shown are estimates. Delivery and any discount are calculated by our system
                from the delivery city and coupon when the order is placed — the confirmed total is
                on your confirmation page and email.
              </Alert>

              <Button
                type="submit"
                variant="cta"
                size="lg"
                block
                isLoading={createOrder.isPending}
                loadingText="Placing order…"
              >
                <Lock />
                Place order · {formatPKR(cart.estimatedTotal)}
              </Button>
            </div>
          ) : null}

          <div className="mt-6 flex justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0}
            >
              <ArrowLeft />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" variant="primary" onClick={() => void next()}>
                Continue
                <ArrowRight />
              </Button>
            ) : null}
          </div>
        </form>

        <OrderSummary cart={cart} />
      </div>
    </div>
  );
}
```

## `client/src/app/track-order/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { OrderDetail } from '@/components/order/order-detail';
import { useTrackOrder } from '@/lib/api/mutations';
import { trackOrderSchema } from '@/lib/forms';
import { CONTACT } from '@/lib/constants';

type TrackInput = z.infer<typeof trackOrderSchema>;

/**
 * Guest order lookup.
 *
 * Requires the order number *and* the checkout email, which is what stops
 * order numbers being enumerable by anyone who guesses the format.
 */
export default function TrackOrderPage(): JSX.Element {
  const lookup = useTrackOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackInput>({ resolver: zodResolver(trackOrderSchema) });

  const onSubmit = handleSubmit((values) => lookup.mutate(values));

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Track an order' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Track Your Order
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Enter your order number and the email address you used at checkout. No account needed.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 grid max-w-2xl gap-4 rounded-lg border border-border bg-white p-6 sm:grid-cols-2"
      >
        <Field label="Order number" htmlFor="track-number" required error={errors.orderNumber?.message}>
          <Input
            id="track-number"
            placeholder="FT-202607-0001"
            className="font-mono"
            {...register('orderNumber')}
            hasError={Boolean(errors.orderNumber)}
          />
        </Field>

        <Field label="Email" htmlFor="track-email" required error={errors.email?.message}>
          <Input id="track-email" type="email" {...register('email')} hasError={Boolean(errors.email)} />
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" variant="cta" isLoading={lookup.isPending} loadingText="Looking up…">
            <Search />
            Find my order
          </Button>
        </div>
      </form>

      {lookup.isError ? (
        <Alert variant="danger" title="No matching order" className="mt-6 max-w-2xl">
          Check the order number and email, or call us on {CONTACT.mobile} and we will look it up
          for you.
        </Alert>
      ) : null}

      {lookup.data ? (
        <div className="mt-8">
          <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
            Order {lookup.data.orderNumber}
          </h2>
          <OrderDetail order={lookup.data} />
        </div>
      ) : null}
    </div>
  );
}
```

## `client/src/app/login/page.tsx`

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/auth-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Sign in',
  description: 'Sign in to your Fast Traders account to track orders and quotations.',
  path: '/login',
  noIndex: true,
});

export default function LoginPage(): JSX.Element {
  return (
    <AuthShell
      title="Sign in"
      description="Track orders, review quotations and reuse your saved addresses."
      footer={
        <>
          New to Fast Traders?{' '}
          <Link href="/register" className="font-medium text-brand-cyan hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
```

## `client/src/app/register/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/auth-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Create an account',
  description: 'Create a Fast Traders account to track orders and request trade pricing.',
  path: '/register',
  noIndex: true,
});

export default function RegisterPage(): JSX.Element {
  return (
    <AuthShell
      title="Create an account"
      description="Faster checkout, saved addresses, and your quotation history in one place."
      footer={
        <>
          Already registered?{' '}
          <Link href="/login" className="font-medium text-brand-cyan hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
```

## `client/src/app/forgot-password/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/password-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Forgot your password',
  description: 'Reset the password on your Fast Traders account.',
  path: '/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordPage(): JSX.Element {
  return (
    <AuthShell
      title="Forgot your password"
      description="Enter your email and we will send you a link to set a new one."
      footer={
        <Link href="/login" className="font-medium text-brand-cyan hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
```

## `client/src/app/about/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Building2, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/pagination';
import { SectionHeading } from '@/components/ui/separator';
import { JsonLd } from '@/components/shared/json-ld';
import { getBrands } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, localBusinessSchema, organizationSchema } from '@/lib/seo';
import { CONTACT } from '@/lib/constants';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'About Fast Traders — Industrial Equipment Supplier, Lahore',
  description:
    'Fast Traders supplies industrial and electrical equipment from Grace Tower, Bull Road, Lahore. Led by Sharjeel Bin Ejaz, authorised stockist for twelve manufacturers.',
  path: '/about',
  keywords: ['industrial equipment supplier Lahore', 'electrical components Pakistan'],
});

export default async function AboutPage(): Promise<JSX.Element> {
  const brands = await getBrands();

  return (
    <div>
      <JsonLd
        schemas={[organizationSchema(), localBusinessSchema(), breadcrumbSchema([{ name: 'About', path: '/about' }])]}
      />

      <section className="bg-brand-gradient text-white">
        <div className="container py-14">
          <Breadcrumb items={[{ label: 'About' }]} className="mb-4 [&_a]:text-white/60 [&_span]:text-white" />
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
            About Fast Traders
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            We deal in all kinds of industrial equipment, parts and accessories — supplying
            contractors, panel builders and factories across Pakistan from our counter in Lahore.
          </p>
        </div>
      </section>

      <section className="container py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <SectionHeading title="Our story" />
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Fast Traders operates from Shop No. 30, Grace Tower on Bull Road — one of Lahore&rsquo;s
                established trading addresses for electrical and industrial supply. The business is
                led by <strong className="font-semibold text-brand-navy">Sharjeel Bin Ejaz</strong>.
              </p>
              <p>
                What began as a counter for circuit breakers and cable has grown into a full
                catalogue: switchgear and protection, control components, automation, power and
                motor control, safety products, and the tools and accessories that go with them.
              </p>
              <p>
                We are an authorised stockist for twelve manufacturers, which matters more here than
                it might elsewhere. Counterfeit and grey-import breakers are a real problem in this
                market; everything we sell comes through official channels and carries the
                manufacturer&rsquo;s warranty.
              </p>
              <p>
                Most of our work is repeat business with people who know exactly what they need —
                so we keep real stock on the shelf, answer the phone, and quote in writing.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { Icon: Building2, title: 'Where we are', body: CONTACT.address.full },
              { Icon: Users, title: 'Who we serve', body: 'Contractors, panel builders, factories, maintenance teams and consulting engineers.' },
              { Icon: Target, title: 'What we promise', body: 'Genuine product, honest stock information, and a written quotation within a working day.' },
              { Icon: Award, title: 'Authorisations', body: 'Stockist for twelve manufacturers across Japan, Germany, France, Korea, Turkey and Pakistan.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-3 rounded-lg border border-border bg-white p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
                <div>
                  <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white py-14">
        <div className="container">
          <SectionHeading title="Our brand partners" description="Authorised stockist and supplier." />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(brands ?? []).map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="flex h-20 flex-col items-center justify-center rounded-lg border border-border bg-surface px-3 text-center text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:border-brand-cyan hover:text-brand-navy"
                >
                  {brand.name}
                  {brand.country ? (
                    <span className="mt-1 text-2xs font-normal normal-case text-muted-foreground">
                      {brand.country}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container py-14 text-center">
        <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy">
          Need something specific?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          If it is not on the site, ask — we source far more than the catalogue shows.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="cta" size="lg">
            <Link href="/request-quote">Request a quote</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
```

## `client/src/app/contact/page.tsx`

```tsx
import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { ContactForm } from '@/components/shared/contact-form';
import { MAP_EMBED_SRC } from '@/components/home/contact-strip';
import { breadcrumbSchema, buildMetadata, localBusinessSchema, organizationSchema } from '@/lib/seo';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Fast Traders — Grace Tower, Bull Road, Lahore',
  description:
    'Visit our counter at Shop No. 30, Grace Tower, Bull Road, Lahore. Call +92 324 4234990 or +92 42 37378460, or email fasttrad3rs@gmail.com.',
  path: '/contact',
  keywords: ['electrical shop Bull Road Lahore', 'industrial equipment supplier contact Lahore'],
});

const HOURS = [
  { days: 'Monday – Thursday', time: '10:00 – 19:00' },
  { days: 'Friday', time: '10:00 – 19:00', note: 'Closed 13:00 – 14:30 for Jumu’ah' },
  { days: 'Saturday', time: '10:00 – 19:00' },
  { days: 'Sunday', time: 'Closed' },
];

export default function ContactPage(): JSX.Element {
  return (
    <div className="container py-8">
      <JsonLd
        schemas={[organizationSchema(), localBusinessSchema(), breadcrumbSchema([{ name: 'Contact', path: '/contact' }])]}
      />

      <Breadcrumb items={[{ label: 'Contact' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Contact Us
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Call, WhatsApp, email, or come to the counter. If you have the part number, WhatsApp is
        fastest — we will confirm stock and price straight away.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Send us a message
          </h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Fast Traders
            </h2>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <address className="not-italic text-muted-foreground">
                  {CONTACT.address.line1},<br />
                  {CONTACT.address.line2}, {CONTACT.address.city},<br />
                  {CONTACT.address.country}
                </address>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <span className="text-muted-foreground">
                  <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="block hover:text-brand-cyan">
                    {CONTACT.mobile} <span className="text-2xs uppercase">Mobile / WhatsApp</span>
                  </a>
                  <a href={`tel:${CONTACT.landline.replace(/\s/g, '')}`} className="block hover:text-brand-cyan">
                    {CONTACT.landline} <span className="text-2xs uppercase">Landline</span>
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`mailto:${CONTACT.email}`} className="text-muted-foreground hover:text-brand-cyan">
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <dl className="space-y-1 text-muted-foreground">
                  {HOURS.map((entry) => (
                    <div key={entry.days} className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">{entry.days}</dt>
                      <dd>{entry.time}</dd>
                      {entry.note ? <dd className="w-full text-2xs">{entry.note}</dd> : null}
                    </div>
                  ))}
                </dl>
              </li>
            </ul>

            <Button asChild variant="cta" block className="mt-5">
              <a
                href={whatsappLink(CONTACT.whatsappDigits, 'Hello Fast Traders, I have an enquiry.')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                WhatsApp us
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              src={MAP_EMBED_SRC}
              title="Fast Traders on Google Maps — Grace Tower, Bull Road, Lahore"
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## `client/src/app/faq/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { breadcrumbSchema, buildMetadata, faqSchema } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Delivery, payment, warranty, trade pricing and stock questions answered — Fast Traders, Lahore.',
  path: '/faq',
});

/** Single source for both the rendered accordion and the FAQPage schema. */
const FAQS = [
  {
    question: 'Are your products genuine?',
    answer:
      'Yes. We are an authorised stockist for all twelve brands listed on the site and source only through official channels. Counterfeit breakers are a real problem in this market, which is why every item carries the manufacturer’s warranty.',
  },
  {
    question: 'Why do some products show a price and others say "price on request"?',
    answer:
      'Standard stock items are priced and can be bought online. Larger switchgear, automation and made-to-order items depend on specification, exchange rate and lead time, so we quote those individually. Add them to your inquiry list and we will price them, usually within one working day.',
  },
  {
    question: 'Do you offer trade or bulk pricing?',
    answer:
      'Yes. Send your bill of materials through the Request a Quote page and we will come back with one consolidated quotation. We work regularly with contractors, panel builders and factory maintenance teams.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Lahore is 1–2 working days, elsewhere in Punjab 2–4, and the rest of Pakistan 3–6. Free delivery applies above the thresholds shown at checkout. Same-day collection is available from our counter at Grace Tower, Bull Road.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Cash on delivery, bank transfer, and card payment through Stripe. JazzCash and Easypaisa are planned. For bank transfer we send the account details with your order confirmation.',
  },
  {
    question: 'Can I order without creating an account?',
    answer:
      'Yes — guest checkout is available for both orders and quotation requests. You can track a guest order with the order number and the email you used at checkout.',
  },
  {
    question: 'What is your returns policy?',
    answer:
      'Report shortages or transit damage within 48 hours of delivery. Unused items in original packaging can be returned within 7 days. Special-order and made-to-order items are non-returnable once confirmed.',
  },
  {
    question: 'Do you supply items that are not on the website?',
    answer:
      'Often, yes. The site shows a portion of what we can source. Send the part number or a photo of the rating plate on WhatsApp and we will tell you whether we can get it.',
  },
] as const;

export default function FaqPage(): JSX.Element {
  return (
    <div className="container py-8">
      <JsonLd
        schemas={[faqSchema([...FAQS]), breadcrumbSchema([{ name: 'FAQ', path: '/faq' }])]}
      />

      <Breadcrumb items={[{ label: 'FAQ' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Frequently Asked Questions
      </h1>

      <div className="mt-6 max-w-3xl rounded-lg border border-border bg-white px-6">
        <Accordion type="single" collapsible defaultValue="q0">
          {FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`q${index}`} className="last:border-b-0">
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="mt-8 max-w-3xl rounded-lg border border-border bg-surface p-6 text-center">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Still have a question?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Call +92 324 4234990 or send us a message — we answer six days a week.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild variant="cta" size="sm">
            <Link href="/contact">Contact us</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/request-quote">Request a quote</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## `client/src/app/industries/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Cpu, Factory, HardHat, Shirt, UtensilsCrossed, Zap } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Industries We Serve — Manufacturing, Textile, Power & Automation',
  description:
    'Fast Traders supplies switchgear, automation and control equipment to manufacturing, textile, food processing, construction, power and automation sectors across Pakistan.',
  path: '/industries',
  keywords: ['industrial automation parts Lahore', 'textile mill electrical supplier Pakistan'],
});

const INDUSTRIES = [
  {
    id: 'manufacturing',
    Icon: Factory,
    name: 'Manufacturing',
    body: 'Panel builds, machine retrofits and the spares that keep a line running. Contactors, overload relays, motor protection and distribution gear off the shelf.',
    categories: ['contactors-relays', 'motors-starters', 'distribution-boards-panels'],
  },
  {
    id: 'textile',
    Icon: Shirt,
    name: 'Textile',
    body: 'Drives, sensors and motor control for looms, dyeing and finishing. Fuji and Mitsubishi inverters are common on Faisalabad and Lahore plant.',
    categories: ['vfds-drives', 'sensors', 'temperature-controllers'],
  },
  {
    id: 'food-processing',
    Icon: UtensilsCrossed,
    name: 'Food Processing',
    body: 'Washdown-rated sensors, hygienic control gear and temperature control for ovens, chillers and process lines.',
    categories: ['sensors', 'temperature-controllers', 'safety-products'],
  },
  {
    id: 'construction',
    Icon: HardHat,
    name: 'Construction',
    body: 'Distribution boards, cable, site power and protection for commercial and residential projects.',
    categories: ['cables-wiring', 'distribution-boards-panels', 'circuit-breakers'],
  },
  {
    id: 'power-energy',
    Icon: Zap,
    name: 'Power & Energy',
    body: 'Air circuit breakers, PFI capacitors, protection relays and busbar for LT panels and substations.',
    categories: ['switchgear-protection', 'capacitors', 'busbars-enclosures'],
  },
  {
    id: 'automation',
    Icon: Cpu,
    name: 'Automation',
    body: 'PLCs, HMIs, encoders and the I/O to tie them together — Mitsubishi, Schneider, IDEC and Autonics.',
    categories: ['plcs-hmis', 'encoders', 'timers-counters'],
  },
] as const;

export default function IndustriesPage(): JSX.Element {
  return (
    <div className="container py-8">
      <JsonLd schemas={[breadcrumbSchema([{ name: 'Industries', path: '/industries' }])]} />

      <Breadcrumb items={[{ label: 'Industries' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Industries We Serve
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        The same counter supplies a one-off replacement breaker and a full plant fit-out. Here is
        where most of our work goes.
      </p>

      <div className="mt-8 space-y-4">
        {INDUSTRIES.map(({ id, Icon, name, body, categories }) => (
          <section
            key={id}
            id={id}
            className="scroll-mt-28 rounded-lg border border-border bg-white p-6 sm:flex sm:gap-5"
          >
            <span className="mb-3 flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white sm:mb-0">
              <Icon className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
                {name}
              </h2>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{body}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {categories.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/categories/${slug}`}
                      className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                    >
                      {slug.replace(/-/g, ' ')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-brand-gradient p-8 text-center text-white">
        <h2 className="font-heading text-xl font-bold uppercase tracking-tight">
          Fitting out a plant?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Send the bill of materials and we will quote the lot in one go.
        </p>
        <Button asChild variant="cta" size="lg" className="mt-5">
          <Link href="/request-quote">Request a quote</Link>
        </Button>
      </div>
    </div>
  );
}
```

## `client/src/app/privacy-policy/page.tsx`

```tsx
import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How Fast Traders collects, uses and protects your personal information.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'What we collect',
          body: [
            'When you place an order or request a quotation we collect your name, email address, phone number, delivery address and, if you provide them, your company name and NTN.',
            'If you create an account we also store a hashed version of your password. We never store the password itself, and we cannot recover it.',
            'We record which products you view and add to your cart so the site can show your recently viewed items and keep your cart between visits.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To fulfil orders, price quotations, arrange delivery and provide after-sales support.',
            'To send transactional email — order confirmations, status updates and quotations. These are not marketing and cannot be unsubscribed from while an order is active.',
            'To send occasional product and stock updates, but only if you subscribed to the newsletter. Every such email carries an unsubscribe link.',
          ],
        },
        {
          heading: 'Payment information',
          body: [
            'We do not see or store card numbers. Card payments are processed by Stripe, who handle the card data directly under their own privacy terms.',
            'For bank transfers we only see what appears on the transfer receipt you send us.',
          ],
        },
        {
          heading: 'Who we share it with',
          body: [
            'Courier companies, so they can deliver your order — name, address and phone number only.',
            'Our payment processor and email provider, as needed to take payment and send transactional email.',
            'We do not sell your data, and we do not share it for advertising.',
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'We use a small number of essential cookies: an authentication cookie if you are signed in, and a session cookie so a guest cart survives a page reload. Both are httpOnly and cannot be read by scripts.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You can view and correct your details in your account, or ask us to delete your account entirely. Order records are retained for tax and warranty purposes.',
          ],
        },
      ]}
    />
  );
}
```

## `client/src/app/terms/page.tsx`

```tsx
import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Terms & Conditions',
  description: 'Terms governing purchases and quotations from Fast Traders, Lahore.',
  path: '/terms',
});

export default function TermsPage(): JSX.Element {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="July 2026"
      sections={[
        {
          heading: 'About us',
          body: [
            'These terms apply to purchases from Fast Traders, Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan.',
          ],
        },
        {
          heading: 'Orders',
          body: [
            'An order placed on this site is an offer to buy. It is accepted when we confirm it — normally within one working day.',
            'We may decline an order if the item is no longer available, if a price has been listed in error, or if we cannot verify the delivery details.',
            'Prices are in Pakistani Rupees and include sales tax where applicable. Delivery is charged separately and shown before you confirm.',
          ],
        },
        {
          heading: 'Quotations',
          body: [
            'A quotation is valid for the period stated on it, and for 15 days if no period is given.',
            'Quoted prices are subject to stock availability at the time the order is confirmed. Imported items are quoted against the prevailing exchange rate and may be revised if it moves materially before the order is placed.',
            'Delivery lead time is confirmed on receipt of a firm order.',
          ],
        },
        {
          heading: 'Payment',
          body: [
            'We accept cash on delivery, bank transfer and card payment via Stripe.',
            'Goods remain the property of Fast Traders until payment is received in full.',
          ],
        },
        {
          heading: 'Warranty',
          body: [
            'Warranty is limited to the manufacturer’s terms for the brand concerned. We are an authorised stockist and will handle a valid warranty claim on your behalf.',
            'Warranty does not cover damage from incorrect installation, over-voltage, water ingress or use outside the product’s rated conditions.',
          ],
        },
        {
          heading: 'Liability',
          body: [
            'Our liability for any claim is limited to the value of the goods supplied. We are not liable for consequential loss, including loss of production.',
            'Nothing in these terms limits liability that cannot be limited under Pakistani law.',
          ],
        },
      ]}
    />
  );
}
```

## `client/src/app/shipping-returns/page.tsx`

```tsx
import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shipping & Returns',
  description:
    'Delivery times and charges across Pakistan, collection from our Lahore counter, and how to return an item.',
  path: '/shipping-returns',
  keywords: ['electrical parts delivery Lahore', 'cable supplier Lahore'],
});

export default function ShippingReturnsPage(): JSX.Element {
  return (
    <LegalPage
      title="Shipping & Returns"
      updated="July 2026"
      sections={[
        {
          heading: 'Delivery times and charges',
          body: [
            'Lahore: 1–2 working days. Elsewhere in Punjab: 2–4 working days. Rest of Pakistan: 3–6 working days.',
            'Delivery is charged by destination and is shown at checkout before you confirm. Free delivery applies above the order value thresholds configured in our system — these are displayed at checkout.',
            'Heavy or oversized items such as ACBs, transformers and full cable drums are quoted for freight separately.',
          ],
        },
        {
          heading: 'Collection',
          body: [
            'Same-day collection is available from our counter at Shop No. 30, Grace Tower, Bull Road, Lahore, Monday to Saturday, 10:00 to 19:00.',
            'Call +92 324 4234990 before you set off and we will have the goods ready.',
          ],
        },
        {
          heading: 'Checking your delivery',
          body: [
            'Please check the consignment on arrival. Report any shortage or transit damage within 48 hours, with photographs where possible, so we can raise it with the courier.',
          ],
        },
        {
          heading: 'Returns',
          body: [
            'Unused items in their original, unopened packaging can be returned within 7 days of delivery. The return carriage is at your cost unless the item was faulty or incorrectly supplied.',
            'Cut lengths of cable, special-order items and anything made or imported to order are non-returnable once confirmed.',
            'Refunds are issued by the original payment method, or by bank transfer for cash-on-delivery orders, within 7 working days of the goods being received back and inspected.',
          ],
        },
        {
          heading: 'Faulty goods',
          body: [
            'If an item fails within its warranty period, contact us with the order number and a description of the fault. We will arrange inspection and handle the manufacturer’s warranty process on your behalf.',
          ],
        },
      ]}
    />
  );
}
```

## `client/src/app/account/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { ArrowRight, FileText, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/feedback';
import { OrderStatusBadge } from '@/components/order/order-detail';
import { useMyOrders, useMyQuotations } from '@/lib/api/account';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPKR } from '@/lib/utils';

/** Account dashboard: the three things a returning buyer actually wants. */
export default function AccountDashboard(): JSX.Element {
  const { user } = useAuth();
  const orders = useMyOrders(1);
  const quotations = useMyQuotations(1);

  const recentOrders = orders.data?.items.slice(0, 4) ?? [];
  const openQuotes = quotations.data?.items.filter((q) => ['quoted', 'negotiating'].includes(q.status)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
          Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your orders, quotations and saved addresses.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Orders placed', value: orders.data?.meta.total ?? 0, Icon: Package, href: '/account/orders' },
          { label: 'Quotations', value: quotations.data?.meta.total ?? 0, Icon: FileText, href: '/account/quotations' },
          { label: 'Awaiting your reply', value: openQuotes.length, Icon: MapPin, href: '/account/quotations' },
        ].map(({ label, value, Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border border-border bg-white p-5 transition-colors hover:border-brand-cyan"
          >
            <Icon className="size-5 text-brand-cyan" aria-hidden />
            <dt className="mt-3 text-xs text-muted-foreground">{label}</dt>
            <dd className="font-heading text-2xl font-extrabold text-brand-navy">{value}</dd>
          </Link>
        ))}
      </dl>

      {openQuotes.length > 0 ? (
        <section className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Quotations awaiting your response
          </h2>
          <ul className="mt-3 space-y-2">
            {openQuotes.slice(0, 3).map((quote) => (
              <li key={quote.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link
                  href={`/account/quotations/${quote.quoteNumber}`}
                  className="font-mono font-medium text-brand-navy hover:text-brand-cyan"
                >
                  {quote.quoteNumber}
                </Link>
                <span className="font-semibold tabular-nums">
                  {typeof quote.quotedTotal === 'number' ? formatPKR(quote.quotedTotal) : 'Pricing'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Recent orders
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/orders">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {orders.isPending ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No orders yet.{' '}
            <Link href="/products" className="text-brand-cyan hover:underline">
              Browse the catalogue
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="font-mono text-sm font-medium text-brand-navy hover:text-brand-cyan"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="text-2xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.orderStatus} />
                  <span className="font-semibold tabular-nums">{formatPKR(order.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

## `client/src/app/account/orders/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { OrderStatusBadge } from '@/components/order/order-detail';
import { useMyOrders } from '@/lib/api/account';
import { formatDate, formatPKR } from '@/lib/utils';

export default function MyOrdersPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isPending } = useMyOrders(page);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        My Orders
      </h1>

      {isPending ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No orders yet"
          description="Orders you place will appear here with their full history."
          icon={<Package />}
          action={
            <Button asChild variant="cta">
              <Link href="/products">Browse the catalogue</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-cyan"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand-navy">{order.orderNumber}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {formatDate(order.createdAt)} · {order.items.length} line
                      {order.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.orderStatus} />
                    <span className="font-heading font-bold tabular-nums text-brand-navy">
                      {formatPKR(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
```

## `client/src/app/account/quotations/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { useMyQuotations } from '@/lib/api/account';
import { formatDate, formatPKR } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'> = {
  new: 'muted',
  reviewing: 'muted',
  quoted: 'accent',
  negotiating: 'warning',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
  converted: 'success',
};

export default function MyQuotationsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isPending } = useMyQuotations(page);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        My Quotations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Requests you have sent and the prices we came back with.
      </p>

      {isPending ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No quotations yet"
          description="Add quote-only products to your inquiry list and send us a request."
          icon={<FileText />}
          action={
            <Button asChild variant="cta">
              <Link href="/inquiry">Open my inquiry list</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {data.items.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/account/quotations/${quote.quoteNumber}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-cyan"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand-navy">{quote.quoteNumber}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {formatDate(quote.createdAt)} · {quote.items.length} line
                      {quote.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[quote.status] ?? 'muted'}>{quote.status}</Badge>
                    <span className="font-heading font-bold tabular-nums text-brand-navy">
                      {typeof quote.quotedTotal === 'number' ? formatPKR(quote.quotedTotal) : '—'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
```

## `client/src/app/account/addresses/page.tsx`

```tsx
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
```

## `client/src/app/account/profile/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { BadgeCheck, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { useUpdateProfile } from '@/lib/api/account';
import { useAuth } from '@/lib/auth-context';
import { profileSchema } from '@/lib/forms';

type ProfileInput = z.infer<typeof profileSchema>;

export default function ProfilePage(): JSX.Element {
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      companyName: user?.companyName ?? '',
      ntn: user?.ntn ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateProfile.mutateAsync({
        name: values.name,
        phone: values.phone,
        companyName: values.companyName || null,
        ntn: values.ntn || null,
      });
      setUser(updated);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        Profile
      </h1>

      {user && !user.isEmailVerified ? (
        <Alert variant="warning" title="Email not verified" className="mt-4">
          Check your inbox for the verification link so we can send you order updates.
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4 rounded-lg border border-border bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pr-name" required error={errors.name?.message}>
            <Input id="pr-name" {...register('name')} hasError={Boolean(errors.name)} />
          </Field>

          <Field label="Phone / WhatsApp" htmlFor="pr-phone" required error={errors.phone?.message}>
            <Input id="pr-phone" type="tel" {...register('phone')} hasError={Boolean(errors.phone)} />
          </Field>

          <Field label="Company" htmlFor="pr-company">
            <Input id="pr-company" {...register('companyName')} />
          </Field>

          <Field
            label="NTN / CNIC"
            htmlFor="pr-ntn"
            hint="For tax invoices on business purchases."
            error={errors.ntn?.message}
          >
            <Input id="pr-ntn" {...register('ntn')} hasError={Boolean(errors.ntn)} />
          </Field>
        </div>

        <div className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <BadgeCheck className="size-3.5 text-brand-cyan" aria-hidden />
            Email: <span className="font-medium text-foreground">{user?.email}</span>
          </p>
          <p className="mt-1">
            To change your email address, contact us on +92 324 4234990 — we verify it manually to
            protect your order history.
          </p>
        </div>

        <Button type="submit" variant="cta" isLoading={isSubmitting} disabled={!isDirty}>
          <Save />
          Save changes
        </Button>
      </form>
    </div>
  );
}
```

## `client/src/app/account/password/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { useChangePassword } from '@/lib/api/account';
import { changePasswordSchema } from '@/lib/forms';

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage(): JSX.Element {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast.success('Password changed', { description: 'Other devices have been signed out.' });
    } catch (error) {
      toast.error('Could not change your password', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        Change Password
      </h1>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-5 max-w-md space-y-4 rounded-lg border border-border bg-white p-6"
      >
        <Field label="Current password" htmlFor="cp-current" required error={errors.currentPassword?.message}>
          <Input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
            hasError={Boolean(errors.currentPassword)}
          />
        </Field>

        <Field
          label="New password"
          htmlFor="cp-new"
          required
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.message}
        >
          <Input
            id="cp-new"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            hasError={Boolean(errors.newPassword)}
          />
        </Field>

        <Field label="Confirm new password" htmlFor="cp-confirm" required error={errors.confirm?.message}>
          <Input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
            hasError={Boolean(errors.confirm)}
          />
        </Field>

        <Alert variant="info" className="text-xs">
          Changing your password signs out every other device.
        </Alert>

        <Button type="submit" variant="cta" isLoading={isSubmitting} loadingText="Saving…">
          <KeyRound />
          Change password
        </Button>
      </form>
    </div>
  );
}
```

## `client/src/app/account/wishlist/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';

/**
 * Wishlist.
 *
 * There is no wishlist model or endpoint in the API yet (Phase 2 defined 15
 * models and this was not among them). Rather than fake it with localStorage
 * and quietly lose the data on a new device, the screen states the position
 * and points at the inquiry list, which already does the "save for later" job
 * for trade buyers.
 */
export default function WishlistPage(): JSX.Element {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        Wishlist
      </h1>

      <Alert variant="info" title="Not available yet" className="mt-4">
        The wishlist needs a saved-items model on the API, which is not built yet. In the meantime
        your <strong>inquiry list</strong> does the same job and survives across devices once you
        are signed in.
      </Alert>

      <EmptyState
        className="mt-5"
        title="Nothing saved"
        description="Use the inquiry list to keep products together and request a price when you are ready."
        icon={<Heart />}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="cta" size="sm">
              <Link href="/inquiry">Open my inquiry list</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
```

## `client/src/app/account/layout.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, initialsOf } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/account', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/account/orders', label: 'Orders', Icon: Package },
  { href: '/account/quotations', label: 'Quotations', Icon: FileText },
  { href: '/account/wishlist', label: 'Wishlist', Icon: Heart },
  { href: '/account/addresses', label: 'Addresses', Icon: MapPin },
  { href: '/account/profile', label: 'Profile', Icon: UserRound },
  { href: '/account/password', label: 'Password', Icon: KeyRound },
] as const;

/** Account shell: sidebar navigation plus a sign-in guard. */
export default function AccountLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  const onSignOut = async (): Promise<void> => {
    await apiClient.post('/auth/logout').catch(() => undefined);
    signOut();
    router.push('/');
    router.refresh();
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Please sign in"
          description="Your orders, quotations and addresses live behind a sign-in."
          icon={<UserRound />}
          action={
            <Button asChild variant="cta">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'My account' }]} className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Avatar>
              <AvatarFallback>{initialsOf(user?.name ?? 'Guest')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-navy">{user?.name}</p>
              <p className="truncate text-2xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <nav aria-label="Account" className="mt-3">
            <ul className="space-y-0.5">
              {NAV.map(({ href, label, Icon }) => {
                const active = href === '/account' ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand-navy text-white'
                          : 'text-foreground hover:bg-brand-navy/5 hover:text-brand-navy',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Button
            variant="ghost"
            size="sm"
            block
            className="mt-3 justify-start text-muted-foreground hover:text-destructive"
            onClick={() => void onSignOut()}
          >
            <LogOut />
            Sign out
          </Button>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
```

## `client/src/app/order-confirmation/[orderNumber]/page.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/feedback';
import { OrderDetail, OrderStatusBadge } from '@/components/order/order-detail';
import { useTrackOrder } from '@/lib/api/mutations';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

/**
 * Order confirmation.
 *
 * Client-rendered and never indexed — an order number plus email is the only
 * key, and we do not want these pages in a sitemap or a crawler's cache.
 */
export default function OrderConfirmationPage(): JSX.Element {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const orderNumber = params.orderNumber;
  const email = searchParams.get('email') ?? '';

  const lookup = useTrackOrder();
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    // The server already emptied the cart; clear the local mirror too.
    clearCart('shopping');
    lookup.mutate({ orderNumber, email });
    // Intentionally runs once per order number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const order = lookup.data;

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-9" aria-hidden />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
          Thank you — order received
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order number is{' '}
          <span className="font-mono font-bold text-brand-navy">{orderNumber}</span>. A confirmation
          email is on its way.
        </p>
        {order ? (
          <div className="mt-3 flex justify-center">
            <OrderStatusBadge status={order.orderStatus} />
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
        <Button asChild variant="outline" size="sm">
          <a
            href={whatsappLink(
              CONTACT.whatsappDigits,
              `Hello Fast Traders, I have just placed order ${orderNumber}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            Message us about this order
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>

      <div className="mt-10">
        {lookup.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : lookup.isError || !order ? (
          <Alert variant="info" title="Order placed">
            We could not load the full details on this device. Use{' '}
            <Link href="/track-order" className="font-medium">
              track your order
            </Link>{' '}
            with <span className="font-mono">{orderNumber}</span> and the email you checked out
            with, or call us on {CONTACT.mobile}.
          </Alert>
        ) : (
          <OrderDetail order={order} />
        )}
      </div>
    </div>
  );
}
```

## `client/src/app/reset-password/[token]/page.tsx`

```tsx
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/password-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Set a new password',
  description: 'Choose a new password for your Fast Traders account.',
  path: '/reset-password',
  noIndex: true,
});

export default function ResetPasswordPage({ params }: { params: { token: string } }): JSX.Element {
  return (
    <AuthShell title="Set a new password" description="Choose something you have not used here before.">
      <ResetPasswordForm token={params.token} />
    </AuthShell>
  );
}
```

## `client/src/app/account/orders/[orderNumber]/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { OrderDetail, OrderStatusBadge } from '@/components/order/order-detail';
import { useOrder } from '@/lib/api/account';
import { formatDate } from '@/lib/utils';

export default function AccountOrderPage(): JSX.Element {
  const params = useParams<{ orderNumber: string }>();
  const { data: order, isPending, isError, refetch } = useOrder(params.orderNumber);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/account/orders">
          <ArrowLeft />
          All orders
        </Link>
      </Button>

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !order ? (
        <ErrorState title="Order not found" onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
                {order.orderNumber}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.orderStatus} />
          </div>

          <OrderDetail order={order} />
        </>
      )}
    </div>
  );
}
```

## `client/src/app/account/quotations/[quoteNumber]/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, MessageSquare, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/input';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { useQuotation } from '@/lib/api/account';
import { useRespondToQuotation } from '@/lib/api/mutations';
import { formatDate, formatPKR } from '@/lib/utils';

/** Quotation detail with the customer-side accept / reject / counter actions. */
export default function QuotationDetailPage(): JSX.Element {
  const params = useParams<{ quoteNumber: string }>();
  const { data: quote, isPending, isError, refetch } = useQuotation(params.quoteNumber);
  const respond = useRespondToQuotation();
  const [message, setMessage] = useState('');

  const canRespond = quote ? ['quoted', 'negotiating'].includes(quote.status) : false;
  const expired = quote?.validUntil ? new Date(quote.validUntil).getTime() < Date.now() : false;

  const act = async (action: 'accept' | 'reject' | 'counter'): Promise<void> => {
    if (!quote) return;
    if (action === 'counter' && message.trim().length === 0) {
      toast.error('Tell us what you would like changed');
      return;
    }

    try {
      await respond.mutateAsync({ id: quote.id, action, ...(message ? { message } : {}) });
      setMessage('');
      await refetch();
      toast.success(
        action === 'accept' ? 'Quotation accepted' : action === 'reject' ? 'Quotation rejected' : 'Counter-offer sent',
      );
    } catch (error) {
      toast.error('Could not send your response', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/account/quotations">
          <ArrowLeft />
          All quotations
        </Link>
      </Button>

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !quote ? (
        <ErrorState title="Quotation not found" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
                {quote.quoteNumber}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Sent {formatDate(quote.createdAt)}
                {quote.validUntil ? ` · valid until ${formatDate(quote.validUntil)}` : ''}
              </p>
            </div>
            <Badge variant={quote.status === 'accepted' ? 'success' : 'accent'}>{quote.status}</Badge>
          </div>

          {expired && canRespond ? (
            <Alert variant="warning" title="This quotation has expired">
              Prices move with the exchange rate. Send a fresh request and we will requote.
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase">Item</th>
                  <th className="px-4 py-2.5 text-center text-2xs font-semibold uppercase">Qty</th>
                  <th className="px-4 py-2.5 text-right text-2xs font-semibold uppercase">Unit</th>
                  <th className="px-4 py-2.5 text-right text-2xs font-semibold uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.items.map((item) => (
                  <tr key={item.sku}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="font-mono text-2xs text-muted-foreground">{item.sku}</p>
                      {item.customerNote ? (
                        <p className="mt-1 text-2xs italic text-muted-foreground">“{item.customerNote}”</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {typeof item.quotedUnitPrice === 'number' ? formatPKR(item.quotedUnitPrice) : 'Pending'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {typeof item.quotedTotal === 'number' ? formatPKR(item.quotedTotal) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {typeof quote.quotedTotal === 'number' ? (
              <dl className="space-y-1.5 border-t border-border bg-surface px-4 py-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatPKR(quote.quotedSubtotal ?? 0)}</dd>
                </div>
                {quote.quotedTax ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sales tax</dt>
                    <dd className="tabular-nums">{formatPKR(quote.quotedTax)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-2">
                  <dt className="font-heading font-bold text-brand-navy">Quoted total</dt>
                  <dd className="font-heading text-lg font-bold tabular-nums text-brand-navy">
                    {formatPKR(quote.quotedTotal)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="border-t border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
                Our team is still pricing this request.
              </p>
            )}
          </div>

          {canRespond && !expired ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                Your response
              </h2>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional for accept or reject; required if you want to counter."
                aria-label="Message to Fast Traders"
                className="mt-3"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="cta" isLoading={respond.isPending} onClick={() => void act('accept')}>
                  <Check />
                  Accept quotation
                </Button>
                <Button variant="outline" onClick={() => void act('counter')} disabled={respond.isPending}>
                  <MessageSquare />
                  Send counter-offer
                </Button>
                <Button variant="ghost" onClick={() => void act('reject')} disabled={respond.isPending}>
                  <X />
                  Decline
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
```

## `client/src/app/sitemap.ts`

```ts
import type { MetadataRoute } from 'next';
import { getBrands, getCategoryTree, getProducts } from '@/lib/api/catalog';
import { SITE } from '@/lib/constants';
import type { CategoryNode } from '@/lib/api/types';

/**
 * Dynamic sitemap.
 *
 * Regenerated hourly. Product URLs are pulled in pages of 100 with a hard cap,
 * so a catalogue that grows to thousands of SKUs cannot time the route out.
 */
export const revalidate = 3600;

const MAX_PRODUCTS = 5000;
const PAGE_SIZE = 100;

const STATIC_ROUTES: { path: string; priority: number; frequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, frequency: 'daily' },
  { path: '/products', priority: 0.9, frequency: 'daily' },
  { path: '/brands', priority: 0.7, frequency: 'weekly' },
  { path: '/industries', priority: 0.6, frequency: 'monthly' },
  { path: '/about', priority: 0.6, frequency: 'monthly' },
  { path: '/contact', priority: 0.7, frequency: 'monthly' },
  { path: '/request-quote', priority: 0.8, frequency: 'monthly' },
  { path: '/faq', priority: 0.5, frequency: 'monthly' },
  { path: '/track-order', priority: 0.5, frequency: 'yearly' },
  { path: '/shipping-returns', priority: 0.4, frequency: 'yearly' },
  { path: '/privacy-policy', priority: 0.3, frequency: 'yearly' },
  { path: '/terms', priority: 0.3, frequency: 'yearly' },
];

/** Depth-first walk so nested categories are all included. */
function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.frequency,
    priority: route.priority,
  }));

  const [tree, brands] = await Promise.all([getCategoryTree(), getBrands()]);

  for (const category of flattenCategories(tree ?? [])) {
    entries.push({
      url: `${SITE.url}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: category.level === 0 ? 0.8 : 0.6,
    });
  }

  for (const brand of brands ?? []) {
    entries.push({
      url: `${SITE.url}/brands/${brand.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  let page = 1;
  while (entries.length < MAX_PRODUCTS) {
    const result = await getProducts({ page, limit: PAGE_SIZE, sort: 'newest' }, { revalidate: 3600 });
    if (!result || result.items.length === 0) break;

    for (const product of result.items) {
      entries.push({
        url: `${SITE.url}/products/${product.slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: product.isFeatured ? 0.8 : 0.7,
      });
    }

    if (!result.meta.hasNext) break;
    page += 1;
  }

  return entries;
}
```

## `client/src/app/robots.ts`

```ts
import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

/** Dynamic robots.txt. Account, cart and checkout are never indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/cart',
          '/inquiry',
          '/checkout',
          '/order-confirmation',
          '/style-guide',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
```
