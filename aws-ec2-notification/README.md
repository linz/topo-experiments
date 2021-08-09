# AWS EC2 Notification

### _A project part of an innovation sprint_


## Why?
- To remind people to stop EC2 instances if they don't need them running.

## How?
- By implementing an AWS Lambda function which:
1. Calls AWS EC2 API 'DescribeInstances' action filtered by 'instanceState' with value 'running' to retrieve the list of running instances.
2. Calls AWS CloudTrail 'lookup-event' to get the username corresponding to who started the instance. Filtered by:
  - 'EventTime' with value of the 'launchTime' from the call above
  - 'EventName': 'StartInstances'
  - 'ResourceName': 'INSTANCE_ID'
3. Sends a notification on a Slack channel (the WebHook url has to be specified).

## When?
- By scheduling this Lambda function to run every day before the end of the business day (before 4pm?).
