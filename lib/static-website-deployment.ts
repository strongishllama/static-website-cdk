import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as s3 from '@aws-cdk/aws-s3';

export interface StaticWebsiteDeploymentProps {
  /**
   * Is used to avoid naming collisions between stacks and resources. As well as
   * allowing them to be more easily identified.
   */
  readonly namespace: string;
  /**
   * Is used to avoid naming collisions between resources in different stages.
   * As well as allowing them to be more easily identified.
   *
   * @example dev, test, staging, prod
   */
  readonly stage: string;
  /**
   * The base domain name that the website will be available at.
   *
   * @example example.com
   */
  readonly baseDomainName: string;
  /**
   * The full domain name that the website will be available at. If this property
   * is left undefined the baseDomainName property will be used. The base domain
   * of this property must match the baseDomainName property.
   *
   * @example dev.example.com
   */
  readonly fullDomainName?: string;
  /**
   * The ARN of the S3 bucket where the website code is located.
   */
  readonly originBucketArn: string;
}

export class StaticWebsiteDeployment extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: StaticWebsiteDeploymentProps) {
    super(scope, id);

    // Fetch hosted zone via the domain name.
    const hostedZone = route53.HostedZone.fromLookup(this, `${props.namespace}-website-hosted-zone-${props.stage}`, {
      domainName: props.baseDomainName
    });

    // Determine the full domain name.
    let fullDomainName = props.baseDomainName;
    if (props.fullDomainName !== undefined) {
      fullDomainName = props.fullDomainName;
    }

    // Create a DNS validated certificate for HTTPS. The region has to be 'us-east-1'.
    const dnsValidatedCertificate = new certificatemanager.DnsValidatedCertificate(this, `${props.namespace}-dns-validated-certificate-${props.stage}`, {
      domainName: fullDomainName,
      hostedZone: hostedZone,
      region: 'us-east-1',
    });

    // Create a distribution attached to the S3 bucket and DNS validated certificate.
    const distribution = new cloudfront.Distribution(this, `${props.namespace}-distribution-${props.stage}`, {
      defaultBehavior: {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new origins.S3Origin(s3.Bucket.fromBucketArn(this, `${props.namespace}-origin-bucket-${props.stage}`, props.originBucketArn)),
      },
      certificate: dnsValidatedCertificate,
      defaultRootObject: 'index.html',
      domainNames: [
        fullDomainName
      ],
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ]
    });

    // Create an A record pointing at the web distribution.
    new route53.ARecord(this, `${props.namespace}-a-record-${props.stage}`, {
      zone: hostedZone,
      recordName: fullDomainName,
      ttl: cdk.Duration.seconds(60),
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    });
  }
}