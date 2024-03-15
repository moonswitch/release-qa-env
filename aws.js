const core = require('@actions/core');

let aws = async function (db, table_name, pr) {
  const scanByPr = {
    TableName: table_name,
    FilterExpression: 'contains (pull_requests, :pull_request)',
    ExpressionAttributeValues: { ':pull_request': pr },
  }

  core.debug(`Checking for active environment assigned to ${pr}...`);
  const current_envs = await db.scan(scanByPr);

  if (current_envs.Count == 1) {
    core.debug(`Found an active QA environment for ${pr}`);
    const env = current_envs.Items[0];
    let in_use = env.pull_requests.length > 0;
    let branch = in_use ? env.branch : '';

    core.debug(`Found QA environment in use by ${env.pull_requests}`);

    core.debug(`Removing ${pr} from QA environment ...`);
    env.pull_requests.splice(env.pull_requests.indexOf(pr), 1);
    in_use = env.pull_requests.length > 0;
    branch = in_use ? env.branch : '';
    const update = {
      TableName: table_name,
      Key: {
        env_name: env.env_name,
      },
      UpdateExpression: 'set in_use = :in_use, branch = :branch, pull_requests = :pull_requests',
      ExpressionAttributeValues: {
        ':in_use': in_use,
        ':branch': branch,
        ':pull_requests': env.pull_requests,
      },
    };
  
    await db.update(update);
    
  } else if (current_envs.Count > 1) {
    throw new Error(`PR is assigned to multiple QA environments (${current_envs.Items.map(item => `${item.env_name}, `)})`);
  } else {
    core.debug(`No active environment found for ${pr}. Nothing to do.`);
  }
};

module.exports = aws;
