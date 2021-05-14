import {
  UsingConnection,
  UsingTransaction,
  Collections,
  Collection,
  IParser,
  InsertOneInDb,
  IValidator,
  GetOneFromDb,
  UpdateOneInDb,
  MongoDbWrapper,
} from '@williamthome/lilimongodb-wrapper'
import {
  requiredSchema,
  requiredString,
  ExtractCompleteSchema,
  ExtractSchemaForModify,
  ExtractSchemaForCreation,
  ValidateError,
  privateString,
} from '@williamthome/lilischema'

const fooSchema = requiredSchema({
  id: privateString(),
  foo: requiredString({ mustBe: ['foo', 'bar'] }),
})

type FooSchema = typeof fooSchema
type Foo = ExtractCompleteSchema<FooSchema>
type FooForUpdate = ExtractSchemaForModify<FooSchema>
type FooForCreation = ExtractSchemaForCreation<FooSchema>

const fooCreateParser: IParser<FooForCreation, Foo> = {
  parse: async (dto: FooForCreation) => ({
    id: (Math.random() * 999).toString(),
    ...dto,
  }),
}
const fooCreateValidator: IValidator<ValidateError> = {
  validate: (toValidate: unknown) => fooSchema.validate(toValidate),
}
const fooUpdateValidator: IValidator<ValidateError> = {
  validate: (toValidate: unknown) =>
    fooSchema.validate(toValidate, { isPartialValidation: true }),
}

type FooCollection = Collections<
  [Collection<'fooCollection', Foo, FooForUpdate, FooForCreation>]
>

const insertOneInDb = new InsertOneInDb<ValidateError, FooCollection>()
const getOneFromDb = new GetOneFromDb<FooCollection>()
const updateOneInDb = new UpdateOneInDb<ValidateError, FooCollection>()
const { usingTransaction } = new UsingTransaction()
const { usingConnection } = new UsingConnection()

// const db = new MapDbWrapper<FooCollection>()
const db = new MongoDbWrapper(
  'mongodb://localhost:27001,localhost:27002,localhost:27003',
)

usingConnection(
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

      if (!createdFoo || createdFoo instanceof Error) return

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

      await usingTransaction(db, {
        doThis: async () => {
          await insertOneInDb.insertOne(
            'fooCollection',
            fooCreateValidator,
            db,
            fooCreateParser,
            {
              foo: 'doNotInsertThis',
            },
          )
          const validationError = await updateOneInDb.updateOne(
            'fooCollection',
            fooUpdateValidator,
            db,
            'id',
            createdFoo.id,
            { foo: 'invalid' },
          )
          console.log({ validationError })
        },
      })
    },
  },
  true,
).catch((error: unknown) => console.error({ error }))
