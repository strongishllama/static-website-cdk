import { Match, Template } from "aws-cdk-lib/assertions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Pipeline, PipelineProps } from "../lib";

describe("Pipeline tests", () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "stack", {
    env: {
      account: "1234567890",
      region: "ap-southeast-2",
    },
  });
  const props: PipelineProps = {
    sourceOwner: "test-owner",
    sourceRepo: "test-repo",
    sourceBranch: "main",
    githubOAuthToken: cdk.SecretValue.plainText("test-secret-value"),
    buildEnvironmentVariables: {
      "test-key": {
        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: "test-value",
      },
    },
    approvalNotifyEmails: ["john@example.com"],
    deployBucket: new s3.Bucket(stack, "bucket"),
    distributionId: "test-distribution-id",
    account: "1234567890",
  };
  new Pipeline(stack, "pipeline", props);
  const assert = Template.fromStack(stack);

  test("Pipeline artifacts bucket", () => {
    assert.hasResourceProperties("AWS::S3::Bucket", {
      Tags: [
        {
          Key: "aws-cdk:auto-delete-objects",
          Value: "true",
        },
      ],
    });
  });

  test("Pipeline source stage", () => {
    assert.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: [
            Match.objectLike({
              ActionTypeId: {
                Category: "Source",
                Provider: "GitHub",
              },
              Configuration: {
                Owner: props.sourceOwner,
                Repo: props.sourceRepo,
                Branch: props.sourceBranch,
                OAuthToken: "test-secret-value",
              },
              Name: "source",
              OutputArtifacts: [
                {
                  Name: Match.anyValue(),
                },
              ],
            }),
          ],
        }),
      ]),
    });
  });

  test("Pipeline build stage", () => {
    assert.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: [
            Match.objectLike({
              ActionTypeId: {
                Category: "Build",
                Provider: "CodeBuild",
              },
              Configuration: {
                EnvironmentVariables: `[{"name":"test-key","type":"PLAINTEXT","value":"test-value"}]`,
              },
              InputArtifacts: [
                {
                  Name: Match.anyValue(),
                },
              ],
              Name: "build",
              OutputArtifacts: [
                {
                  Name: Match.anyValue(),
                },
              ],
            }),
          ],
        }),
      ]),
    });

    assert.hasResourceProperties("AWS::CodeBuild::Project", {
      Environment: {
        Image: "aws/codebuild/standard:5.0",
        PrivilegedMode: false,
      },
    });
  });

  test("Pipeline Manual approval stage", () => {
    if (props.approvalNotifyEmails === undefined || props.approvalNotifyEmails.length === 0) {
      return;
    }

    assert.resourceCountIs("AWS::SNS::Topic", 1);

    props.approvalNotifyEmails.forEach((a) => {
      assert.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "john@example.com",
      });
    });

    assert.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: [
            Match.objectLike({
              ActionTypeId: {
                Category: "Approval",
                Provider: "Manual",
              },
              Configuration: {
                NotificationArn: {
                  Ref: Match.anyValue(),
                },
              },
              Name: "approve",
            }),
          ],
        }),
      ]),
    });
  });

  test("Pipeline deploy stage", () => {
    assert.hasResourceProperties("AWS::CodePipeline::Pipeline", {
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: [
            Match.objectLike({
              ActionTypeId: {
                Category: "Deploy",
                Provider: "S3",
              },
              InputArtifacts: [
                {
                  Name: Match.anyValue(),
                },
              ],
              Name: "deploy-website",
            }),
            Match.objectLike({
              ActionTypeId: {
                Category: "Build",
                Provider: "CodeBuild",
              },
              InputArtifacts: [
                {
                  Name: Match.anyValue(),
                },
              ],
              Name: "invalidate-cache",
            }),
          ],
        }),
      ]),
    });

    assert.hasResourceProperties("AWS::CodeBuild::Project", {
      Environment: {
        Image: "aws/codebuild/standard:5.0",
        PrivilegedMode: false,
      },
      Source: {
        BuildSpec: '{\n  "version": 0.2,\n  "phases": {\n    "post_build": {\n      "commands": [\n        "aws cloudfront create-invalidation --distribution-id test-distribution-id --paths \\"/*\\""\n      ]\n    }\n  }\n}',
      },
    });

    assert.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: "cloudfront:CreateInvalidation",
            Effect: "Allow",
            Resource: `arn:aws:cloudfront::1234567890:distribution/${props.distributionId}`,
          },
        ]),
      },
    });
  });
});
