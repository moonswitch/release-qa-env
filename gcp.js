const core = require('@actions/core');
const { FieldValue, Firestore } = require('@google-cloud/firestore');

const db = new Firestore();

let gcp = async function (table_name, pr) {
  const table = db.collection(table_name);

  core.debug(`Checking for active environment assigned to ${pr}...`);
  const envs = await table.where('pull_requests', 'array-contains', pr).where('in_use', '==', true).limit(1).get();

  if (!envs.empty) {
    const env = envs.docs[0];
    const data = env.data();
    const in_use = data.pull_requests.length > 1;
    const branch = in_use ? data.branch : '';

    core.debug(`Found QA environment in use by ${data.pull_requests}`);

    core.debug(`Removing ${pr} from QA environment ...`);
    await env.ref.update({
      in_use,
      branch,
      pull_requests: FieldValue.arrayRemove(pr),
    });
  } else {
    core.debug(`No active environment found for ${pr}. Nothing to do.`);
  }
}

module.exports = gcp;
