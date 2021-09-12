# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.2.0 - 2021-09-12
### Added
* Added a Lambda function to invalidate the CloudFront distribution cache when the pipeline is run.

### Changed
* Changed the distribution resources to be a public property accessible via ```StaticWebsiteDeployment.distribution```.

### Removed
* **BREAKING**: Removed ```StaticWebsiteDeploymentProps.stage``` property.
* **BREAKING**: Removed ```StaticWebsitePipelineProps.stage``` property.
* **BREAKING**: Removed ```StaticWebsiteDeploymentProps.stage``` property from resource IDs.
* **BREAKING**: Removed ```StaticWebsitePipelineProps.stage``` property from resource IDs.

## v0.1.1 - 2021-08-22
### Changed
* Changed ```StaticWebsitePipelineProps.approvalNotifyEmails``` property to be optional.

## v0.1.0 - 2021-07-31
### Added
* Added ```StaticWebsitePipeline``` CDK construct.
* Added ```StaticWebsiteDeployment``` CDK construct.
* Added a changelog.
* Added a code of conduct.
* Added a Dependabot configuration file.
* Added a Semantic Commits configuration file.
* Added a pull request template.
* Added a GitHub release action.