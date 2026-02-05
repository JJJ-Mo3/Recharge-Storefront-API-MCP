/**
 * Tools index - aggregates all MCP tools
 * Last updated: 2026-02-05
 */
import { customerTools } from './customer-tools.js';
import { subscriptionTools } from './subscription-tools.js';
import { addressTools } from './address-tools.js';
import { orderTools } from './order-tools.js';
import { paymentTools } from './payment-tools.js';
import { productTools } from './product-tools.js';
import { planTools } from './plan-tools.js';
import { chargeTools } from './charge-tools.js';
import { onetimeTools } from './onetimes-tools.js';
import { bundleTools } from './bundle-tools.js';
import { utilityTools } from './utility-tools.js';
import { authTools } from './auth-tools.js';
import { collectionTools } from './collection-tools.js';
import { creditTools } from './credit-tools.js';
import { giftTools } from './gift-tools.js';
import { metafieldTools } from './metafield-tools.js';

export const tools = [
  ...customerTools,
  ...subscriptionTools,
  ...addressTools,
  ...orderTools,
  ...paymentTools,
  ...productTools,
  ...planTools,
  ...chargeTools,
  ...onetimeTools,
  ...bundleTools,
  ...utilityTools,
  ...authTools,
  ...collectionTools,
  ...creditTools,
  ...giftTools,
  ...metafieldTools,
];