import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { InfraCicdStack } from '../lib/ci-cd-infra-stack';
import { IdeStack } from '../lib/ide-stack';

test('All Stacks', () => {
    const app = new cdk.App();
    const role = new RoleStack(app, 'role');
    expectCDK(role).to(haveResource('AWS::IAM::Role'));
    const eks = new EksStack(app, 'eks', {cfnRoleArn: role.roleArn});
    expectCDK(eks).to(haveResource('AWS::EKS::Cluster'));
    const cicdInfra = new InfraCicdStack(app, 'cicd-infra', {
      cfnRoleArn: role.roleArn,
      eksStackName: eks.stackName
    });
    expectCDK(cicdInfra).to(haveResource('AWS::CodePipeline::Pipeline'));
    const ide = new IdeStack(app, 'ide', {
      cfnRoleName: role.roleName,
      clusterName: eks.clusterName,
      lambdaRoleArn: cicdInfra.lambdaRoleArn,
      repoName: cicdInfra.repoName
    });
    expectCDK(ide).to(haveResource('AWS::Cloud9::EnvironmentEC2'));
});
