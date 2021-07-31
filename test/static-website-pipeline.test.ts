import * as assert from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import { StaticWebsitePipeline, StaticWebsitePipelineProps } from '../lib/index';

test('Static Website Pipeline', () => {
  // GIVEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "test-stack");
  const props: StaticWebsitePipelineProps = {
    namespace: 'test',
    stage: 'test',
    sourceOwner: 'test-owner',
    sourceRepo: 'test-repository',
    sourceBranch: 'main',
    sourceOAuthToken: cdk.SecretValue.plainText('test-oauth-token'),
    buildEnvironmentVariables: {
      'BASE_URL': {
        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'https://test-base-url.com'
      }
    },
    approvalNotifyEmails: [
      'admin@test.com'
    ],
    deployBucketArn: 'arn:aws:s3:::test-bucket'
  };
  // WHEN
  new StaticWebsitePipeline(stack, 'test-static-website-pipeline-test', props);
  // THEN
  assert.expect(stack).to(assert.haveResourceLike('AWS::CodePipeline::Pipeline', {
    'Stages': [
      {
        'Name': 'Source',
        'Actions': [
          {
            'Configuration': {
              'Owner': props.sourceOwner,
              'Repo': props.sourceRepo,
              'Branch': props.sourceBranch,
              'OAuthToken': assert.anything(),
            }
          }
        ]
      },
      {
        'Name': 'Build',
        'Actions': [
          {
            'Configuration': {
              'EnvironmentVariables': `[{"name":"BASE_URL","type":"PLAINTEXT","value":"${props.buildEnvironmentVariables['BASE_URL'].value}"}]`
            }
          }
        ]
      },
      {
        'Name': 'Approve',
        'Actions': [
          {
            'Configuration': {
              'NotificationArn': {
                'Ref': assert.anything()
              }
            },
          }
        ],
      },
      {
        'Name': 'Deploy',
        'Actions': [
          {
            'Configuration': {
              'BucketName': assert.anything(),
              'Extract': 'true'
            }
          }
        ]
      }
    ]
  }));
});
