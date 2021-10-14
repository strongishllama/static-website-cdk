import * as assert from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import { StaticWebsitePipeline, StaticWebsitePipelineProps } from '../lib/index';

test('Static Website Pipeline', () => {
  // GIVEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "test-stack");
  const props: StaticWebsitePipelineProps = {
    sourceOwner: 'test-owner',
    sourceRepo: 'test-repository',
    sourceBranch: 'main',
    githubOAuthToken: cdk.SecretValue.plainText('test-oauth-token'),
    buildEnvironmentVariables: {
      'BASE_URL': {
        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'https://test-base-url.com'
      }
    },
    approvalNotifyEmails: [
      'admin@test.com'
    ],
    deployBucketArn: 'arn:aws:s3:::test-bucket',
    distributionId: 'test-id',
    account: '0123456789'
  };
  new StaticWebsitePipeline(stack, 'test-static-website-pipeline-test', props);
  // THEN
  assert.expect(stack).to(assert.countResourcesLike('AWS::CodePipeline::Pipeline', 1, {
    'Stages': [
      {
        'Name': 'source',
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
        'Name': 'build',
        'Actions': [
          {
            'Configuration': {
              'EnvironmentVariables': `[{"name":"BASE_URL","type":"PLAINTEXT","value":"${props.buildEnvironmentVariables['BASE_URL'].value}"}]`
            }
          }
        ]
      },
      {
        'Name': 'approve'
      },
      {
        'Name': 'deploy'
      }
    ]
  }));
  // Two functions, one for the auto deleting the pipeline artifacts bucket and the other for clearing the distribution cache.
  assert.expect(stack).to(assert.countResources('AWS::Lambda::Function', 1))
});
