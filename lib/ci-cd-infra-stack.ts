import * as cdk from '@aws-cdk/core';
import * as cfn from '@aws-cdk/aws-cloudformation';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as events from '@aws-cdk/aws-events';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as crpm from 'crpm';
import * as fs from 'fs';

interface InfraCicdStackProps extends cdk.StackProps {
  cfnRoleArn: string;
  eksStackName: string;
}

export class InfraCicdStack extends cdk.Stack {
  readonly lambdaRoleArn: string;
  readonly repoName: string;
  
  constructor(scope: cdk.Construct, id: string, props: InfraCicdStackProps) {
    super(scope, id, props);
    
    // S3 bucket
    let artifactBucket;
    let artifactBucketName = this.node.tryGetContext('artifact_bucket_name');
    if (!artifactBucketName) {
      artifactBucket = new s3.CfnBucket(
        this,
        'Bucket',
        crpm.load<s3.CfnBucketProps>(`${__dirname}/../res/storage/s3/bucket-artifacts/props.yaml`)
      );
      artifactBucketName = artifactBucket.ref;
    }
    
    // Lambda role
    const fnRoleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-lambda/props.yaml`
    );
    fnRoleProps.roleName = `lambda-${cdk.Aws.STACK_NAME}`;
    const fnRole = new iam.CfnRole(this, 'LambdaRole', fnRoleProps);
    this.lambdaRoleArn = fnRole.attrArn;
    
    // Lambda function
    const fnDir = `${__dirname}/../res/compute/lambda/function-custom-resource`;
    const fnProps = crpm.load<lambda.CfnFunctionProps>(`${fnDir}/props.yaml`);
    fnProps.code = {
      zipFile: fs.readFileSync(`${fnDir}/index.py`, 'utf8')
    }
    fnProps.role = fnRole.attrArn;
    fnProps.functionName = `${cdk.Aws.STACK_NAME}-custom-resource`;
    const fn = new lambda.CfnFunction(this, 'Function', fnProps);
    
    // Custom resource
    const crProps = crpm.load<cfn.CfnCustomResourceProps>(
      `${__dirname}/../res/management-governance/cloudformation/custom-resource/props.yaml`
    );
    crProps.serviceToken = fn.attrArn;
    const cr = new cfn.CfnCustomResource(this, 'CustomResource', crProps);
    cr.addPropertyOverride('ArtifactBucketName', artifactBucketName);
    if (artifactBucket != undefined) {
      cr.addPropertyOverride('EmptyBucketOnDelete', true);
    } else {
      cr.addPropertyOverride('EmptyBucketOnDelete', false);
    }
    
    // CodeCommit repository
    const repoProps = crpm.load<codecommit.CfnRepositoryProps>(
      `${__dirname}/../res/developer-tools/codecommit/repository/props.yaml`
    );
    repoProps.repositoryName = cdk.Aws.STACK_NAME;
    (repoProps.code as any).s3.bucket = artifactBucketName;
    const repo = new codecommit.CfnRepository(this, 'Repository', repoProps);
    repo.addDependsOn(cr);
    this.repoName = repo.attrName;
    
    // CodeBuild role
    const projectRoleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-codebuild/props.yaml`
    );
    projectRoleProps.roleName = `codebuild-${cdk.Aws.STACK_NAME}`;
    const projectRole = new iam.CfnRole(this, 'CodeBuildRole', projectRoleProps);
    
    // CodeBuild project
    const projectProps = crpm.load<codebuild.CfnProjectProps>(
      `${__dirname}/../res/developer-tools/codebuild/project/props.yaml`
    );
    projectProps.serviceRole = projectRole.attrArn;
    projectProps.name = cdk.Aws.STACK_NAME;
    const project = new codebuild.CfnProject(this, 'Project', projectProps);
    
    // CodePipeline role
    const pipelineRoleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-codepipeline/props.yaml`
    );
    pipelineRoleProps.roleName = `codepipeline-${cdk.Aws.STACK_NAME}`;
    const pipelineRole = new iam.CfnRole(this, 'CodePipelineRole', pipelineRoleProps);
    
    // CodePipeline pipeline
    const pipelineProps = crpm.load<codepipeline.CfnPipelineProps>(
      `${__dirname}/../res/developer-tools/codepipeline/pipeline/props.yaml`
    );
    pipelineProps.roleArn = pipelineRole.attrArn;
    const stages = (pipelineProps.stages as any);
    stages[0].actions[0].configuration.RepositoryName = repo.attrName;
    stages[1].actions[0].configuration.ProjectName = project.ref;
    stages[2].actions[0].configuration.RoleArn = props.cfnRoleArn;
    stages[2].actions[0].configuration.StackName = props.eksStackName;
    stages[3].actions[0].configuration.RoleArn = props.cfnRoleArn;
    stages[3].actions[0].configuration.StackName = props.eksStackName;
    pipelineProps.artifactStore = {
      location: artifactBucketName,
      type: 'S3'
    };
    pipelineProps.name = cdk.Aws.STACK_NAME;
    const pipeline = new codepipeline.CfnPipeline(this, 'Pipeline', pipelineProps);
    
    // CloudWatch Events role
    const eventsRoleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-events/props.yaml`
    );
    eventsRoleProps.roleName = `cloudwatch-events-${cdk.Aws.STACK_NAME}`;
    const eventsRole = new iam.CfnRole(this, 'EventsRole', eventsRoleProps);
    
    // CloudWatch Events rule
    const ruleProps = crpm.load<events.CfnRuleProps>(
      `${__dirname}/../res/management-governance/events/rule/props.yaml`
    );
    ruleProps.eventPattern.resources = [
      repo.attrArn
    ]
    ruleProps.name = `codepipeline-${cdk.Aws.STACK_NAME}`;
    const target = (ruleProps.targets as any)[0];
    target.arn = `arn:aws:codepipeline:${this.region}:${this.account}:${pipeline.ref}`;
    target.roleArn = eventsRole.attrArn;
    new events.CfnRule(this, 'Rule', ruleProps);
  }
}
