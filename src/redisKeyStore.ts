import {
  BaseKeyStore,
  IKeyStoreContextProvider,
  IKeyStoreValueProvider,
} from '@bryopsida/key-store'
import { Redis } from 'ioredis'
import { Logger } from 'pino'

/**
 * A child class of BaseKeyStore that stores the keys in Redis
 */
export class RedisKeyStore extends BaseKeyStore {
  private readonly redisClient: Redis
  private readonly keyPrefix: string
  private readonly logger: Logger

  /**
   *
   * @param {Logger} logger Pino Logger instance
   * @param {Redis} redisClient Redis client
   * @param {string} keyPrefix prefix for keys, can be an anchor when using redis cluster
   * @param {IKeyStoreValueProvider} keyStorePasswordProvider Fetch the password for the store
   * @param {IKeyStoreValueProvider} keyStoreSaltProvider Fetch the salt for the store
   * @param {IKeyStoreContextProvider} keyStoreContextProvider Fetch the context for the store
   */
  constructor(
    logger: Logger,
    redisClient: Redis,
    keyPrefix: string,
    keyStorePasswordProvider: IKeyStoreValueProvider,
    keyStoreSaltProvider: IKeyStoreValueProvider,
    keyStoreContextProvider: IKeyStoreContextProvider
  ) {
    super(
      keyStorePasswordProvider,
      keyStoreSaltProvider,
      keyStoreContextProvider
    )
    this.logger = logger
    this.redisClient = redisClient
    this.keyPrefix = keyPrefix || 'hermes-key-store'
  }

  /**
   * @Inheritdoc
   */
  protected async putKeyInSlot(keySlot: string, key: Buffer): Promise<void> {
    this.logger.trace(`Putting key in slot ${this.keyPrefix}:${keySlot}`)
    await this.redisClient.set(
      `{${this.keyPrefix}:${keySlot}}`,
      key.toString('base64')
    )
  }

  /**
   * @Inheritdoc
   */
  protected async getKeyInSlot(keySlot: string): Promise<Buffer> {
    this.logger.trace(`Getting key in slot ${this.keyPrefix}:${keySlot}`)
    const val = await this.redisClient.get(`{${this.keyPrefix}:${keySlot}}`)
    if (val) {
      return Buffer.from(val, 'base64')
    } else {
      throw new Error('Key not found')
    }
  }

  /**
   * @Inheritdoc
   */
  protected async deleteKeySlot(keySlot: string): Promise<void> {
    await this.redisClient.del(`{${this.keyPrefix}:${keySlot}}`)
  }

  /**
   * @Inheritdoc
   */
  protected async clearKeySlots(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const pattern = `{${this.keyPrefix}:*`
        this.logger.info(`Clearing keys matching pattern ${pattern}`)
        const scanStream = this.redisClient.scanStream({
          match: pattern,
        })
        scanStream.on('data', (keys: string[]) => {
          this.logger.info(`Deleting ${keys.length} keys`)
          keys.forEach((key) => {
            this.redisClient.del(key)
          })
        })
        const timeout = setTimeout(() => {
          scanStream.destroy()
          reject(new Error('Timeout while clearing keys'))
        }, 10000)
        scanStream.on('end', () => {
          this.logger.info('Finished scanning keys for deletion')
          clearTimeout(timeout)
          resolve()
        })
        scanStream.on('error', (err: Error) => {
          this.logger.error('Error while scanning keys for deletion', err)
          clearTimeout(timeout)
          reject(err)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * @Inheritdoc
   */
  protected async hasKeyInSlot(keySlot: string): Promise<boolean> {
    return (await this.redisClient.exists(`{${this.keyPrefix}:${keySlot}}`)) > 0
  }

  /**
   * @Inheritdoc
   */
  async close(): Promise<void> {
    this.logger.info('Closing redis client')
    this.redisClient.disconnect(false)
  }
}
