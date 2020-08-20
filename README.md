# EKS

Deploy an EKS cluster and an IDE that can be used to run kubectl commands.

## Deploy Stacks

```bash
npm uninstall -g cdk
npm i -g aws-cdk@1.57.0 crpm@2.0.0 typescript
npm i

# Clone the infrastructure code
git clone https://github.com/mscribe/crpm-eks

# Change directory
cd crpm-eks

# Deploy the EKS management role CloudFormation stack
# This role is used to create the EKS cluster, and it is attached to the IDE to access the cluster
cdk deploy RoleStack

# Get the ARN of the management role deployed above (it's also visible in the deploy output)
export MANAGEMENT_ROLE_ARN=`aws cloudformation describe-stacks --stack-name eks-role --query "Stacks[0].Outputs[0].OutputValue" --output text`

# Deploy the EKS cluster in a new VPC using the management role deployed above
cdk deploy EksStack -r $MANAGEMENT_ROLE_ARN

# Deploy the Cloud9 IDE with kubectl ready to use
cdk deploy Cloud9Stack
```

## Cloud9 Usage

1.  In the AWS Console, open the Cloud9 environment created above (eks-ide).

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

## Configure Fargate

1.  Configure EKS to *only* run pods in Fargate.

```bash
# Get the arn of the Fargate pod execution role created above
export FARGATE_POD_EXECUTION_POD_ROLE_ARN=`aws cloudformation describe-stacks --stack-name eks-cluster --query "Stacks[0].Outputs[1].OutputValue" --output text`

# Create Fargate profile to target CoreDNS pods
aws eks create-fargate-profile \
    --fargate-profile-name profile-eks-fargate-cluster \
    --cluster-name eks-fargate-cluster \
    --pod-execution-role-arn $FARGATE_POD_EXECUTION_POD_ROLE_ARN \
    --selectors namespace=kube-system,labels={k8s-app=kube-dns}

# Remove eks.amazonaws.com/compute-type : ec2 annotation from CoreDNS pods
k patch deployment coredns \
        -n kube-system \
        --type json \
        -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type"}]'
```

## Destroy Stacks

```bash
# Destroy the cluster, IDE and role
cdk destroy EksStack Cloud9Stack RoleStack
```
