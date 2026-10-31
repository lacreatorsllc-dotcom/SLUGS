import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleFrom, postUrlFrom, shillPost, telegramFrom, ticketsFor } from '../src/lib/shill.ts'

const none = { why: '', friend: '', friendWhy: '' }

test('the post always tags SLUGS and links the site, boosts or not', () => {
  const post = shillPost(none, 'slugsrun')
  assert.match(post, /^Hey @slugsrun I want access to SLUGS\./)
  assert.match(post, /slugs\.run$/)
  assert.equal(ticketsFor(none), 1)
})

test('each boost goes in the post and adds its tickets', () => {
  const all = { why: 'I want my own agent', friend: '@pal', friendWhy: 'you trade better than me' }
  assert.equal(shillPost(all, 'slugsrun'), 'Hey @slugsrun I want access to SLUGS: I want my own agent\n\n@pal you trade better than me\n\nslugs.run')
  assert.equal(ticketsFor(all), 6)
  assert.equal(ticketsFor({ ...none, why: 'x' }), 2)
  assert.equal(ticketsFor({ ...none, friend: 'pal' }), 3)
  // Why the friend should come counts only with a friend to tag.
  assert.equal(ticketsFor({ ...none, friendWhy: 'x' }), 1)
  assert.doesNotMatch(shillPost({ ...none, friendWhy: 'x' }, 'slugsrun'), /\bx\b/)
})

test('handles, post links and Telegram usernames are read the way people paste them', () => {
  assert.equal(handleFrom('https://x.com/pal?s=20'), 'pal')
  assert.equal(handleFrom('not a handle'), '')
  assert.equal(postUrlFrom('https://twitter.com/me/status/123?s=20'), 'https://x.com/me/status/123')
  assert.equal(postUrlFrom('x.com/me/status/9'), 'https://x.com/me/status/9')
  assert.equal(postUrlFrom('https://x.com/me'), null)
  assert.equal(telegramFrom('@someone'), 'someone')
  assert.equal(telegramFrom('https://t.me/someone_1'), 'someone_1')
  assert.equal(telegramFrom('abc'), '')
})
