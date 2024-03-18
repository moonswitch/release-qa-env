const core = require('@actions/core');

async function aws(db, table_name, pr) {
  const scanByPr = {
    TableName: table_name,
    FilterExpression: 'contains (pull_requests, :pull_request)',
    ExpressionAttributeValues: { ':pull_request': pr },
  };

  core.debug(`Checking for active environment assigned to ${pr}...`);
  const current_envs = await db.scan(scanByPr).promise(); 
  core.debug(`Current environments: ${JSON.stringify(current_envs)}`);

  if (current_envs.Count == 1) { 
    core.debug(`Found an active QA environment for ${pr}`);
    const env = current_envs.Items[0];
    core.debug(`Environment details: ${JSON.stringify(env)}`);

    core.debug(`Removing ${pr} from QA environment ...`);
    const updatedPullRequests = env.pull_requests.filter(item => item.S !== pr); 
    core.debug(`Updated pull requests: ${JSON.stringify(updatedPullRequests)}`);
    const in_use = updatedPullRequests.length > 0; 
    const branch = in_use ? env.branch.S : ''; 

    const update = {
      TableName: table_name,
      Key: {
        env_name: env.env_name,
      },
      UpdateExpression: 'set in_use = :in_use, branch = :branch, pull_requests = :pull_requests',
      ExpressionAttributeValues: {
        ':in_use': { BOOL: in_use },
        ':branch': { S: branch },
        ':pull_requests': { L: updatedPullRequests },
      },
    };
    core.debug(`Update operation: ${JSON.stringify(update)}`);

    try {
      await db.update(update).promise();
      core.debug(`Updated QA environment: in_use=${in_use}, branch=${branch}, pull_requests=${JSON.stringify(updatedPullRequests)}`);
    } catch (error) {
      core.setFailed(`Error updating QA environment: ${error.message}`);
    }
  } else if (current_envs.Count > 1) {
    throw new Error(`PR is assigned to multiple QA environments (${current_envs.Items.map(item => `${item.env_name.S}, `)})`);
  } else {
    core.debug(`No active environment found for ${pr}. Nothing to do.`);
  }
}

module.exports = aws;
