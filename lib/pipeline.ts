import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

export interface PipelineProps {
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
  };
  /**
   * An array of email addresses to be notified after the build stage allowing
   * the approval of the deploy stage.
   */
  readonly approvalNotifyEmails?: string[];
  /**
   * The ARN of the S3 bucket where the built website code will be stored.
   */
  readonly deployBucket: s3.IBucket;
  /**
   * The ID of the CloudFront distribution where the website will be served.
   */
  readonly distributionId: string;
  /**
   * The number of the AWS account where this stack is being deployed.
   */
  readonly account: string;
}

export class Pipeline extends Construct {
  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id);

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, "pipeline", {
      artifactBucket: new s3.Bucket(this, "bucket", {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }),
      stages: [
        {
          stageName: "source",
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: "source",
              output: sourceOutput,
              owner: props.sourceOwner,
              repo: props.sourceRepo,
              branch: props.sourceBranch,
              oauthToken: props.githubOAuthToken,
            }),
          ],
        },
        {
          stageName: "build",
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: "build",
              input: sourceOutput,
              outputs: [buildOutput],
              project: new codebuild.PipelineProject(this, "build-project", {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                },
              }),
              environmentVariables: props.buildEnvironmentVariables,
            }),
          ],
        },
      ],
    });

    if (props.approvalNotifyEmails !== undefined && props.approvalNotifyEmails.length !== 0) {
      pipeline.addStage({
        stageName: "approve",
        actions: [
          new codepipeline_actions.ManualApprovalAction({
            actionName: "approve",
            notifyEmails: props.approvalNotifyEmails,
          }),
        ],
      });
    }

    const invalidateCachePipelineProject = new codebuild.PipelineProject(this, "invalidate-cache-project", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          post_build: {
            commands: [`aws cloudfront create-invalidation --distribution-id ${props.distributionId} --paths "/*"`],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
    });

    invalidateCachePipelineProject.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: [`arn:aws:cloudfront::${props.account}:distribution/${props.distributionId}`],
      })
    );

    pipeline.addStage({
      stageName: "deploy",
      actions: [
        new codepipeline_actions.S3DeployAction({
          actionName: "deploy-website",
          input: buildOutput,
          bucket: props.deployBucket,
        }),
        new codepipeline_actions.CodeBuildAction({
          actionName: "invalidate-cache",
          input: sourceOutput,
          project: invalidateCachePipelineProject,
        }),
      ],
    });
  }
}
