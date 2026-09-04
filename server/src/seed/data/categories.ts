import { categoriesCore } from './categories.core';
import { categoriesExtra } from './categories.extra';
import type { CategorySeed } from './types';

/**
 * The full tree, in insert order — parents must precede their children.
 * Split across two files only to keep each under the 300-line ceiling.
 */
export const categories: CategorySeed[] = [...categoriesCore, ...categoriesExtra];
