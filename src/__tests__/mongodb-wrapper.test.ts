import {
  GetOneFromDb,
  InsertOneInDb,
  UpdateOneInDb,
  UsingConnection,
  IParser,
  IValidator,
  Collection,
  Collections,
} from '@williamthome/lilidb-wrapper'
import { MongoDbWrapper } from '@/mongodb-wrapper'

interface Foo {
  id: string
  foo: string
}
type FooForCreation = Omit<Foo, 'id'>
type FooForUpdate = Partial<FooForCreation>

const fooCreateParser: IParser<FooForCreation, Foo> = {
  parse: async (dto: FooForCreation) => ({
    id: (Math.random() * 999).toString(),
    ...dto,
  }),
}
const fooCreateValidator: IValidator<Error> = {
  validate: async (u: unknown): Promise<void | Error> => {
    if (
      !(u as Foo).foo ||
      typeof (u as Foo).foo !== 'string' ||
      ((u as Foo).foo !== 'foo' && (u as Foo).foo !== 'bar')
    ) {
      return new Error('Foo is required, must be string type and be foo or bar')
    }
  },
}
const fooUpdateValidator: IValidator<Error> = {
  validate: async (u: unknown): Promise<void | Error> => {
    if ('id' in Object(u)) return new Error('Id is readonly')
    if (
      ('foo' in Object(u) && !(u as FooForCreation).foo) ||
      typeof (u as FooForCreation).foo !== 'string' ||
      ((u as Foo).foo !== 'foo' && (u as Foo).foo !== 'bar')
    ) {
      return new Error('Foo is required, must be string type and be foo or bar')
    }
  },
}

type FooCollection = Collections<
  [Collection<'fooCollection', Foo, FooForUpdate, FooForCreation>]
>

const insertOneInDb = new InsertOneInDb<Error, FooCollection>()
const getOneFromDb = new GetOneFromDb<FooCollection>()
const updateOneInDb = new UpdateOneInDb<Error, FooCollection>()
// const { usingTransaction } = new UsingTransaction()
const { usingConnection } = new UsingConnection()

// const db = new MapDbWrapper<FooCollection>()
const db = new MongoDbWrapper(
  'mongodb://localhost:27001,localhost:27002,localhost:27003',
)

describe('Integration', () => {
  it('should test', async () => {
    const result = usingConnection(
      db,
      {
        doThis: async () => {
          const createdFoo = await insertOneInDb.insertOne(
            'fooCollection',
            fooCreateValidator,
            db,
            fooCreateParser,
            { foo: 'foo' },
          )
          console.log({ createdFoo })

          if (createdFoo && !(createdFoo instanceof Error)) {
            const foundedFoo = await getOneFromDb.getOne(
              'fooCollection',
              db,
              'id',
              createdFoo.id,
            )
            console.log({ foundedFoo })

            const updatedFoo = await updateOneInDb.updateOne(
              'fooCollection',
              fooUpdateValidator,
              db,
              'id',
              createdFoo.id,
              { foo: 'bar' },
            )
            console.log({ updatedFoo })

            const validationError = await updateOneInDb.updateOne(
              'fooCollection',
              fooUpdateValidator,
              db,
              'id',
              createdFoo.id,
              { foo: 'invalid' },
            )
            console.log({ validationError })
          }
        },
      },
      true,
    )
    await expect(result).resolves.not.toThrow()
    expect(db.isConnected).toBe(false)
    expect(db.inTransaction).toBe(false)
  })
})
