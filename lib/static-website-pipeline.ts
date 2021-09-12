import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as lambda_nodejs from '@aws-cdk/aws-lambda-nodejs';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import { CloudFront } from '@strongishllama/iam-constants-cdk';

export interface StaticWebsitePipelineProps {
  /**
   * Is used to avoid naming collisions between stacks and resources. As well as
   * allowing them to be more easily identified.
   */
  readonly namespace: string;
  /**
   * The owner of where the source code is located on GitHub, this should either be
   * a GitHub username or organization name.
   */
  readonly sourceOwner: string;
  /**
   * The name of the repository stored on GitHub.
   */
  readonly sourceRepo: string;
  /**
   * The repository branch to use.
   */
  readonly sourceBranch: string;
  /**
   * A GitHub OAuth token to use for authentication.
   */
  readonly githubOAuthToken: cdk.SecretValue;
  /**
   * The environment variables to be exposed on the build stage.
   */
  readonly buildEnvironmentVariables: {
    [name: string]: codebuild.BuildEnvironmentVariable;
  },
  /**
   * An array of email addresses to be notified after the build stage allowing
   * the approval of the deploy stage.
   */
  readonly approvalNotifyEmails?: string[];
  /**
   * The ARN of the S3 bucket where the built website code will be stored.
   */
  readonly deployBucketArn: string;
  /**
   * The ID of the CloudFront distribution where the website will be served.
   */
  readonly distributionId: string;
  /**
   * The number of the AWS account where this stack is being deployed.
   */
  readonly account: string;
}

export class StaticWebsitePipeline extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: StaticWebsitePipelineProps) {
    super(scope, id);

    // Create artifacts to pass data between stages.
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    // Create pipeline to source, build and deploy the frontend website.
    const pipeline = new codepipeline.Pipeline(this, `${props.namespace}-pipeline`, {
      artifactBucket: new s3.Bucket(this, `${props.namespace}-bucket`, {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true
      }),
      stages: [
        {
          stageName: 'source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'source',
              output: sourceOutput,
              owner: props.sourceOwner,
              repo: props.sourceRepo,
              branch: props.sourceBranch,
              oauthToken: props.githubOAuthToken
            })
          ]
        },
        {
          stageName: 'build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'build',
              input: sourceOutput,
              outputs: [
                buildOutput
              ],
              project: new codebuild.PipelineProject(this, `${props.namespace}-project`, {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0
                }
              }),
              environmentVariables: props.buildEnvironmentVariables
            })
          ]
        }
      ]
    });

    // If we've been given approval notify emails, add a manual approval step before deployment.
    if (props.approvalNotifyEmails !== undefined && props.approvalNotifyEmails.length !== 0) {
      pipeline.addStage({
        stageName: 'approve',
        actions: [
          new codepipeline_actions.ManualApprovalAction({
            actionName: 'approve',
            notifyEmails: props.approvalNotifyEmails
          })
        ]
      });
    }

    pipeline.addStage({
      stageName: 'deploy',
      actions: [
        new codepipeline_actions.S3DeployAction({
          actionName: 'deploy-static-website',
          input: buildOutput,
          bucket: s3.Bucket.fromBucketArn(this, `${props.namespace}-deploy-bucket`, props.deployBucketArn)
        }),
        new codepipeline_actions.LambdaInvokeAction({
          actionName: 'invalidate-distribution-cache',
          lambda: new lambda_nodejs.NodejsFunction(this, 'invalidate-cache', {
            environment: {
              'DISTRIBUTION_ID': props.distributionId
            },
            initialPolicy: [
              new iam.PolicyStatement({
                actions: [
                  CloudFront.CREATE_INVALIDATION
                ],
                resources: [
                  `arn:aws:cloudfront::${props.account}:distribution/${props.distributionId}`
                ]
              })
            ]
          })
        })
      ]
    });
  }
}
