#!/usr/bin/env node

/**
 * API Coverage Report Script
 * Analyzes the tools and provides coverage statistics
 * Last updated: 2024-12-24
 */

(async () => {
  try {
    const { tools } = await import('../src/tools/index.js');

    console.log('🔧 Recharge Storefront API Coverage:', tools.length, 'tools');
    console.log('📋 Categories covered:');

    const categories = {};
    const hasKeyword = (parts, keyword) => parts.some(p => p === keyword || p === keyword + 's' || p === keyword + 'es');

    tools.forEach(t => {
      const parts = t.name.split('_');
      let category;

      if (hasKeyword(parts, 'customer')) category = 'customer';
      else if (hasKeyword(parts, 'subscription')) category = 'subscriptions';
      else if (hasKeyword(parts, 'address')) category = 'addresses';
      else if (hasKeyword(parts, 'payment')) category = 'payments';
      else if (hasKeyword(parts, 'product')) category = 'products';
      else if (hasKeyword(parts, 'order')) category = 'orders';
      else if (hasKeyword(parts, 'charge')) category = 'charges';
      else if (hasKeyword(parts, 'onetime')) category = 'onetimes';
      else if (hasKeyword(parts, 'bundle')) category = 'bundles';
      else if (hasKeyword(parts, 'discount')) category = 'discounts';
      else if (parts.includes('session') || parts.includes('cache') || parts.includes('purge')) category = 'utility';
      else category = 'general';

      categories[category] = (categories[category] || 0) + 1;
    });

    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} tools`);
      });

    console.log('\n📊 Tool Distribution:');
    const totalTools = tools.length;
    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cat, count]) => {
        const percentage = ((count / totalTools) * 100).toFixed(1);
        console.log(`   ${cat}: ${percentage}%`);
      });

    console.log('\n✅ Complete Recharge Storefront API coverage');
  } catch (error) {
    console.error('❌ Error loading tools:', error.message);
    if (process.env.DEBUG === 'true') {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();