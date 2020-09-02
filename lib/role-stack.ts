import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as crpm from 'crpm';

export class RoleStack extends cdk.Stack {
  readonly roleName: string;
  readonly roleArn: string;
  
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // AWS ARN Parameter
    const awsArnParameter = new cdk.CfnParameter(this, 'AwsArn', {
      type: 'String',
      description: 'Principal AWS ARN (ex. user ARN) that will be given permission to assume this role'
    });
    
    // Role
    const roleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-manage/props.yaml`
    );
    roleProps.roleName = cdk.Fn.join('-', [cdk.Aws.STACK_NAME, this.region]);
    roleProps.assumeRolePolicyDocument.Statement[1].Principal.AWS = awsArnParameter.valueAsString;
    roleProps.policies[0].policyDocument.Statement[1].Resource = cdk.Fn.join('', [
      'arn:aws:iam::',
      this.account,
      ':role/',
      roleProps.roleName
    ]);
    const role = new iam.CfnRole(this, 'Role', roleProps);
    this.roleName = role.ref;
    this.roleArn = role.attrArn;
  }
}
