import { protectionProducts } from './products.protection';
import { distributionProducts } from './products.distribution';
import { automationProducts } from './products.automation';
import { sensingProducts } from './products.sensing';
import { componentProducts } from './products.components';
import { panelProducts } from './products.panel';
import { powerProducts } from './products.power';
import type { ProductSeed } from './types';

/** Every seed product, in catalogue order. */
export const products: ProductSeed[] = [
  ...protectionProducts,
  ...distributionProducts,
  ...automationProducts,
  ...sensingProducts,
  ...componentProducts,
  ...panelProducts,
  ...powerProducts,
];
