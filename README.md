# Redis-Key-Store

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_redis-key-store&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=bryopsida_redis-key-store) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_redis-key-store&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=bryopsida_redis-key-store) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_redis-key-store&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=bryopsida_redis-key-store) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_redis-key-store&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=bryopsida_redis-key-store)

## What is this?

This is a implenetation of [@bryopsida/key-store](http://github.com/bryopsida/key-store) using redis as a backing store for use in distributed systems.

## How do I use it?

```typescript
import { Redis } from 'ioredis'
import { describe, expect, it } from '@jest/globals'
import { randomBytes, randomUUID } from 'crypto'
import pino from 'pino'

// create a redis client
const redisClient: Redis = new Redis(6379, 'localhost')

// fetch your key for the store
let password: Buffer // 32 bytes
let salt: Buffer // 16 bytes
let context: Buffer // 32 bytes

// create a logger
const logger: Logger = pino()
const keyPrefix: string = 'keys'

// create the key store
const store = new RedisKeyStore(
  logger,
  redisClient,
  keyPrefix,
  () => Promise.resolve(password),
  () => Promise.resolve(salt),
  () => Promise.resolve(context)
)

it('can manage a DEK', async () => {
  // create random data to act as key store
  const dek = randomBytes(32)
  const id = randomUUID()

  // save it
  await keyStore.saveSealedDataEncKey(id, dek)

  // ask for it back
  const fetchedDek = await keyStore.fetchSealedDataEncKey(id)

  // should be the same
  expect(fetchedDek).toEqual(dek)

  // delete it
  await keyStore.destroySealedDataEncKey(id)
})
```
