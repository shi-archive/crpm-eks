#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { InfraCicdStack } from '../lib/ci-cd-infra-stack';
import { AppCicdStack } from '../lib/ci-cd-app-stack';
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
const cicdInfra = new InfraCicdStack(app, 'cicd-infra', {
  stackName: 'eks-ci-cd-infra',
  description: 'Infrastructure CI-CD',
  cfnRoleArn: role.roleArn,
  eksStackName: eks.stackName
});

new AppCicdStack(app, `cicd-app`, {
  stackName: 'eks-ci-cd-app',
  description: 'Application CI-CD',
  cfnRoleName: role.roleName,
  clusterName: eks.clusterName
});


new IdeStack(app, 'ide', {
  stackName: 'eks-ide',
  description: 'Cloud9 IDE with kubectl configured with access to the cluster and infrastructure code checked out',
  cfnRoleName: role.roleName,
  clusterName: eks.clusterName,
  lambdaRoleArn: cicdInfra.lambdaRoleArn,
  repoName: cicdInfra.repoName
});
