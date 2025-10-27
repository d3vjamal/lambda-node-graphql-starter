
import dedent from 'dedent';

export const yamlTemplate = {

  template: dedent`
    AWSTemplateFormatVersion: '2010-09-09'
    Transform: 'AWS::Serverless-2016-10-31'
    Description: ' SAM Template for backend service - {OrgName} '

    # Global Declaration
    Globals:
      Function:
        Timeout: 29
        Runtime: nodejs20.x
        Tracing: Active    
        MemorySize: 3024
        Layers:
          - !Ref CommonDependencyLayer
        Tags:
          ops:appid: app
          ops:environment: !Ref Environment      
        Architectures:
          - arm64
        Environment:
            Variables:
              ENVIRONMENT: !Ref Environment
              LOG_LEVEL: !FindInMap [StagesMap, !Ref Environment, LogLevel]
              NODE_ENV: !FindInMap [StagesMap, !Ref Environment, NodeEnv]

    # Parameters
    Parameters:
      OrgName:
        Type: String
        Default: {{orgName}}
        Description: Organization Name
      ServiceName:
        Type: String
        Default: {{name}}
        Description: Service Name
      SampleDynamoTbl:
        Type: String
        Default: account-sample-table
        Description: Sample DynamoDB Table Name
      Environment:
        Type: String
        Description: Deployment environment (e.g., dev, qa, prod)
        Default: dev
        AllowedValues:
          - dev
          - qa
          - ppe
          - prod
        ConstraintDescription: environment type.

    Mappings:
      StagesMap:
        dev:
          VaptEnabled: true
          LogLevel: "debug"
          NodeEnv: "dev"      
          AppLogLevel: DEBUG
          SystemLogLevel: DEBUG
          OpenIDConnectIssuer: https://
          OpenIDConnectClientId: 0oa24rwf
          SubnetPrivate1: subnet-
          SubnetPrivate2: s
          SubnetPublic1: subnet-
          SubnetPublic2: subnet-
          SecurityGroup: sg-
          LogRetentionDays: 1
          BucketName: application-bucket
          AuthorizerLambdaArn: 'r'
        qa:
          VaptEnabled: true
          AppLogLevel: DEBUG
          SystemLogLevel: INFO
          LogLevel: "debug"
          NodeEnv: "qa"
          OpenIDConnectIssuer: https://
          OpenIDConnectClientId: 0oa24rw
          SubnetPrivate1: subnet-
          SubnetPrivate2: subnet-
          SubnetPublic1: subnet-
          SubnetPublic2: subnet-
          SecurityGroup: sg-
          LogRetentionDays: 5
          BucketName: application-bucket
          AuthorizerLambdaArn: ''
        ppe:
          VaptEnabled: false
          AppLogLevel: ERROR
          SystemLogLevel: INFO
          LogLevel: "debug"
          NodeEnv: "ppe"
          OpenIDConnectIssuer: https://
          OpenIDConnectClientId: 0oa24rw
          SubnetPrivate1: subnet-
          SubnetPrivate2: subnet-
          SubnetPublic1: subnet-
          SubnetPublic2: subnet-
          SecurityGroup: sg-
          LogRetentionDays: 5
          BucketName: application-bucket
          AuthorizerLambdaArn: ''
        prod:
          VaptEnabled: false
          AppLogLevel: ERROR
          SystemLogLevel: INFO
          LogLevel: "info"
          NodeEnv: "prod"
          OpenIDConnectIssuer: https://
          OpenIDConnectClientId: 0oa1
          SubnetPrivate1: subnet-
          SubnetPrivate2: subnet-
          SubnetPublic1: subnet-
          SubnetPublic2: subnet-
          SecurityGroup: sg-
          LogRetentionDays: 365
          BucketName: application-bucket
          AuthorizerLambdaArn: ''

    Resources:
      commonDependencyLayer:
        Type: AWS::Serverless::LayerVersion
        Properties:
          LayerName: !Sub '\${OrgName}-\${name}-\${Environment}-dependency'
          Description: Layer for common dependencies
          ContentUri: ./layers/common-dependency
          CompatibleRuntimes:
            - nodejs20.x
          CompatibleArchitectures:
            - arm64
          RetentionPolicy: Retain
        Metadata:
          BuildMethod: nodejs20.x
          BuildArchitecture: arm64

      LambdaExecutionRole:
        Type: 'AWS::IAM::Role'
        Properties:
          RoleName: !Sub '\${OrgName}-\${name}-\${Environment}-LambdaExecutionRole'
          AssumeRolePolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Principal:
                  Service: lambda.amazonaws.com
                Action: sts:AssumeRole
          ManagedPolicyArns:
            - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
            - arn:aws:iam::aws:policy/service-role/AWSLambdaRole
            - arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
            - arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy        
          Policies:
            - PolicyName: SampleLambdaPolicy
              PolicyDocument:
                Version: '2012-10-17'
                Statement:
                  - Effect: 'Allow'
                    Action:
                      - ssm:GetParameter
                      - ssm:GetParameters
                      - ssm:PutParameter
                      - ssm:GetParametersByPath
                      - ssm:DeleteParameter
                    Resource: '*'
                  - Effect: 'Allow'
                    Action:
                      - xray:PutTelemetryRecords
                      - xray:PutAnnotation
                      - xray:PutMetadata
                      - xray:PutTraceSegments
                      - xray:GetSamplingRules
                      - xray:GetSamplingTargets
                      - xray:GetSamplingStatisticSummaries
                    Resource: '*'
                  - Effect: Allow
                    Action:
                      - ec2:CreateNetworkInterface
                      - ec2:AttachNetworkInterface
                      - ec2:DescribeNetworkInterface
                    Resource: '*'
                  - Effect: Allow
                    Action:
                      - secretsmanager:GetSecretValue
                      - secretsmanager:ListSecrets
                      - secretsmanager:PutSecretValue
                    Resource: '*'
                  - Effect: Allow
                    Action:
                      - dynamodb:GetItem
                      - dynamodb:PutItem
                      - dynamodb:Query
                      - dynamodb:Scan
                      - dynamodb:DescribeTable
                      - dynamodb:UpdateItem
                      - dynamodb:DeleteItem
                      - dynamodb:BatchGetItem
                    Resource:
                      - !Sub 'arn:aws:dynamodb:\${AWS::Region}:\${AWS::AccountId}:table/\${SampleDynamoTbl}'
                  - Effect: Allow
                    Action:
                      - dynamodb:Query
                      - dynamodb:Scan
                      - dynamodb:DescribeStream
                      - dynamodb:GetItem
                      - dynamodb:BatchGetItem
                    Resource:
                      - !Sub 'arn:aws:dynamodb:\${AWS::Region}:\${AWS::AccountId}:table/\${SampleDynamoTbl}/index/*'
                      - !Sub 'arn:aws:dynamodb:\${AWS::Region}:\${AWS::AccountId}:table/\${SampleDynamoTbl}/index/'
                  - Effect: Allow
                    Action:
                      - s3:GetObject
                      - s3:ListBucket
                      - s3:ListObjects
                      - s3:PutObject
                      - s3:GetBucketLocation
                    Resource:
                      - !Join [ "", [ "arn:aws:s3:::", !FindInMap [StagesMap, !Ref Environment, BucketName] ] ]
                      - !Join [ "", [ "arn:aws:s3:::", !FindInMap [StagesMap, !Ref Environment, BucketName], "/*" ] ]
                  - Effect: 'Allow'
                    Action:
                      - 'logs:CreateLogGroup'
                      - 'logs:CreateLogStream'
                      - 'logs:PutLogEvents'
                    Resource: '*'
                  - Effect: 'Allow'
                    Action:
                      - 'events:PutEvents'
                      - 'events:DescribeRule'
                      - 'events:EnableRule'
                    Resource: '*'                
                  - Effect: Allow
                    Action:
                      - events:DeleteRule
                      - events:DescribeRule
                      - events:EnableRule
                      - events:PutRule
                      - events:ListRules
                      - events:PutEvents
                    Resource: "arn:aws:events:*:*:rule/[*/]*"
          Path: /

      AppSyncGraphQLApi:
        Type: 'AWS::AppSync::GraphQLApi'
        Properties:
          Name: !Sub '\${OrgName}-\${name}-\${Environment}-api'
          AuthenticationType: AWS_LAMBDA
          LambdaAuthorizerConfig:
            AuthorizerResultTtlInSeconds: 0        
            AuthorizerUri: !FindInMap [StagesMap, !Ref Environment, AuthorizerLambdaArn]
          XrayEnabled: true
          AdditionalAuthenticationProviders:
             - AuthenticationType: API_KEY
          LogConfig:
            FieldLogLevel: 'ALL'
            CloudWatchLogsRoleArn: !GetAtt AppSyncLoggingRole.Arn

      AuthLambdaPermission:
        Type: AWS::Lambda::Permission
        Properties:
          Action: lambda:InvokeFunction
          FunctionName: !FindInMap [StagesMap, !Ref Environment, AuthorizerLambdaArn]
          Principal: appsync.amazonaws.com
          SourceArn: !Ref AppSyncGraphQLApi

      AppSyncGraphQLSchema:
        Type: 'AWS::AppSync::GraphQLSchema'
        Properties:
          ApiId: !GetAtt AppSyncGraphQLApi.ApiId
          DefinitionS3Location: !Sub 's3://{{OrgName}}-app-schema-bucket/\${Environment}/{{ServiceName}}/schema-v0.1.graphql'

      IncidentAppSyncDataSourceRole:
        Type: 'AWS::IAM::Role'
        Properties:
          RoleName: !Sub '\${OrgName}-\${ServiceName}-\${Environment}-PilotIncidentAppSyncDSRole'
          AssumeRolePolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Principal:
                  Service: appsync.amazonaws.com
                Action: sts:AssumeRole
          Policies:
            - PolicyName: PilotIncidentAppSyncDataSourcePolicy
              PolicyDocument:
                Version: '2012-10-17'
                Statement:
                  - Effect: 'Allow'
                    Action:
                      - 'logs:CreateLogGroup'
                      - 'logs:CreateLogStream'
                      - 'logs:PutLogEvents'
                    Resource: '*'

      AppSyncLoggingRole:
        Type: 'AWS::IAM::Role'
        Properties:
          ManagedPolicyArns:
            - "arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"
          RoleName: 'PilotIncidentAppSyncLoggingRole'
          AssumeRolePolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: 'Allow'
                Principal:
                  Service: 'appsync.amazonaws.com'
                Action: 'sts:AssumeRole'
          Policies:
            - PolicyName: 'PilotIncidentAppSyncLoggingPolicy'
              PolicyDocument:
                Version: '2012-10-17'
                Statement:
                  - Effect: 'Allow'
                    Action:
                      - 'logs:CreateLogStream'
                      - 'logs:PutLogEvents'
                      - 'logs:CreateLogGroup'
                    Resource: '*'

      # === DYNAMIC HANDLERS ===
    {{#each handlers}}
      {{capitalize this.handlerName}}Func:
        Type: 'AWS::Serverless::Function'
        Description: AppSync - {{capitalize this.handlerName}}
        Properties:
          FunctionName: !Sub '\${OrgName}-\${ServiceName}-{{this.handlerName}}'
          Handler: index.handler
          CodeUri: ./handlers/{{this.handlerName}}
          Role: !GetAtt LambdaExecutionRole.Arn
          VpcConfig:
            SubnetIds:
              - !FindInMap [StagesMap, !Ref Environment, SubnetPublic1]
              - !FindInMap [StagesMap, !Ref Environment, SubnetPublic2]
            SecurityGroupIds:
              - !FindInMap [StagesMap, !Ref Environment, SecurityGroup]
          Environment:
            Variables:
              INCIDENT_WORKFLOW_TBL: !Ref sampleDynamoTbl

      {{capitalize this.handlerName}}LG:
        Type: "AWS::Logs::LogGroup"
        DeletionPolicy: Delete
        UpdateReplacePolicy: Delete
        Properties:
          RetentionInDays: !FindInMap [StagesMap, !Ref Environment, LogRetentionDays]
          LogGroupName: !Sub /aws/lambda/\${{capitalize this.handlerName}}Func

      {{capitalize this.handlerName}}DS:
        Type: 'AWS::AppSync::DataSource'
        Properties:
          ApiId: !GetAtt AppSyncGraphQLApi.ApiId
          Name: !Sub {{this.handlerName}}DS
          Type: AWS_LAMBDA
          LambdaConfig:
            LambdaFunctionArn: !GetAtt {{capitalize this.handlerName}}Func.Arn
          ServiceRoleArn: !GetAtt IncidentAppSyncDataSourceRole.Arn

      {{capitalize this.handlerName}}Resolver:
        Type: 'AWS::AppSync::Resolver'
        Properties:
          ApiId: !GetAtt AppSyncGraphQLApi.ApiId
          TypeName: Mutation
          FieldName: '{{this.handlerName}}'
          DataSourceName: !GetAtt {{capitalize this.handlerName}}DS.Name
          RequestMappingTemplateS3Location: !Sub 's3://{{OrgName}}-app-schema-bucket/\${Environment}/appbucket/request-v1.0.vtl'
          ResponseMappingTemplateS3Location: !Sub 's3://{{OrgName}}-app-schema-bucket/\${Environment}/\${ServiceName}/response.vtl'
    {{/each}}

    Outputs:
      AppSyncApiUrl:
        Description: 'The URL of the AppSync API'
        Value: !GetAtt AppSyncGraphQLApi.GraphQLUrl
      AppSyncApiId:
        Description: 'The ID of the AppSync API'
        Value: !GetAtt AppSyncGraphQLApi.ApiId
    {{#each handlers}}
      {{capitalize this.handlerName}}FunctionArn:
        Description: 'The ARN of the {{this.handlerName}} Lambda function'
        Value: !GetAtt {{capitalize this.handlerName}}Func.Arn
      {{capitalize this.handlerName}}FunctionName:
        Description: 'The name of the {{this.handlerName}} Lambda function'
        Value: !Ref {{capitalize this.handlerName}}Func
    {{/each}}
  `.trim() + '\n'
};