import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as crpm from 'crpm';

export class RoleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const roleProps: crpm.Writeable<iam.CfnRoleProps> = crpm.load(
      `${__dirname}/../res/security-identity-compliance/iam/role-manage/props.yaml`
    );
    roleProps.roleName = cdk.Aws.STACK_NAME;
    const role = new iam.CfnRole(this, 'Role', roleProps);
    
    new cdk.CfnOutput(this, 'Name', {value: role.ref});
    new cdk.CfnOutput(this, 'Arn', {value: role.attrArn});
  }
}
