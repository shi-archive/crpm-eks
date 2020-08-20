#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { Cloud9Stack } from '../lib/cloud9-stack';

const app = new cdk.App();
const roleStack = new RoleStack(app, 'RoleStack', {
  stackName: 'eks-role',
  description: 'Role used by CloudFormation to create an EKS cluster and used by EC2 instances to access the cluster'
});
const eksStack = new EksStack(app, 'EksStack', {
  stackName: 'eks-cluster',
  description: 'EKS cluster',
  cfnRoleArn: roleStack.roleArn
});
new Cloud9Stack(app, 'Cloud9Stack', {
  stackName: 'eks-ide',
  description: 'Cloud9 IDE with kubectl configured with access to the cluster',
  cfnRoleName: roleStack.roleName,
  clusterName: eksStack.clusterName
});
