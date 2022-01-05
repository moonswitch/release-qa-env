const core = require('@actions/core');
const Firestore = require('@google-cloud/firestore');
const github = require('@actions/github');

const db = new Firestore();

async function run() {
  try {
    const table_name = core.getInput('table');
    const table = db.collection(table_name);
    const number = github.context.issue.number;
    const pr = `pr-${number}`;

    core.info(`Checking for active environment assigned to ${pr}...`);
    const envs = await table.where('pr', '==', pr).where('in_use', '==', true).limit(1).get();

    if (!envs.empty) {
      const env = envs.docs[0];
      core.info(`Releasing environment used by ${pr}...`);
      envs.ref.update({in_use: false, pr: null});
    } else {
      core.info(`No active environment found for ${pr}. Nothing to do.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
