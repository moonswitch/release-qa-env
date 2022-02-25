const core = require('@actions/core');
const github = require('@actions/github');
const gcp = require('./gcp');

async function run() {
  try {
    const provider = core.getInput('cloud_provider');
    const table_name = core.getInput('table');
    const number = github.context.issue.number;
    const repo = github.context.payload.repository.full_name;
    const pr = `${repo}/pr-${number}`;

    switch (provider) {
      case 'gcp':
        await gcp(table_name, pr);
        break;
      case 'aws':
        throw new Error('AWS support is not yet implemented');
      default:
        throw new Error(`Unrecognized provider ${provider}. Only 'gcp' and 'aws' are supported.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
