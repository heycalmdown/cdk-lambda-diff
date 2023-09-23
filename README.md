```
$ cdk diff MyStackName

...

[~] AWS::Lambda::Function FunctionResourceName FunctionResourceName404021AF 
 ├─ [~] Code
 │   └─ [~] .S3Key:
 │       ├─ [-] 798fdb641c2f74c6dc401e7099b82a44de0e33d5d9e601e287d2095e8724be4f.zip
 │       └─ [+] cdbb0b6f45258a51a9692960be58f87fdd3ba66242fb5b3e7d33247e84cc74c6.zip
 ├─ [~] Environment
 │   └─ [~] .Variables:
 │       └─ [+] Added: .NODE_OPTIONS
 ├─ [~] Layers
 │   └─ @@ -1,4 +1,4 @@
 │      [ ] [
 │      [-]   "arn:aws:lambda:ap-southeast-1:464622532012:layer:Datadog-Extension-ARM:45",
 │      [-]   "arn:aws:lambda:ap-southeast-1:464622532012:layer:Datadog-Node18-x:96"
 │      [+]   "arn:aws:lambda:ap-southeast-1:464622532012:layer:Datadog-Extension-ARM:48",
 │      [+]   "arn:aws:lambda:ap-southeast-1:464622532012:layer:Datadog-Node18-x:98"
 │      [ ] ]
 └─ [~] Metadata
     └─ [~] .aws:asset:path:
 │       ├─ [-] asset.798fdb641c2f74c6dc401e7099b82a44de0e33d5d9e601e287d2095e8724be4f
 │       └─ [+] asset.cdbb0b6f45258a51a9692960be58f87fdd3ba66242fb5b3e7d33247e84cc74c6
```

```bash
$ npx cdk-lambda-diff MyStackName FunctionResourceName
```
