// Copies the static frontend to dist/ and adds the Supabase browser client.
import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'dist/assets/supabase.js');
console.log('Built Pixel Payment frontend into dist/.');
