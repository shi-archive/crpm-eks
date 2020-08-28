import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import { codeToECRspec, deployToEKSspec } from '../utils/buildspecs';

export interface CicdProps extends cdk.StackProps {
    firstRegionRole: iam.Role
  }

export class CicdStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: CicdProps) {
        super(scope, id, props);

        const primaryRegion = 'us-east-2';
        

        const octankRepo = new codecommit.Repository(this, 'octank-for-eks', {
        repositoryName: `octank-${cdk.Stack.of(this).region}`
        });

        new cdk.CfnOutput(this, `codecommit-uri`, {
        exportName: 'CodeCommitURL',
        value: octankRepo.repositoryCloneUrlHttp
        });

        const ecrForMainRegion = new ecr.Repository(this, `ecr-for-octank`);

        const buildForECR = codeToECRspec(this, ecrForMainRegion.repositoryUri);
        ecrForMainRegion.grantPullPush(buildForECR.role!);

        const deployToMainCluster = deployToEKSspec(this, primaryRegion, ecrForMainRegion, props.firstRegionRole);

        const sourceOutput = new codepipeline.Artifact();

        new codepipeline.Pipeline(this, 'multi-region-eks-dep', {
            stages: [ {
                    stageName: 'Source',
                    actions: [ new pipelineAction.CodeCommitSourceAction({
                            actionName: 'CatchSourcefromCode',
                            repository: octankRepo,
                            output: sourceOutput,
                        })]
                },{
                    stageName: 'Build',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'BuildAndPushtoECR',
                        input: sourceOutput,
                        project: buildForECR
                    })]
                },
                {
                    stageName: 'DeployToMainEKScluster',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'DeployToMainEKScluster',
                        input: sourceOutput,
                        project: deployToMainCluster
                    })]
                }
                
            ]
        });
    }
}





