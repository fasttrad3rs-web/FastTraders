import Image from 'next/image';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { imageProps } from '@/lib/images';
import { formatPKR } from '@/lib/utils';
import type { AdminInquiry } from '@/lib/api/inquiries';
import type { ReferenceFile } from '@/types';

/**
 * The item lines and the sourcing brief.
 *
 * Each line shows internal cost and last quoted price next to the quantity,
 * because the job on this screen is a phone call where somebody has to say a
 * number out loud. Making them open a second tab is how the wrong number gets
 * said.
 */
export function InquiryBody({ inquiry }: { inquiry: AdminInquiry }): JSX.Element {
  return (
    <>
      {/* ---------------------------- Items -------------------------- */}
      {inquiry.items.length > 0 ? (
        <Card className="p-5">
          <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Items
          </h2>
          <p className="mb-3 text-2xs text-muted-foreground">
            Cost and last quoted price are internal. They are here so the number said on the
            call is the right one.
          </p>

          <ul className="divide-y divide-border">
            {inquiry.items.map((item) => {
              const product = typeof item.product === 'string' ? null : item.product;

              return (
                <li key={item.sku} className="flex flex-wrap gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="font-mono text-2xs text-muted-foreground">
                      {item.sku}
                      {item.brand ? ` · ${item.brand}` : ''}
                    </p>
                    {item.note ? (
                      <p className="mt-1 rounded bg-surface px-2 py-1 text-2xs">{item.note}</p>
                    ) : null}
                  </div>

                  <div className="text-right text-xs">
                    <p className="font-semibold tabular-nums">
                      {item.qty} {item.unit}
                    </p>
                    {product ? (
                      <>
                        <p className="text-2xs text-muted-foreground">
                          Stock {product.stock ?? 0} · {product.availability}
                        </p>
                        <p className="text-2xs tabular-nums text-muted-foreground">
                          Cost{' '}
                          {typeof product.internalCost === 'number'
                            ? formatPKR(product.internalCost)
                            : '—'}{' '}
                          · Last quoted{' '}
                          {typeof product.lastQuotedPrice === 'number'
                            ? formatPKR(product.lastQuotedPrice)
                            : '—'}
                        </p>
                        {product.supplierNotes ? (
                          <p className="mt-1 max-w-xs text-2xs italic text-muted-foreground">
                            {product.supplierNotes}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {/* -------------------------- Sourcing ------------------------- */}
      {inquiry.sourcingDetails ? (
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            China sourcing request
          </h2>
          <p className="mb-3 whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm">
            {inquiry.sourcingDetails.itemDescription}
          </p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Preferred brand" value={inquiry.sourcingDetails.preferredBrand} />
            <Row label="Part number" value={inquiry.sourcingDetails.partNumber} />
            <Row label="Specifications" value={inquiry.sourcingDetails.specifications} />
            <Row
              label="Quantity"
              value={
                inquiry.sourcingDetails.quantity
                  ? `${inquiry.sourcingDetails.quantity} ${inquiry.sourcingDetails.unit ?? ''}`
                  : undefined
              }
            />
            <Row label="Urgency" value={inquiry.sourcingDetails.urgency} />
            <Row label="Application" value={inquiry.sourcingDetails.application} />
          </dl>

          <Attachments files={inquiry.sourcingDetails.referenceFiles} />
        </Card>
      ) : null}

    </>
  );
}

/**
 * What the customer actually sent.
 *
 * Usually a phone photo of a nameplate, and usually the only place the part
 * number exists in a readable form — so it is shown, not linked. Staff work
 * this screen with the customer on the phone; making them open Cloudinary to
 * read a rating is how the call goes badly.
 *
 * Documents are links: a datasheet has to be opened anyway, and `raw` assets
 * download as the original file.
 */
function Attachments({ files }: { files: ReferenceFile[] }): JSX.Element | null {
  if (files.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
        Attachments ({files.length})
      </h3>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((file) => (
          <li key={file.publicId} className="overflow-hidden rounded-lg border border-border">
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="group block">
              {file.type.startsWith('image/') ? (
                <span className="relative block h-28 bg-surface">
                  <Image
                    {...imageProps(file.url)}
                    alt={file.name}
                    fill
                    sizes="200px"
                    className="object-cover transition-opacity group-hover:opacity-90"
                  />
                </span>
              ) : (
                <span className="flex h-28 items-center justify-center bg-surface">
                  <FileText className="size-8 text-brand-navy/40" aria-hidden />
                </span>
              )}

              <span className="block truncate p-2 text-2xs font-medium text-brand-navy group-hover:text-brand-cyan">
                {file.name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }): JSX.Element | null {
  if (!value) return null;

  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}
