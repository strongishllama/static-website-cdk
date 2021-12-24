import { Template } from "aws-cdk-lib/assertions";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Deployment, DeploymentProps } from "../lib";

describe("Deployment tests", () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "stack", {
    env: {
      account: "1234567890",
      region: "ap-southeast-2",
    },
  });
  const props: DeploymentProps = {
    hostedZone: route53.HostedZone.fromLookup(stack, "hosted-zone", {
      domainName: "example.com",
    }),
    domainName: "example.com",
    originBucket: new s3.Bucket(stack, "bucket"),
  };
  new Deployment(stack, "deployment", props);
  const assert = Template.fromStack(stack);

  test("DNS validated certificate", () => {
    assert.hasResourceProperties("AWS::CloudFormation::CustomResource", {
      DomainName: props.domainName,
      Region: "us-east-1",
    });
  });

  test("CloudFront distribution", () => {
    assert.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: [props.domainName],
        CustomErrorResponses: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: "/index.html",
          },
          {
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: "/index.html",
          },
        ],
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: "redirect-to-https",
        },
        DefaultRootObject: "index.html",
      },
    });
  });

  test("Route53 record set", () => {
    assert.hasResourceProperties("AWS::Route53::RecordSet", {
      Name: `${props.domainName}.`,
      Type: "A",
    });
  });
});
