import * as cdk from '@aws-cdk/core';
import * as certificatemanager from '@aws-cdk/aws-certificatemanager';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as s3 from '@aws-cdk/aws-s3';

export interface StaticWebsiteDeploymentProps {
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
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: cdk.Construct, id: string, props: StaticWebsiteDeploymentProps) {
    super(scope, id);

    // Fetch hosted zone via the domain name.
    const hostedZone = route53.HostedZone.fromLookup(this, 'website-hosted-zone', {
      domainName: props.baseDomainName
    });

    // Determine the full domain name.
    let fullDomainName = props.baseDomainName;
    if (props.fullDomainName !== undefined) {
      fullDomainName = props.fullDomainName;
    }

    // Create a DNS validated certificate for HTTPS. The region has to be 'us-east-1'.
    const dnsValidatedCertificate = new certificatemanager.DnsValidatedCertificate(this, 'dns-validated-certificate', {
      domainName: fullDomainName,
      hostedZone: hostedZone,
      region: 'us-east-1',
    });

    // Create a distribution attached to the S3 bucket and DNS validated certificate.
    this.distribution = new cloudfront.Distribution(this, 'distribution', {
      defaultBehavior: {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new origins.S3Origin(s3.Bucket.fromBucketArn(this, 'origin-bucket', props.originBucketArn)),
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
    new route53.ARecord(this, 'a-record', {
      zone: hostedZone,
      recordName: fullDomainName,
      ttl: cdk.Duration.seconds(60),
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution))
    });
  }
}