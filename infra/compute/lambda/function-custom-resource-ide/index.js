const aws = require('aws-sdk');
const response = require('cfn-response');
const util = require('util');

const ec2 = new aws.EC2({ apiVersion: '2016-11-15' });
const ssm = new aws.SSM({ apiVersion: '2014-11-06' });
const send = util.promisify(response.send);

exports.handler =  async function(event, context) {
  const cloud9EnvironmentId = event.ResourceProperties.cloud9EnvironmentId;
  console.log(event.RequestType, 'Cloud9 Environment:', cloud9EnvironmentId);
  
  if (event.RequestType != 'Create') {
    await send(event, context, response.SUCCESS);
    return;
  }
  
  try {
    const instanceParams = {
      Filters: [
        {
          Name: 'tag:aws:cloud9:environment',
          Values: [
            cloud9EnvironmentId
          ]
        }
      ]
    };
    
    // Get the instance ID
    let data = await ec2.describeInstances(instanceParams).promise();
    const instanceId = data.Reservations[0].Instances[0].InstanceId;
    console.log('Instance ID:', instanceId);
      
    // Associate an instance profile for SSM
    const instanceProfileName = event.ResourceProperties.instanceProfileName;
    await ec2.associateIamInstanceProfile({
      IamInstanceProfile: {
        Name: instanceProfileName
      },
      InstanceId: instanceId
    }).promise();
    console.log('Associated instance profile', instanceProfileName);
    
    // Reboot the instance to make it available in SSM sooner
    console.log('Rebooting Instance');
    await ec2.rebootInstances({
      InstanceIds: [
        instanceId
      ]
    }).promise();
    
    // Wait for the instance to be running
    await ec2.waitFor('instanceRunning', instanceParams).promise();
    console.log('Instance Running');
    
    for (var i = 0; i < 16; i++) {
      console.log('Waiting for SSM');
      data = await ssm.describeInstanceInformation({
        Filters: [
          {
            Key: 'InstanceIds',
            Values: [
              instanceId
            ]
          }
        ]
      }).promise();
      if (data.InstanceInformationList.length > 0) {
        console.log('Instance Ready');
        break;
      } else if (i == 15) {
        await send(event, context, response.FAILED, { Error: 'Instance is not available in SSM' });
      }
      
      // Sleep 15 seconds
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
    
    // Run a configuration script on the instance
    const ssmDocumentName = event.ResourceProperties.ssmDocumentName;
    data = await ssm.sendCommand({
      DocumentName: ssmDocumentName,
      CloudWatchOutputConfig: {
        CloudWatchLogGroupName: `/aws/lambda/${context.functionName}`,
        CloudWatchOutputEnabled: true
      },
      Comment: 'Configure Cloud9 Environment',
      InstanceIds: [
        instanceId
      ]
    }).promise();
    console.log('Sent configuration script for execution via SSM', ssmDocumentName);
  } catch (err) {
    await send(event, context, response.FAILED, err);
    return;
  }
  
  await send(event, context, response.SUCCESS);
};
