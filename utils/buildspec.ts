import * as codebuild from '@aws-cdk/aws-codebuild';

export function ecrBuildSpec(): codebuild.BuildSpec {
  return codebuild.BuildSpec.fromObject({
    version: "0.2",
    phases: {
      pre_build: {
        commands: [
          'env', `$(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)`, 
          'IMAGE_TAG=$CODEBUILD_RESOLVED_SOURCE_VERSION'
        ]
      },
      build: {
        commands: [
          'docker build -t $ECR_REPO_URI:latest .',
          'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:$IMAGE_TAG'
        ]
      },
      post_build: {
        commands: [
          'docker push $ECR_REPO_URI:latest',
          'docker push $ECR_REPO_URI:$IMAGE_TAG'
        ]
      }
    }
  });
}

export function eksBuildSpec (roleArn: string): codebuild.BuildSpec {
  return codebuild.BuildSpec.fromObject({
    version: "0.2",
    phases: {
      install: {
        commands: [
          'env',
          'export TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
          '/usr/local/bin/entrypoint.sh']
      },
      build: {
        commands: [
          `CREDENTIALS=$(aws sts assume-role --role-arn "${roleArn}" --role-session-name codebuild-cdk)`,
          `export AWS_ACCESS_KEY_ID="$(echo \${CREDENTIALS} | jq -r '.Credentials.AccessKeyId')"`,
          `export AWS_SECRET_ACCESS_KEY="$(echo \${CREDENTIALS} | jq -r '.Credentials.SecretAccessKey')"`,
          `export AWS_SESSION_TOKEN="$(echo \${CREDENTIALS} | jq -r '.Credentials.SessionToken')"`,
          `export AWS_EXPIRATION=$(echo \${CREDENTIALS} | jq -r '.Credentials.Expiration')`,
          `sed -i 's@CONTAINER_IMAGE@'"$ECR_REPO_URI:$TAG"'@' app-deployment.yaml`,
          'kubectl apply -f app-deployment.yaml'
        ]
      }
    }
  });
}
