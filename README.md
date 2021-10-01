# Static Website CDK

![NPN version](https://img.shields.io/npm/v/@strongishllama/static-website-cdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/strongishllama/static-website-cdk/main/LICENSE)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/strongishllama/static-website-cdk/Release)

## Introduction
* Common CDK constructs for static websites.
* Build and deployment pipeline.
* CloudFront distribution with a custom domain and HTTPS support.

## Installation
```
npm install @strongishllama/static-website-cdk
```

## Example
```ts
// Create a build and deployment pipeline.
new StaticWebsitePipeline(stack, 'static-website-pipeline', {
  namespace: 'example',
  stage: 'prod',
  sourceOwner: 'example-owner',
  sourceRepo: 'example-repository',
  sourceBranch: 'main',
  sourceOAuthToken: cdk.SecretValue.plainText('oauth-token'),
  buildEnvironmentVariables: {
    'BASE_URL': {
    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
    value: 'https://example.com'
    }
  },
  approvalNotifyEmails: [
    'admin@example.com'
  ],
  deployBucketArn: 'arn:aws:s3:::example-bucket'
});

// Create a CloudFront distribution with a custom domain and HTTPS.
new StaticWebsiteDeployment(stack, 'static-website-deployment', {
  namespace: 'example',
  stage: 'prod',
  baseDomainName: 'example.com',
  fullDomainName: 'admin.example.com',
  originBucketArn: 'arn:aws:s3:::example-bucket'
});
```
