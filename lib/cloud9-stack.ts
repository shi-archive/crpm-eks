import * as cdk from '@aws-cdk/core';
import * as cfn from '@aws-cdk/aws-cloudformation';
import * as cloud9 from '@aws-cdk/aws-cloud9';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as ssm from '@aws-cdk/aws-ssm';
import * as crpm from 'crpm';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface Cloud9StackProps extends cdk.StackProps {
  cfnRoleName: string;
  clusterName: string;
}

export class Cloud9Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Cloud9StackProps) {
    super(scope, id, props);
    
    // Cloud9 Environment
    const cloud9Props: crpm.Writeable<cloud9.CfnEnvironmentEC2Props> = crpm.load(
      `${__dirname}/../res/developer-tools/cloud9/environment-ec2/props.yaml`
    );
    cloud9Props.name = cdk.Aws.STACK_NAME;
    const c9 = new cloud9.CfnEnvironmentEC2(this, 'EnvironmentEC2', cloud9Props);
    
    // Instance Profile
    const instanceProfileProps: crpm.Writeable<iam.CfnInstanceProfileProps> = crpm.load(
      `${__dirname}/../res/security-identity-compliance/iam/instance-profile-ide/props.yaml`
    );
    instanceProfileProps.roles = [props.cfnRoleName];
    instanceProfileProps.instanceProfileName = cdk.Aws.STACK_NAME;
    const instanceProfile = new iam.CfnInstanceProfile(this, "InstanceProfile", instanceProfileProps);
    
    // Systems Manager Document
    const ssmDocDir = `${__dirname}/../res/management-governance/ssm/document-configure-cloud9`;
    const ssmDocProps: crpm.Writeable<ssm.CfnDocumentProps> = crpm.load(`${ssmDocDir}/props.yaml`);
    let ssmDocContent = fs.readFileSync(`${ssmDocDir}/content.yaml`, 'utf8');
    ssmDocContent = ssmDocContent.replace(/\$REGION/g, this.region);
    ssmDocContent = ssmDocContent.replace(/\$CLUSTER_NAME/g, props.clusterName);
    ssmDocProps.content = yaml.safeLoad(ssmDocContent);
    ssmDocProps.name = `${cdk.Aws.STACK_NAME}-configure-cloud9`;
    const ssmDoc = new ssm.CfnDocument(this, "Document", ssmDocProps);
    
    // Lambda Role
    const lambdaRoleProps: crpm.Writeable<iam.CfnRoleProps> = crpm.load(
      `${__dirname}/../res/security-identity-compliance/iam/role-lambda/props.yaml`
    );
    lambdaRoleProps.roleName = `lambda-${cdk.Aws.STACK_NAME}`;
    const lambdaRole = new iam.CfnRole(this, 'LambdaRole', lambdaRoleProps);
    
    // Lambda Function
    const fnDir = `${__dirname}/../res/compute/lambda/function-custom-resource-ide`;
    const fnProps: crpm.Writeable<lambda.CfnFunctionProps> = crpm.load(`${fnDir}/props.yaml`);
    fnProps.code = {
      zipFile: fs.readFileSync(`${fnDir}/index.js`, 'utf8')
    }
    fnProps.role = lambdaRole.attrArn;
    fnProps.functionName = `${cdk.Aws.STACK_NAME}-custom-resource`;
    const fn = new lambda.CfnFunction(this, 'Function', fnProps);
    
    // Custom Resource
    const crProps: crpm.Writeable<cfn.CfnCustomResourceProps> = crpm.load(
      `${__dirname}/../res/management-governance/cloudformation/custom-resource-ide/props.yaml`
    );
    crProps.serviceToken = fn.attrArn;
    const cr = new cfn.CfnCustomResource(this, 'CustomResource', crProps);
    cr.addPropertyOverride('cloud9EnvironmentId', c9.ref);
    cr.addPropertyOverride('instanceProfileName', instanceProfile.ref);
    cr.addPropertyOverride('ssmDocumentName', ssmDoc.ref);
  }
}
