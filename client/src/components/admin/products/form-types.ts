import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from './form-schema';

/**
 * The form handle, loosened at the third generic.
 *
 * zod `.default()` makes a field optional going in and required coming out, so
 * RHF's transformed-values generic does not line up with a plain
 * `UseFormReturn<Values>`. Widening it here is contained to one alias; the
 * alternative is a cast at every tab call site.
 *
 * Lives in its own module because the tab panels are split across two files —
 * `form-tabs.tsx` was over the 300-line rule once availability and
 * sub-category got the controls they had always been missing.
 */
export type Form = UseFormReturn<ProductFormValues, unknown, ProductFormValues>;

/**
 * Flat category/brand lists for the selects.
 *
 * `level` drives the indent; `parent` is what lets the sub-category select
 * offer only the children of the chosen category.
 */
export type Taxonomy = { id: string; name: string; level?: number; parent?: string | null }[];
