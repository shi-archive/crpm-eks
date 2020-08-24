import boto3, json, shutil, urllib3, zipfile

http = urllib3.PoolManager()

GITHUB_ACCOUNT_NAME = 'mscribe'
GITHUB_REPOSITORY_NAME = 'crpm-eks'

def lambda_handler(event, context):
    print('Event:', event['RequestType'])
    
    artifact_bucket_name = event['ResourceProperties']['ArtifactBucketName']
    print('Artifact Bucket Name:', artifact_bucket_name)
    
    empty_bucket_on_delete = event['ResourceProperties']['EmptyBucketOnDelete']
    print('Empty Bucket On Delete:', empty_bucket_on_delete)
    
    if (event['RequestType'] == 'Create'):
        try:
            with http.request('GET', 'https://codeload.github.com/{}/{}/zip/master'.format(GITHUB_ACCOUNT_NAME, GITHUB_REPOSITORY_NAME), preload_content=False) as res, open('/tmp/source.zip', 'wb') as out_file:
                shutil.copyfileobj(res, out_file)
            
            with zipfile.ZipFile('/tmp/source.zip', 'r') as zf:
                zf.extractall('/tmp')
            
            shutil.make_archive('/tmp/source2', 'zip', '/tmp/{}-master'.format(GITHUB_REPOSITORY_NAME))
            
            s3 = boto3.client('s3')
            with open('/tmp/source2.zip', 'rb') as f:
                s3.upload_fileobj(f, artifact_bucket_name, 'crpm-eks/Source/{}.zip'.format(GITHUB_REPOSITORY_NAME))
            
            print('Copied crpm-eks source from GitHub to S3')
            return send(event, context, 'SUCCESS')
        except:
            return send(event, context, 'FAILED', 'Could not copy crpm-eks source from GitHub to S3')
    elif (event['RequestType'] == 'Delete' and empty_bucket_on_delete):
        try:
            client = boto3.client('s3')
            paginator = client.get_paginator('list_object_versions')
            response_iterator = paginator.paginate(Bucket=artifact_bucket_name)
            for response in response_iterator:
                versions = response.get('Versions', [])
                versions.extend(response.get('DeleteMarkers', []))
                for key, version_id in [[v['Key'], v['VersionId']] for v in versions]:
                    client.delete_object(Bucket=artifact_bucket_name, Key=key, VersionId=version_id)
        except:
            return send(event, context, 'FAILED', 'Could not empty bucket')
    
    send(event, context, 'SUCCESS')

def send(event, context, status, data=''):
    body = {
        'Status': status,
        'Reason': 'See the details in CloudWatch Log Stream: ' + context.log_stream_name,
        'PhysicalResourceId': context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'NoEcho': False,
        'Data': {'Data': data}
    }
    
    json_body = json.dumps(body)
    
    headers = {
        'content-type': '',
        'content-length': str(len(json_body))
    }
    
    http.request('PUT', event['ResponseURL'], body=json_body, headers=headers)
