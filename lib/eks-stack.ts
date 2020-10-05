import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as iam from '@aws-cdk/aws-iam';
import * as crpm from 'crpm';

interface EksStackProps extends cdk.StackProps {
  cfnRoleArn: string;
}

export class EksStack extends cdk.Stack {
  readonly clusterName: string;
  
  constructor(scope: cdk.Construct, id: string, props: EksStackProps) {
    super(scope, id, props);
    
    // VPC
    const vpcProps = crpm.load<ec2.CfnVPCProps>(
      `${__dirname}/../res/compute/ec2/vpc/props.yaml`
    );
    const vpc = new ec2.CfnVPC(this, 'VPC', vpcProps);
    
    // Internet Gateway
    const igProps = crpm.load<ec2.CfnVPCProps>(
      `${__dirname}/../res/compute/ec2/internet-gateway/props.yaml`
    );
    const ig = new ec2.CfnInternetGateway(this, 'InternetGateway', igProps);
    
    // Internet Gateway Attachment
    const igAttachmentProps = crpm.load<ec2.CfnVPCGatewayAttachmentProps>(
      `${__dirname}/../res/compute/ec2/vpc-gateway-attachment/props.yaml`
    );
    igAttachmentProps.vpcId = vpc.ref;
    igAttachmentProps.internetGatewayId = ig.ref;
    new ec2.CfnVPCGatewayAttachment(this, 'VPCGatewayAttachment', igAttachmentProps);
    
    // Private Subnet 1A
    const privateSubnet1AProps = crpm.load<ec2.CfnSubnetProps>(
      `${__dirname}/../res/compute/ec2/subnet-private-1a/props.yaml`
    );
    privateSubnet1AProps.availabilityZone = `${this.region}a`;
    privateSubnet1AProps.vpcId = vpc.ref;
    const privateSubnet1A = new ec2.CfnSubnet(this, 'PrivateSubnet1A', privateSubnet1AProps);
    
    // Private Subnet 1B
    const privateSubnet1BProps = crpm.load<ec2.CfnSubnetProps>(
      `${__dirname}/../res/compute/ec2/subnet-private-1b/props.yaml`
    );
    privateSubnet1BProps.availabilityZone = `${this.region}b`;
    privateSubnet1BProps.vpcId = vpc.ref;
    const privateSubnet1B = new ec2.CfnSubnet(this, 'PrivateSubnet1B', privateSubnet1BProps);
    
    // Public Subnet 1A
    const publicSubnet1AProps = crpm.load<ec2.CfnSubnetProps>(
      `${__dirname}/../res/compute/ec2/subnet-public-1a/props.yaml`
    );
    publicSubnet1AProps.availabilityZone = `${this.region}a`;
    publicSubnet1AProps.vpcId = vpc.ref;
    const publicSubnet1A = new ec2.CfnSubnet(this, 'PublicSubnet1A', publicSubnet1AProps);
    
    // Public Subnet 1B
    const publicSubnet1BProps = crpm.load<ec2.CfnSubnetProps>(
      `${__dirname}/../res/compute/ec2/subnet-public-1b/props.yaml`
    );
    publicSubnet1BProps.availabilityZone = `${this.region}b`;
    publicSubnet1BProps.vpcId = vpc.ref;
    const publicSubnet1B = new ec2.CfnSubnet(this, 'PublicSubnet1B', publicSubnet1BProps);
    
    // NAT IP
    const natIpProps = crpm.load<ec2.CfnEIPProps>(
      `${__dirname}/../res/compute/ec2/eip-nat/props.yaml`
    );
    const natIp = new ec2.CfnEIP(this, 'NATIP', natIpProps);
    
    // NAT Gateway
    const ngProps = crpm.load<ec2.CfnNatGatewayProps>(
      `${__dirname}/../res/compute/ec2/nat-gateway/props.yaml`
    );
    ngProps.allocationId = `${natIp.getAtt('AllocationId')}`;
    ngProps.subnetId = publicSubnet1B.ref
    const ng = new ec2.CfnNatGateway(this, 'NATGateway', ngProps);
    
    // Private Subnet 1A Route Table
    const privateSubnet1ARouteTableProps = crpm.load<ec2.CfnRouteTableProps>(
      `${__dirname}/../res/compute/ec2/route-table-private-1a/props.yaml`
    );
    privateSubnet1ARouteTableProps.vpcId = vpc.ref;
    const privateSubnet1ARouteTable = new ec2.CfnRouteTable(this, 'PrivateSubnet1ARouteTable', privateSubnet1ARouteTableProps);
    
    // Private Subnet 1A Route
    const privateSubnet1ARouteProps = crpm.load<ec2.CfnRouteProps>(
      `${__dirname}/../res/compute/ec2/route-private-1a/props.yaml`
    );
    privateSubnet1ARouteProps.routeTableId = privateSubnet1ARouteTable.ref;
    privateSubnet1ARouteProps.natGatewayId = ng.ref;
    new ec2.CfnRoute(this, 'PrivateSubnet1ARoute', privateSubnet1ARouteProps);
    
    // Private Subnet 1A Route Table Association
    const privateSubnet1ARouteTableAssociationProps = crpm.load<ec2.CfnSubnetRouteTableAssociationProps>(
      `${__dirname}/../res/compute/ec2/subnet-route-table-association-private-1a/props.yaml`
    );
    privateSubnet1ARouteTableAssociationProps.routeTableId = privateSubnet1ARouteTable.ref;
    privateSubnet1ARouteTableAssociationProps.subnetId = privateSubnet1A.ref;
    new ec2.CfnSubnetRouteTableAssociation(this, 'PrivateSubnet1ARouteTableAssociation', privateSubnet1ARouteTableAssociationProps);
    
    // Private Subnet 1B Route Table
    const privateSubnet1BRouteTableProps = crpm.load<ec2.CfnRouteTableProps>(
      `${__dirname}/../res/compute/ec2/route-table-private-1b/props.yaml`
    );
    privateSubnet1BRouteTableProps.vpcId = vpc.ref;
    const privateSubnet1BRouteTable = new ec2.CfnRouteTable(this, 'PrivateSubnet1BRouteTable', privateSubnet1BRouteTableProps);
    
    // Private Subnet 1B Route
    const privateSubnet1BRouteProps = crpm.load<ec2.CfnRouteProps>(
      `${__dirname}/../res/compute/ec2/route-private-1b/props.yaml`
    );
    privateSubnet1BRouteProps.routeTableId = privateSubnet1BRouteTable.ref;
    privateSubnet1BRouteProps.natGatewayId = ng.ref;
    new ec2.CfnRoute(this, 'PrivateSubnet1BRoute', privateSubnet1BRouteProps);
    
    // Private Subnet 1B Route Table Association
    const privateSubnet1BRouteTableAssociationProps = crpm.load<ec2.CfnSubnetRouteTableAssociationProps>(
      `${__dirname}/../res/compute/ec2/subnet-route-table-association-private-1b/props.yaml`
    );
    privateSubnet1BRouteTableAssociationProps.routeTableId = privateSubnet1BRouteTable.ref;
    privateSubnet1BRouteTableAssociationProps.subnetId = privateSubnet1B.ref;
    new ec2.CfnSubnetRouteTableAssociation(this, 'PrivateSubnet1BRouteTableAssociation', privateSubnet1BRouteTableAssociationProps);
    
    // Public Subnet Route Table
    const publicSubnetRouteTableProps = crpm.load<ec2.CfnRouteTableProps>(
      `${__dirname}/../res/compute/ec2/route-table-public/props.yaml`
    );
    publicSubnetRouteTableProps.vpcId = vpc.ref;
    const publicSubnetRouteTable = new ec2.CfnRouteTable(this, 'PublicSubnetRouteTable', publicSubnetRouteTableProps);
    
    // Public Subnet Route
    const publicSubnetRouteProps = crpm.load<ec2.CfnRouteProps>(
      `${__dirname}/../res/compute/ec2/route-public/props.yaml`
    );
    publicSubnetRouteProps.routeTableId = publicSubnetRouteTable.ref;
    publicSubnetRouteProps.gatewayId = ig.ref;
    new ec2.CfnRoute(this, 'PublicSubnetRoute', publicSubnetRouteProps);
    
    // Public Subnet 1A Route Table Association
    const publicSubnet1ARouteTableAssociationProps = crpm.load<ec2.CfnSubnetRouteTableAssociationProps>(
      `${__dirname}/../res/compute/ec2/subnet-route-table-association-public-1a/props.yaml`
    );
    publicSubnet1ARouteTableAssociationProps.routeTableId = publicSubnetRouteTable.ref;
    publicSubnet1ARouteTableAssociationProps.subnetId = publicSubnet1A.ref;
    new ec2.CfnSubnetRouteTableAssociation(this, 'PublicSubnet1ARouteTableAssociation', publicSubnet1ARouteTableAssociationProps);
    
    // Public Subnet 1B Route Table Association
    const publicSubnet1BRouteTableAssociationProps = crpm.load<ec2.CfnSubnetRouteTableAssociationProps>(
      `${__dirname}/../res/compute/ec2/subnet-route-table-association-public-1b/props.yaml`
    );
    publicSubnet1BRouteTableAssociationProps.routeTableId = publicSubnetRouteTable.ref;
    publicSubnet1BRouteTableAssociationProps.subnetId = publicSubnet1B.ref;
    new ec2.CfnSubnetRouteTableAssociation(this, 'PublicSubnet1BRouteTableAssociation', publicSubnet1BRouteTableAssociationProps);
    
    // Cluster Shared Node Security Group
    const clusterSharedNodeSecurityGroupProps = crpm.load<ec2.CfnSecurityGroupProps>(
      `${__dirname}/../res/compute/ec2/security-group-cluster-shared-node/props.yaml`
    );
    clusterSharedNodeSecurityGroupProps.vpcId = vpc.ref;
    const clusterSharedNodeSecurityGroup = new ec2.CfnSecurityGroup(this, 'ClusterSharedNodeSecurityGroup', clusterSharedNodeSecurityGroupProps);
    
    // Control Plane Security Group
    const controlPlaneSecurityGroupProps = crpm.load<ec2.CfnSecurityGroupProps>(
      `${__dirname}/../res/compute/ec2/security-group-control-plane/props.yaml`
    );
    controlPlaneSecurityGroupProps.vpcId = vpc.ref;
    controlPlaneSecurityGroupProps.tags = [
      {
        key: cdk.Fn.join('/', ['kubernetes.io/cluster', cdk.Aws.STACK_NAME]),
        value: 'owned'
      }
    ];
    const controlPlaneSecurityGroup = new ec2.CfnSecurityGroup(this, 'ControlPlaneSecurityGroup', controlPlaneSecurityGroupProps);
    
    // Cluster To Node Security Group Ingress
    const clusterToNodeSGIngressProps = crpm.load<ec2.CfnSecurityGroupIngressProps>(
      `${__dirname}/../res/compute/ec2/security-group-ingress-cluster-to-node/props.yaml`
    );
    clusterToNodeSGIngressProps.groupId = clusterSharedNodeSecurityGroup.ref;
    clusterToNodeSGIngressProps.sourceSecurityGroupId = controlPlaneSecurityGroup.ref;
    new ec2.CfnSecurityGroupIngress(this, 'ClusterToNodeSecurityGroupIngress', clusterToNodeSGIngressProps);
    
    // Node To Node Security Group Ingress
    const nodeToNodeSGIngressProps = crpm.load<ec2.CfnSecurityGroupIngressProps>(
      `${__dirname}/../res/compute/ec2/security-group-ingress-node-to-node/props.yaml`
    );
    nodeToNodeSGIngressProps.groupId = clusterSharedNodeSecurityGroup.ref;
    nodeToNodeSGIngressProps.sourceSecurityGroupId = clusterSharedNodeSecurityGroup.ref;
    new ec2.CfnSecurityGroupIngress(this, 'NodeToNodeSecurityGroupIngress', nodeToNodeSGIngressProps);
    
    // Node To Cluster Security Group Ingress
    const nodeToClusterSGIngressProps = crpm.load<ec2.CfnSecurityGroupIngressProps>(
      `${__dirname}/../res/compute/ec2/security-group-ingress-node-to-cluster/props.yaml`
    );
    nodeToClusterSGIngressProps.groupId = controlPlaneSecurityGroup.ref;
    nodeToClusterSGIngressProps.sourceSecurityGroupId = clusterSharedNodeSecurityGroup.ref;
    new ec2.CfnSecurityGroupIngress(this, 'NodeToClusterSecurityGroupIngress', nodeToClusterSGIngressProps);
    
    // Service Role
    const serviceRoleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-service/props.yaml`
    );
    const serviceRole = new iam.CfnRole(this, 'ServiceRole', serviceRoleProps);
    
    // CloudWatch Metrics Policy
    const cloudWatchMetricsPolicyProps = crpm.load<iam.CfnPolicyProps>(
      `${__dirname}/../res/security-identity-compliance/iam/policy-cloudwatch-metrics/props.yaml`
    );
    cloudWatchMetricsPolicyProps.policyName = `${cdk.Aws.STACK_NAME}-cloudwatch-metrics`;
    cloudWatchMetricsPolicyProps.roles = [serviceRole.ref];
    new iam.CfnPolicy(this, 'CloudWatchMetricsPolicy', cloudWatchMetricsPolicyProps);
    
    // NLB Policy
    const nlbPolicyProps = crpm.load<iam.CfnPolicyProps>(
      `${__dirname}/../res/security-identity-compliance/iam/policy-nlb/props.yaml`
    );
    nlbPolicyProps.policyName = `${cdk.Aws.STACK_NAME}-nlb`;
    nlbPolicyProps.roles = [serviceRole.ref];
    new iam.CfnPolicy(this, 'NLBPolicy', nlbPolicyProps);
    
    // Control Plane
    const eksProps = crpm.load<eks.CfnClusterProps>(
      `${__dirname}/../res/compute/eks/cluster/props.yaml`
    );
    eksProps.resourcesVpcConfig = {
      securityGroupIds: [
        controlPlaneSecurityGroup.ref
      ],
      subnetIds: [
        privateSubnet1A.ref,
        privateSubnet1B.ref,
        publicSubnet1A.ref,
        publicSubnet1B.ref
      ]
    }
    eksProps.roleArn = serviceRole.attrArn;
    const cluster = new eks.CfnCluster(this, 'ControlPlane', eksProps);
    this.clusterName = cluster.ref;
    
    // Nodegroup Role
    const nodegroupRoleProps = crpm.load<iam.CfnRoleProps>(`${__dirname}/../res/security-identity-compliance/iam/role-nodegroup/props.yaml`);
    const nodegroupRole = new iam.CfnRole(this, 'Role', nodegroupRoleProps);

    // Nodegroup
    const nodegroupProps = crpm.load<eks.CfnNodegroupProps>(`${__dirname}/../res/compute/eks/nodegroup/props.yaml`);
    nodegroupProps.clusterName = cluster.ref;
    nodegroupProps.nodeRole = nodegroupRole.attrArn;
    nodegroupProps.subnets = [privateSubnet1A.ref, privateSubnet1B.ref];
    new eks.CfnNodegroup(this, 'Nodegroup', nodegroupProps);

    // Fargate Pod Execution Role
    const fargatePodExecutionRoleProps = crpm.load<iam.CfnRoleProps>(
      `${__dirname}/../res/security-identity-compliance/iam/role-fargate-pod-execution/props.yaml`
    );
    const fargatePodExecutionRole = new iam.CfnRole(this, 'FargatePodExecutionRole', fargatePodExecutionRoleProps);
    
    // Fargate Pod Execution Role ARN
    new cdk.CfnOutput(this, 'FargatePodExecutionRoleArn', {value: fargatePodExecutionRole.attrArn});
    
    // Update kubeconfig Command
    new cdk.CfnOutput(this, 'UpdateKubeConfigCommand', {value: cdk.Fn.join(' ',
      [
        'aws eks update-kubeconfig --name',
        cluster.ref,
        '--region',
        this.region,
        '--role-arn',
        props.cfnRoleArn
      ]
    )});
  }
}
