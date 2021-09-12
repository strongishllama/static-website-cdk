import * as sdk from 'aws-sdk';
import { CodePipelineHandler, CodePipelineEvent, Context } from 'aws-lambda';

export const handler: CodePipelineHandler = async (event: CodePipelineEvent, context: Context) => {
  if (process.env.DISTRIBUTION_ID === undefined || process.env.DISTRIBUTION_ID === '') {
    console.error("'DISTRIBUTION_ID' environment variable not defined");
    return;
  }

  const cloudfront = new sdk.CloudFront();

  try {
    await cloudfront.createInvalidation({
      DistributionId: process.env.DISTRIBUTION_ID,
      InvalidationBatch: {
        Paths: {
          Quantity: 1,
          Items: [
            '/*'
          ]
        },
        CallerReference: new Date().getSeconds().toString()
      }
    }).promise();
  } catch (err) {
    console.error(`Failed to shutdown instance with id ${process.env.INSTANCE_ID}: ${err}`);
  }
};
