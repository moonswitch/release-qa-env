const { FieldValue, Firestore } = require('@google-cloud/firestore');
const { setupFirebaseData, deleteFirebaseData } = require('./test_helpers');
const table_name = 'gcp-tests';

const db = new Firestore();

describe('gcp', () => {
  jest.setTimeout(10000)
  beforeEach(async () => {
    return await setupFirebaseData(db, table_name);
  });
  
  afterEach(async () => {
    return await deleteFirebaseData(db, table_name);
  });

  const gcp = require('./gcp');

  it('should find the correct environment and release it', async () => {
    const pr = 'moonswitch/release-qa-env/pr-42';
    await gcp(table_name, pr);
    const table = db.collection(table_name);
    const docs = await table.where('env_name', '==', 'qa6').limit(1).get();

    expect(docs.empty).toBe(false);

    const doc = docs.docs[0].data();

    expect(doc.in_use).toBe(false);
    expect(doc.branch).toBeEmpty();
    expect(doc.pull_requests).toBeEmpty();
  });

  it('should remove this pr from environment without releasing it when more than one pr assigned', async () => {
    const pr1 = 'moonswitch/release-qa-env/pr-42';
    const pr2 = 'moonswitch/other-repo/pr-24';
    
    // Get our test record
    const table = db.collection(table_name);
    const docs = await table.where('env_name', '==', 'qa6').limit(1).get();
    const docRef = docs.docs[0];
    
    // Add another PR to it.
    await docRef.ref.update({
      pull_requests: FieldValue.arrayUnion(pr2),
    });

    // Run the action
    await gcp(table_name, pr1);

    // Refetch our test record
    const updatedDocs = await table.where('env_name', '==', 'qa6').limit(1).get();
    const doc = updatedDocs.docs[0].data();


    expect(doc.in_use).toBe(true);
    expect(doc.branch).toBe('test-branch-3');
    expect(doc.pull_requests).toEqual(expect.arrayContaining([pr2]));
  });
});