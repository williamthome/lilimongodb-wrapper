import { MongoDbWrapper } from '@/mongodb-wrapper'
import { MongoMemoryServer } from 'mongodb-memory-server'

/**
 * @see https://github.com/nodkz/mongodb-memory-server#simple-jest-test-example
 */
describe('MongoDbWrapper', () => {
  // May require additional time for downloading MongoDB binaries
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000

  let sut: MongoDbWrapper<unknown>
  let mongoServer: MongoMemoryServer
  let dbUri: string

  function makeSut() {
    sut = new MongoDbWrapper(dbUri)
    const collectionName = 'fooCollection'
    const expected = { foo: 'foo' }
    const by: keyof typeof expected = 'foo'
    const matching = expected[by]
    const as = { foo: 'bar' }
    const updated = { id: 0, foo: 'bar' }
    return { sut, collectionName, expected, by, matching, as, updated }
  }

  beforeAll(async () => {
    mongoServer = new MongoMemoryServer()
    dbUri = await mongoServer.getUri()
  })

  afterAll(async () => {
    sut.isConnected && (await sut.disconnect())
    await mongoServer.stop()
  })

  describe('IDatabaseConnection', () => {
    it('should connect and disconnect', async () => {
      const { sut } = makeSut()
      await sut.connect()
      expect(sut.isConnected).toBe(true)
      await sut.disconnect()
      expect(sut.isConnected).toBe(false)
    })
  })

  describe('IDatabaseInsertOne', () => {
    it('should insert one', async () => {
      const { sut, collectionName, expected } = makeSut()
      await sut.connect()
      const result = await sut.insertOne(collectionName, expected)
      expect(result).toEqual(expected)
    })
  })

  describe('IDatabaseGetOne', () => {
    it('should get one', async () => {
      const { sut, collectionName, expected, by, matching } = makeSut()
      await sut.connect()
      await sut.insertOne(collectionName, expected)
      const result = await sut.getOne(collectionName, by, matching)
      expect(result).toEqual(expected)
    })
  })

  describe('IDatabaseUpdateOne', () => {
    it('should update one', async () => {
      const { sut, collectionName, expected, by, matching, as } = makeSut()
      await sut.connect()
      await sut.insertOne(collectionName, expected)
      const result = await sut.updateOne(collectionName, by, matching, as)
      expect(result).toEqual(as)
    })
  })
})
