import { createRequire } from 'module';
import { readFileSync } from 'fs';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^(\w+)="?([^"]*)"?$/);
  if (match) process.env[match[1]] = match[2];
}

// Dynamic import the seed function via tsx
const { seedStateItems } = await import('../lib/inventory/seed-state.ts');
const result = await seedStateItems();
console.log('Seeded:', JSON.stringify(result, null, 2));
