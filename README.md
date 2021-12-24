# Static Website CDK

![NPN version](https://img.shields.io/npm/v/@strongishllama/static-website-cdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/strongishllama/static-website-cdk/main/LICENSE)
[![CI](https://github.com/strongishllama/static-website-cdk/actions/workflows/ci.yml/badge.svg)](https://github.com/strongishllama/static-website-cdk/actions/workflows/ci.yml)
[![Release](https://github.com/strongishllama/static-website-cdk/actions/workflows/release.yml/badge.svg)](https://github.com/strongishllama/static-website-cdk/actions/workflows/release.yml)

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
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { Deployment, Pipeline, PipelineProps } from "@strongishllama/static-website-cdk";

export class ExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "bucket");

    const deployment = new Deployment(this, "deployment", {
      hostedZone: route53.HostedZone.fromLookup(this, "hosted-zone", {
        domainName: "example.com",
      }),
      domainName: "example.com",
      originBucket: bucket,
    });

    new Pipeline(this, "pipeline", {
      sourceOwner: "example-owner",
      sourceRepo: "example-repo",
      sourceBranch: "main",
      githubOAuthToken: cdk.SecretValue.plainText("example-secret-value"),
      buildEnvironmentVariables: {
        "example-key": {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: "example-value",
        },
      },
      approvalNotifyEmails: ["john@example.com"],
      deployBucket: bucket,
      distributionId: deployment.distribution.distributionId,
      account: "1234567890",
    });
  }
}
```
