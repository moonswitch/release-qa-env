const core = require('@actions/core');
const github = require('@actions/github');
const { getDynamoDBClient, getDynamoDBInstance } = require('./aws_utils');
const aws = require('./aws');
const gcp = require('./gcp');

async function run() {
  try {
    const provider = core.getInput('cloud_provider');
    const table_name = core.getInput('table');
    const number = github.context.issue.number;
    const repo = github.context.payload.repository.full_name;
    const pr = `${repo}/pr-${number}`;
    let client;
    let db;

    switch (provider) {
      case 'gcp':
        await gcp(table_name, pr);
        break;
      case 'aws':
        client = getDynamoDBClient();        
        db = getDynamoDBInstance(client);
        await aws(db, table_name, pr);
        break;
      default:
        throw new Error(`Unrecognized provider ${provider}. Only 'gcp' and 'aws' are supported.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
