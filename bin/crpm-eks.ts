#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { Cloud9Stack } from '../lib/cloud9-stack';

const app = new cdk.App();
new RoleStack(app, 'RoleStack', { stackName: 'eks-role' });
new EksStack(app, 'EksStack', { stackName: 'eks-cluster' });
new Cloud9Stack(app, 'Cloud9Stack', { stackName: 'eks-ide' });
