import * as AWS from 'aws-sdk';
import { LookupEventsRequest } from 'aws-sdk/clients/cloudtrail';
import pLimit from 'p-limit';
import { RunningInstance } from './ec2.running.instance';

AWS.config.region = 'ap-southeast-2';

export async function getRunningInstances(): Promise<RunningInstance[]> {
  const instances: RunningInstance[] = [];
  const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

  try {
    const data = await ec2
      .describeInstances({ Filters: [{ Name: 'instance-state-name', Values: ['running'] }] })
      .promise();
    const promises: Promise<void>[] = [];

    if (data.Reservations && data.Reservations.length > 0) {
      const Q = pLimit(data.Reservations.length);

      data.Reservations.forEach((reservation) => {
        if (reservation.Instances) {
          reservation.Instances.forEach(async (instance) => {
            const p = Q(async () => {
              if (instance.InstanceId && instance.LaunchTime) {
                const userName = await getEventUsername(instance.LaunchTime, 'StartInstances', instance.InstanceId);

                if (userName) {
                  instances.push({
                    instanceId: instance.InstanceId,
                    instanceName: instance.Tags?.find((tag) => tag.Key === 'Name')?.Value,
                    startingTime: instance.LaunchTime,
                    startingUserName: userName,
                  });
                }
              }
            });
            promises.push(p);
          });
        }
      });
    } else {
      console.log('There is no instance running.');
    }

    await Promise.all(promises);

    return instances;
  } catch (e) {
    throw new Error('An error occurred while calling the describeInstances action from EC2 AWS API.\n' + e);
  }
}

async function getEventUsername(time: Date, eventName: string, instanceId: string): Promise<string> {
  let userName = '';
  const cloudTrail = new AWS.CloudTrail({ apiVersion: '2013-11-01' });
  const params: LookupEventsRequest = {
    StartTime: time,
    EndTime: time,
    LookupAttributes: [
      {
        AttributeKey: 'EventName',
        AttributeValue: eventName,
      },
      {
        AttributeKey: 'ResourceName',
        AttributeValue: instanceId,
      },
    ],
    MaxResults: 1,
  };

  try {
    const data = await cloudTrail.lookupEvents(params).promise();

    if (data.Events && data.Events[0].Username) {
      userName = data.Events[0].Username;
    }

    return userName;
  } catch (e) {
    throw new Error('An error occurred while retrieving the cloudTrail events. \n' + e);
  }
}
