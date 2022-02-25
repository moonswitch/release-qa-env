const { getDynamoDBClient, getDynamoDBInstance } = require('./aws_utils');
const { setupDynamoData, deleteDynamoData } = require('./test_helpers');
const table_name = 'aws-tests';

const client = getDynamoDBClient({
  endpoint: 'http://localhost:8000',
  sslEnabled: false,
  region: 'local-env',
  credentials: {
    accessKeyId: 'fakeMyKeyId',
    secretAccessKey: 'fakeSecretAccessKey'
  }
});

const db = getDynamoDBInstance(client);

describe('aws', () => {
  jest.setTimeout(10000)
  beforeEach(async () => {
    return await setupDynamoData(client, db, table_name);
  });

  afterEach(async () => {
    return await deleteDynamoData(client, table_name);
  });

  afterAll(() => {
    return client.destroy();
  });

  const aws = require('./aws');

  it('should find the correct environment and release it', async () => {
    const pr = 'moonswitch/release-qa-env/pr-42';
    await aws(db, table_name, pr);
    
    const doc = (await db.get({ TableName: table_name, Key: { env_name: 'qa6' } })).Item;

    expect(doc.in_use).toBe(false);
    expect(doc.branch).toBeEmpty();
    expect(doc.pull_requests).toBeEmpty();
  });

  it('should remove this pr from environment without releasing it when more than one pr assigned', async () => {
    const pr1 = 'moonswitch/release-qa-env/pr-42';
    const pr2 = 'moonswitch/other-repo/pr-24';
    
    // Get our test record
    const doc = (await db.get({ TableName: table_name, Key: { env_name: 'qa6' } })).Item;
    
    // Add another PR to it.
    doc.pull_requests.push(pr2);
    const update = {
      TableName: table_name,
      Key: {
        env_name: 'qa6',
      },
      UpdateExpression: 'set pull_requests = :pull_requests',
      ExpressionAttributeValues: {
        ':pull_requests': doc.pull_requests,
      },
    };
  
    await db.update(update);

    // Run the action
    await aws(db, table_name, pr1);

    // Refetch our test record
    const updatedDoc = (await db.get({ TableName: table_name, Key: { env_name: 'qa6' } })).Item;

    expect(updatedDoc.in_use).toBe(true);
    expect(updatedDoc.branch).toBe('test-branch-3');
    expect(updatedDoc.pull_requests).toEqual(expect.arrayContaining([pr2]));
  });
});