import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

export interface DeploymentProps {
  /**
   * The hosted zone that the domain will use.
   */
  readonly hostedZone: route53.IHostedZone;
  /**
   * The domain name that the website will be available at.
   *
   * @example example.com
   */
  readonly domainName: string;
  /**
   * The S3 bucket where the website code is located.
   */
  readonly originBucket: s3.IBucket;
}

export class Deployment extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: DeploymentProps) {
    super(scope, id);

    const dnsValidatedCertificate = new certificatemanager.DnsValidatedCertificate(this, "dns-validated-certificate", {
      domainName: props.domainName,
      hostedZone: props.hostedZone,
      region: "us-east-1",
    });

    this.distribution = new cloudfront.Distribution(this, "distribution", {
      defaultBehavior: {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new origins.S3Origin(props.originBucket),
      },
      certificate: dnsValidatedCertificate,
      defaultRootObject: "index.html",
      domainNames: [props.domainName],
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    new route53.ARecord(this, "a-record", {
      zone: props.hostedZone,
      recordName: props.domainName,
      ttl: cdk.Duration.seconds(60),
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    });
  }
}
