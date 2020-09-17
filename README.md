# EKS

Deploy an EKS cluster and an IDE that can be used to run kubectl commands.

## Deploy Stacks

```bash
npm uninstall -g cdk
npm i -g aws-cdk@1.57.0 crpm@2.1.0 typescript

# Clone the infrastructure code
git clone https://github.com/mscribe/crpm-eks

# Change directory
cd crpm-eks
npm i

# Deploy the EKS management role CloudFormation stack
# This role is used to create the EKS cluster, and it is attached to the IDE to access the cluster
cdk deploy role --parameters AwsArn=$(aws sts get-caller-identity --query Arn --output text)

# Copy the ARN of the role deployed above.  It's visible in the deploy **Outputs** and looks like
# arn:aws:iam::123:role/eks-role-us-east-1.  Then, deploy the EKS cluster in a new VPC using that
# role by passing in the role ARN (ex. cdk deploy eks -r arn:aws:iam::123:role/eks-role-us-east-1).
cdk deploy eks -r 

# Deploy the infrastructure CI/CD
cdk deploy cicd

# Deploy the Cloud9 IDE with kubectl ready to use and infrastructure code ready to edit
cdk deploy ide
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
# Copy the ARN of the Fargate pod execution role deployed above in EksStack.  It's visible in the
# deploy **Outputs** and looks like arn:aws:iam::123:role/eks-role.  Then, create the Fargate profile
# to target CoreDNS pods using that role by passing in the role ARN with --pod-execution-role-arn.
aws eks create-fargate-profile \
    --fargate-profile-name profile-eks-fargate-cluster \
    --cluster-name eks-fargate-cluster \
    --pod-execution-role-arn  \
    --selectors namespace=kube-system,labels={k8s-app=kube-dns}

# Remove eks.amazonaws.com/compute-type : ec2 annotation from CoreDNS pods
k patch deployment coredns \
        -n kube-system \
        --type json \
        -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type"}]'
```

## Destroy Stacks

```bash
# Destroy the IDE, CI/CD pipeline, cluster and role
cdk destroy ide cicd-infra eks role
```
