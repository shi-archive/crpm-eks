import cloud9 = require('@aws-cdk/aws-cloud9');
import cfn = require('@aws-cdk/aws-cloudformation');
import iam = require("@aws-cdk/aws-iam");
import lambda = require('@aws-cdk/aws-lambda');
import ssm = require('@aws-cdk/aws-ssm');
import cdk = require('@aws-cdk/core');
import crpm = require('crpm');
import fs = require('fs');
import yaml = require('js-yaml');

const BASE_DIR = `${__dirname}/../../..`;

export class EnvironmentEC2 extends cdk.Stack {
  constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);
    
    // Management Role Name Parameter
    const manageRoleName = new cdk.CfnParameter(this, 'ManagementRoleName', {
      type: 'String'
    });
    
    // Cluster Name Parameter
    const clusterName = new cdk.CfnParameter(this, 'ClusterName', {
      type: 'String'
    });
    
    // Cloud9 Environment
    const props: crpm.Writeable<cloud9.CfnEnvironmentEC2Props> = crpm.loadProps(`${__dirname}/props.yaml`);
    props.name = cdk.Aws.STACK_NAME;
    const c9 = new cloud9.CfnEnvironmentEC2(this, 'EnvironmentEC2', props);
    
    // Instance Profile
    const instanceProfileProps: crpm.Writeable<iam.CfnInstanceProfileProps> = crpm.loadProps(
      `${BASE_DIR}/security-identity-compliance/iam/instance-profile-ide/props.yaml`
    );
    instanceProfileProps.roles = [manageRoleName.valueAsString];
    instanceProfileProps.instanceProfileName = cdk.Aws.STACK_NAME;
    const instanceProfile = new iam.CfnInstanceProfile(this, "InstanceProfile", instanceProfileProps);
    
    // Systems Manager Document
    const ssmDocDir = `${BASE_DIR}/management-governance/ssm/document-configure-cloud9`;
    const ssmDocProps: crpm.Writeable<ssm.CfnDocumentProps> = crpm.loadProps(`${ssmDocDir}/props.yaml`);
    let ssmDocContent = fs.readFileSync(`${ssmDocDir}/content.yaml`, 'utf8');
    ssmDocContent = ssmDocContent.replace(/\$REGION/g, this.region);
    ssmDocContent = ssmDocContent.replace(/\$CLUSTER_NAME/g, clusterName.valueAsString);
    ssmDocProps.content = yaml.safeLoad(ssmDocContent);
    ssmDocProps.name = `${cdk.Aws.STACK_NAME}-configure-cloud9`;
    const ssmDoc = new ssm.CfnDocument(this, "Document", ssmDocProps);
    
    // Lambda Role
    const lambdaRoleProps: crpm.Writeable<iam.CfnRoleProps> = crpm.loadProps(
      `${BASE_DIR}/security-identity-compliance/iam/role-lambda/props.yaml`
    );
    lambdaRoleProps.roleName = `lambda-${cdk.Aws.STACK_NAME}`;
    const lambdaRole = new iam.CfnRole(this, 'LambdaRole', lambdaRoleProps);
    
    // Lambda Function
    const fnDir = `${BASE_DIR}/compute/lambda/function-custom-resource-ide`;
    const fnProps: crpm.Writeable<lambda.CfnFunctionProps> = crpm.loadProps(`${fnDir}/props.yaml`);
    fnProps.code = {
      zipFile: fs.readFileSync(`${fnDir}/index.js`, 'utf8')
    }
    fnProps.role = lambdaRole.attrArn;
    fnProps.functionName = `${cdk.Aws.STACK_NAME}-custom-resource`;
    const fn = new lambda.CfnFunction(this, 'Function', fnProps);
    
    // Custom Resource
    const crProps: crpm.Writeable<cfn.CfnCustomResourceProps> = crpm.loadProps(
      `${BASE_DIR}/management-governance/cloudformation/custom-resource-ide/props.yaml`
    );
    crProps.serviceToken = fn.attrArn;
    const cr = new cfn.CfnCustomResource(this, 'CustomResource', crProps);
    cr.addPropertyOverride('cloud9EnvironmentId', c9.ref);
    cr.addPropertyOverride('instanceProfileName', instanceProfile.ref);
    cr.addPropertyOverride('ssmDocumentName', ssmDoc.ref);
  }
}
