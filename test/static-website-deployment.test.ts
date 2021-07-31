import * as assert from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { StaticWebsiteDeployment, StaticWebsiteDeploymentProps } from '../lib';

test('Static Website Deployment', () => {
  // GIVEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "test-stack", {
    env: {
      account: '111111111111',
      region: 'ap-southeast-2'
    }
  });
  const props: StaticWebsiteDeploymentProps = {
    namespace: 'test',
    stage: 'test',
    baseDomainName: 'test.com',
    fullDomainName: 'admin.test.com',
    originBucketArn: 'arn:aws:s3:::test-bucket'
  };
  // WHEN
  new StaticWebsiteDeployment(stack, 'test-static-website-deployment-test', props);
  // THEN
  assert.expect(stack).to(assert.haveResourceLike('AWS::CloudFront::Distribution', {
    'DistributionConfig': {
      'Aliases': [
        props.fullDomainName
      ],
      'CustomErrorResponses': [
        {
          'ErrorCode': 403,
          'ResponseCode': 200,
          'ResponsePagePath': '/index.html'
        },
        {
          'ErrorCode': 404,
          'ResponseCode': 200,
          'ResponsePagePath': '/index.html'
        }
      ]
    }
  }));
  assert.expect(stack).to(assert.haveResourceLike('AWS::Route53::RecordSet', {
    'Name': `${props.fullDomainName}.`,
    'Type': 'A'
  }));
});
