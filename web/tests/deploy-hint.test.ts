import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deployHintKey, markDeployHintSeen, shouldShowDeployHint } from '../src/lib/deploy-hint.ts'
import { markWelcomeSeen, welcomeKey } from '../src/lib/welcome.ts'

const profile = (username: string, wallet: string) => ({ username, wallets: [wallet], strategy: null, copy: null })

test('the deploy entry explanation waits for welcome to close and stays off the deploy page', () => {
  const user = profile('first-login', '0xfirst')
  assert.equal(shouldShowDeployHint(null, false, '/home'), false)
  assert.equal(shouldShowDeployHint(user, false, '/home'), false)
  markWelcomeSeen(welcomeKey(user, null)!)
  assert.equal(shouldShowDeployHint(user, true, '/home'), false)
  assert.equal(shouldShowDeployHint(user, false, '/home'), true)
  assert.equal(shouldShowDeployHint(user, false, '/agents'), true)
  assert.equal(shouldShowDeployHint(user, false, '/deploy'), false)
})

test('dismissal belongs to one account and survives its username changing', () => {
  const user = profile('hint-alice', '0xALICE')
  const other = profile('hint-bob', '0xBOB')
  for (const account of [user, other]) markWelcomeSeen(welcomeKey(account, null)!)
  assert.equal(shouldShowDeployHint(user, false, '/home'), true)
  markDeployHintSeen(user)
  assert.equal(shouldShowDeployHint(user, false, '/home'), false)
  assert.equal(shouldShowDeployHint(other, false, '/home'), true)
  const renamed = { ...user, username: 'new-alice', wallets: ['0xalice'] }
  markWelcomeSeen(welcomeKey(renamed, null)!)
  assert.equal(deployHintKey(renamed), deployHintKey(user))
  assert.equal(shouldShowDeployHint(renamed, false, '/home'), false)
})
