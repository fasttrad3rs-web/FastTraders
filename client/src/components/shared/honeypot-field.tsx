'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

/**
 * The honeypot input, shared by all three public forms.
 *
 * Hidden from people, not from a bot that fills every input it finds:
 *
 *   - positioned off-screen rather than `display:none`, because some bots skip
 *     anything they can tell is not rendered
 *   - `aria-hidden` and `tabIndex={-1}` keep it away from screen readers and
 *     keyboard users, who would otherwise land on a field they cannot see
 *   - `autoComplete="off"` stops a password manager helpfully filling it and
 *     getting a real customer silently discarded
 *
 * The `id` is per-form because two of these can be on one page (a product page
 * carries both an inquiry form and the sourcing CTA), and duplicate ids would
 * break the label association for the one that lost.
 */
export function HoneypotField({
  id,
  registration,
}: {
  id: string;
  registration: UseFormRegisterReturn;
}): JSX.Element {
  return (
    <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
      <label htmlFor={id}>Leave this field empty</label>
      <input id={id} type="text" tabIndex={-1} autoComplete="off" {...registration} />
    </div>
  );
}
