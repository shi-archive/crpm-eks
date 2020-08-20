import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { Cloud9Stack } from '../lib/cloud9-stack';

test('All Stacks', () => {
    const app = new cdk.App();
    const roleStack = new RoleStack(app, 'RoleStack');
    expectCDK(roleStack).to(haveResource('AWS::IAM::Role'));
    const eksStack = new EksStack(app, 'EksStack', {cfnRoleArn: roleStack.roleArn});
    expectCDK(eksStack).to(haveResource('AWS::EKS::Cluster'));
    const cloud9Stack = new Cloud9Stack(app, 'Cloud9Stack', {
      cfnRoleName: roleStack.roleName,
      clusterName: eksStack.clusterName
    });
    expectCDK(cloud9Stack).to(haveResource('AWS::Cloud9::EnvironmentEC2'));
});
