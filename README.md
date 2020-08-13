# EKS on Fargate

Create an EKS cluster running on Fargate, and an IDE that can be used to run kubectl commands.

## Create Stacks

```bash
npm uninstall -g cdk
npm install -g aws-cdk@1.57.0 crpm@1.13.0
npm install
npm run build

# EKS Management Role
# This role is used to create the EKS cluster, and it is attached to the IDE to access the cluster

# Synthesize the CloudFormation template stack.template.json
crpm synth infra/security-identity-compliance/iam/role-manage

# Start creating the CloudFormation stack
aws cloudformation create-stack \
    --stack-name eks-fargate-management-role \
    --template-body file://infra/security-identity-compliance/iam/role-manage/stack.template.json \
    --capabilities CAPABILITY_NAMED_IAM

# Wait for the stack to be created
aws cloudformation wait stack-create-complete \
    --stack-name eks-fargate-management-role

# EKS Cluster

# Synthesize the CloudFormation template stack.template.json
crpm synth infra/compute/eks/cluster

# Get the arn of the management role created above
export MANAGEMENT_ROLE_ARN=`aws cloudformation describe-stacks --stack-name eks-fargate-management-role --query "Stacks[0].Outputs[0].OutputValue" --output text`

# Start creating the CloudFormation stack
aws cloudformation create-stack \
    --stack-name eks-fargate-cluster \
    --template-body file://infra/compute/eks/cluster/stack.template.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --role-arn $MANAGEMENT_ROLE_ARN

# Wait for the stack to be created
aws cloudformation wait stack-create-complete \
    --stack-name eks-fargate-cluster

# IDE

# Synthesize the CloudFormation template stack.template.json
crpm synth infra/developer-tools/cloud9/environment-ec2

# Get the name of the management role created above
export MANAGEMENT_ROLE_NAME=`aws cloudformation describe-stacks --stack-name eks-fargate-management-role --query "Stacks[0].Outputs[1].OutputValue" --output text`

# Get the name of the cluster created above
export CLUSTER_NAME=`aws cloudformation describe-stacks --stack-name eks-fargate-cluster --query "Stacks[0].Outputs[0].OutputValue" --output text`

# Start creating the CloudFormation stack
aws cloudformation create-stack \
    --stack-name eks-fargate-ide \
    --template-body file://infra/developer-tools/cloud9/environment-ec2/stack.template.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters ParameterKey=ManagementRoleName,ParameterValue=$MANAGEMENT_ROLE_NAME ParameterKey=ClusterName,ParameterValue=$CLUSTER_NAME

# Wait for the stack to be created
aws cloudformation wait stack-create-complete \
    --stack-name eks-fargate-ide
```

## Cloud9 Usage

1.  In the AWS Console, open the Cloud9 environment created above (eks-fargate-ide).

2.  Once the Cloud9 environment is running in your browser, disable AWS managed temporary credentials.

    a.  Open Cloud9 Preferences.
    
    b.  Expand AWS SETTINGS.
    
    c.  Disable AWS managed temporary credentials.

3.  Open a terminal in Cloud9 and configure AWS region.

    a.  Run AWS configure command.
    ```bash
    aws configure
    ```
    
    b.  Leave all options set to **None** and hit enter, except for default region name (ex. if your region is us-east-1, then enter that).

4.  Test kubectl.

```bash
k get svc
```

5.  Configure EKS to *only* run pods in Fargate.

```bash

# Get the arn of the Fargate pod execution role created above
export FARGATE_POD_EXECUTION_POD_ROLE_ARN=`aws cloudformation describe-stacks --stack-name eks-fargate-cluster --query "Stacks[0].Outputs[1].OutputValue" --output text`

# Create Fargate profile to target CoreDNS pods
aws eks create-fargate-profile \
    --fargate-profile-name profile-eks-fargate-cluster-3 \
    --cluster-name eks-fargate-cluster \
    --pod-execution-role-arn $FARGATE_POD_EXECUTION_POD_ROLE_ARN \
    --selectors namespace=kube-system,labels={k8s-app=kube-dns}

# Remove eks.amazonaws.com/compute-type : ec2 annotation from CoreDNS pods
k patch deployment coredns \
        -n kube-system \
        --type json \
        -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type"}]'

```

## Terminate Stacks

```bash
# Delete the cluster stack
aws cloudformation delete-stack \
    --stack-name eks-fargate-cluster

# Delete the IDE stack
aws cloudformation delete-stack \
    --stack-name eks-fargate-ide

# Wait for the cluster stack to be deleted
aws cloudformation wait stack-delete-complete \
    --stack-name eks-fargate-cluster

# Delete the management role stack
aws cloudformation delete-stack \
    --stack-name eks-fargate-management-role
```
