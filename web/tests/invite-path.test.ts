import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inviteFromPath, refRedirect } from '../src/lib/invite-path.ts'

test('slugs.run/<code> is an invite, the site pages are not', () => {
  assert.equal(inviteFromPath('/ASH-LEAF-85'), 'ASH-LEAF-85')
  assert.equal(inviteFromPath('/SLUGS-7K2Q9X'), 'SLUGS-7K2Q9X')
  assert.equal(inviteFromPath('/leaderboard'), null)
  assert.equal(inviteFromPath('/a/b'), null)
})

test('?ref=<code> on any page goes to the same invite page, the ref taken out', () => {
  assert.equal(refRedirect('?ref=ASH-LEAF-85'), '/ASH-LEAF-85')
  assert.equal(refRedirect('?ref=SLUGS-7K2Q9X&inv=abc'), '/SLUGS-7K2Q9X?inv=abc')
  assert.equal(refRedirect('?inv=abc'), null)
  assert.equal(refRedirect('?ref='), null)
  assert.equal(refRedirect('?ref=burn'), null)
  assert.equal(refRedirect('?ref=bad%2Fcode'), null)
  assert.equal(refRedirect('?ref=-x'), null)
})
