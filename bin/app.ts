#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { CicdStack } from '../lib/ci-cd-stack';
import { IdeStack } from '../lib/ide-stack';

const app = new cdk.App();
const role = new RoleStack(app, 'role', {
  stackName: 'eks-role',
  description: 'Role used by CloudFormation to create an EKS cluster and used by EC2 instances to access the cluster'
});
const eks = new EksStack(app, 'eks', {
  stackName: 'eks-cluster',
  description: 'EKS cluster',
  cfnRoleArn: role.roleArn
});
const cicd = new CicdStack(app, 'cicd', {
  stackName: 'eks-ci-cd-infra',
  description: 'Infrastructure CI-CD',
  cfnRoleArn: role.roleArn,
  eksStackName: eks.stackName
});
new IdeStack(app, 'ide', {
  stackName: 'eks-ide',
  description: 'Cloud9 IDE with kubectl configured with access to the cluster and infrastructure code checked out',
  cfnRoleName: role.roleName,
  clusterName: eks.clusterName,
  lambdaRoleArn: cicd.lambdaRoleArn,
  repoName: cicd.repoName
});
