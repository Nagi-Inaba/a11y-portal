import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOwnDatabase } from '../scripts/verify-deploy-target.mjs';

test('only the new direct database or session pooler is deployable', () => {
  for (const url of [
    'postgresql://postgres:dummy@db.zutmkpremkfthdlpgmsi.supabase.co:5432/postgres',
    'postgres://postgres.zutmkpremkfthdlpgmsi:dummy@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ]) assert.equal(isOwnDatabase(url), true);
  for (const url of [
    undefined, '', 'not-a-url',
    'postgres://postgres.gettckbtspwzaacybfaj:dummy@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
    'postgres://postgres.zutmkpremkfthdlpgmsi:dummy@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    'postgres://postgres.zutmkpremkfthdlpgmsi:dummy@attacker.example:5432/postgres',
    'postgres://postgres:zutmkpremkfthdlpgmsi@db.gettckbtspwzaacybfaj.supabase.co:5432/postgres',
  ]) assert.equal(isOwnDatabase(url), false);
});
