import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import crpm = require("crpm");

export class Role extends cdk.Stack {
  constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);
    
    const props: crpm.Writeable<iam.CfnRoleProps> = crpm.loadProps(`${__dirname}/props.yaml`);
    props.roleName = cdk.Aws.STACK_NAME;
    const role = new iam.CfnRole(this, "Role", props);
    
    new cdk.CfnOutput(this, "Name", {value: role.ref});
    new cdk.CfnOutput(this, "Arn", {value: role.attrArn});
  }
}