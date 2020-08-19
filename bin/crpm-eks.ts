#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RoleStack } from '../lib/role-stack';
import { EksStack } from '../lib/eks-stack';
import { Cloud9Stack } from '../lib/cloud9-stack';

const app = new cdk.App();
new RoleStack(app, 'RoleStack');
new EksStack(app, 'EksStack');
new Cloud9Stack(app, 'Cloud9Stack');
