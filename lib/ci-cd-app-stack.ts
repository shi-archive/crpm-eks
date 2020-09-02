import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import * as pipelineaction from '@aws-cdk/aws-codepipeline-actions';
import { ecrBuildSpec, eksBuildSpec } from '../utils/buildspec';

export interface AppCicdStackProps extends cdk.StackProps {
  cfnRoleArn: string,
  clusterName: string
}

export class AppCicdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AppCicdStackProps) {
    super(scope, id, props);
    
    const repo = new codecommit.Repository(this, 'CodeCommitRepository', {
      repositoryName: cdk.Aws.STACK_NAME
    });

    const ecrRepo = new ecr.Repository(this, 'ECRRepository');

    const ecrProject = new codebuild.PipelineProject(this, 'ECRProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_DOCKER_18_09_0,
        privileged: true
      },
      environmentVariables: {
        'ECR_REPO_URI': {
          value: ecrRepo.repositoryUri
        }
      },
      buildSpec: ecrBuildSpec()
    });
    
    ecrRepo.grantPullPush(ecrProject.role);

    const eksProject = new codebuild.PipelineProject(this, 'EKSProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.fromAsset(this, 'Image', {
          directory: './utils/buildimage'
        })
      },
      environmentVariables: { 
        'REGION': {value: this.region},
        'CLUSTER_NAME': {value: props.clusterName},
        'ECR_REPO_URI': {value: ecrRepo.repositoryUri},
      },
      buildSpec: eksBuildSpec(props.cfnRoleArn)
    });
            
    eksProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['eks:DescribeCluster'],
        resources: [`*`]
      })
    );

    eksProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [props.cfnRoleArn]
      })
    );

    const artifact = new codepipeline.Artifact();

    new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [{
        stageName: 'Source',
        actions: [new pipelineaction.CodeCommitSourceAction({
          actionName: 'Fetch',
          repository: repo,
          output: artifact,
        })]
      }, {
        stageName: 'Build',
        actions: [new pipelineaction.CodeBuildAction({
          actionName: 'BuildAndPushToECR',
          input: artifact,
          project: ecrProject
        })]
      }, {
        stageName: 'Deploy',
        actions: [new pipelineaction.CodeBuildAction({
          actionName: 'DeployToEKS',
          input: artifact,
          project: eksProject
        })]
      }]
    });
    
    new cdk.CfnOutput(this, 'CodeCommitURL', {value: repo.repositoryCloneUrlHttp});
  }
}





