#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { InfraCicdStack } from '../lib/ci-cd-infra-stack';
import { IdeStack } from '../lib/ide-stack';

const app = new cdk.App();
const roleStack = new RoleStack(app, 'role', {
  stackName: 'eks-role',
  description: 'Role used by CloudFormation to create an EKS cluster and used by EC2 instances to access the cluster'
});
const eksStack = new EksStack(app, 'eks', {
  stackName: 'eks-cluster',
  description: 'EKS cluster',
  cfnRoleArn: roleStack.roleArn
});
const cicdInfra = new InfraCicdStack(app, 'cicd-infra', {
  stackName: 'eks-ci-cd-infra',
  description: 'Infrastructure CI-CD',
  cfnRoleArn: roleStack.roleArn
});
new IdeStack(app, 'ide', {
  stackName: 'eks-ide',
  description: 'Cloud9 IDE with kubectl configured with access to the cluster and infrastructure code checked out',
  cfnRoleName: roleStack.roleName,
  clusterName: eksStack.clusterName,
  lambdaRoleArn: cicdInfra.lambdaRoleArn,
  repoName: cicdInfra.repoName
});