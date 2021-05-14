import type {
  IDatabaseConnection,
  IDatabaseGetOne,
  IDatabaseInsertOne,
  IDatabaseTransaction,
  IDatabaseUpdateOne,
  Collections,
  ExtractCollectionNames,
  ExtractCollectionTypeByName,
  ExtractCollectionUpdateTypeByName,
  KeyValueOf,
  StringKeyOf,
} from '@williamthome/lilidb-wrapper'
import { ClientSession, MongoClient } from 'mongodb'

export class MongoDbWrapper<TCollection extends Collections<unknown>>
  implements
    IDatabaseConnection,
    IDatabaseTransaction,
    IDatabaseInsertOne<TCollection>,
    IDatabaseGetOne<TCollection>,
    IDatabaseUpdateOne<TCollection>
{
  private _client: MongoClient
  private _session?: ClientSession | undefined

  constructor(private readonly _dbUri: string) {
    this._client = new MongoClient(this._dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  }

  get isConnected(): boolean {
    return this._client.isConnected()
  }

  get inTransaction(): boolean {
    return this._session?.inTransaction() ?? false
  }

  async connect(): Promise<void> {
    await this._client.connect()
  }

  async disconnect(): Promise<void> {
    await this._client.close()
  }

  startTransaction = async (): Promise<void> => {
    if (!this._session) this._session = this._client.startSession()
    this._session.startTransaction()
  }

  commitTransaction = async (): Promise<void> => {
    await this._session?.commitTransaction()
    this._session = undefined
  }

  rollback = async (): Promise<void> => {
    await this._session?.abortTransaction()
    this._session = undefined
  }

  async insertOne<
    TCollectionName extends ExtractCollectionNames<TCollection>,
    TExpected extends ExtractCollectionTypeByName<TCollection, TCollectionName>,
  >(
    collectionName: TCollectionName,
    obj: TExpected,
  ): Promise<TExpected | null> {
    const { ops } = await this._client
      .db()
      .collection(collectionName)
      .insertOne({ ...Object(obj) }, { session: this._session })
    const created = ops[0]
    delete created?._id
    return created
  }

  async getOne<
    TCollectionName extends ExtractCollectionNames<TCollection>,
    TExpected extends ExtractCollectionTypeByName<TCollection, TCollectionName>,
    TBy extends StringKeyOf<TExpected>,
    TMatching extends KeyValueOf<TExpected, TBy>,
  >(
    collectionName: TCollectionName,
    by: TBy,
    matching: TMatching,
  ): Promise<TExpected | null> {
    const founded = await this._client
      .db()
      .collection(collectionName)
      .findOne({ [by]: matching }, { session: this._session })
    delete founded?._id
    return founded
  }

  async updateOne<
    TCollectionName extends ExtractCollectionNames<TCollection>,
    TExpected extends ExtractCollectionTypeByName<TCollection, TCollectionName>,
    TBy extends StringKeyOf<TExpected>,
    TMatching extends KeyValueOf<TExpected, TBy>,
    TForUpdate extends ExtractCollectionUpdateTypeByName<
      TCollection,
      TCollectionName
    >,
  >(
    collectionName: TCollectionName,
    by: TBy,
    matching: TMatching,
    as: TForUpdate,
  ): Promise<TExpected | null> {
    const { value: updated } = await this._client
      .db()
      .collection(collectionName)
      .findOneAndUpdate(
        { [by]: matching },
        { $set: as },
        { session: this._session, returnOriginal: false },
      )
    delete updated?._id
    return updated
  }
}
