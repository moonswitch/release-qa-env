const core = require('@actions/core');
const { FieldValue, Firestore } = require('@google-cloud/firestore');
const github = require('@actions/github');

const db = new Firestore();

async function run() {
  try {
    const table_name = core.getInput('table');
    const table = db.collection(table_name);
    const number = github.context.issue.number;
    const repo = github.context.payload.repository.full_name;
    const pr = `${repo}/pr-${number}`;

    core.info(`Checking for active environment assigned to ${pr}...`);
    const envs = await table.where('pull_requests', 'array-contains', pr).where('in_use', '==', true).limit(1).get();

    if (!envs.empty) {
      const env = envs.docs[0];
      const data = env.data();
      const in_use = data.pull_requests.length > 1;
      const branch = in_use ? data.branch : '';

      core.info(`Found QA environment in use by ${data.pull_requests}`);

      core.info(`Removing ${pr} from QA environment ...`);
      await env.ref.update({
        in_use, 
        branch,
        pull_requests: FieldValue.arrayRemove(pr),
      });
    } else {
      core.info(`No active environment found for ${pr}. Nothing to do.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
