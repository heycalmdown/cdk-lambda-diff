#!/usr/bin/env node
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda'
import fs from 'fs'
import path from 'path'
import decompress from 'decompress'
import axios from 'axios'
import { createTwoFilesPatch } from 'diff'

const colorize = require('@npmcli/disparity-colors')

const client = new LambdaClient({})

const downloadPath = path.join(__dirname, 'downloaded.zip')
const extractPath = path.join(__dirname, 'extracted')

async function downloadAndUnzip(downloadUrl: string) {
  const response = await axios({
    method: 'GET',
    url: downloadUrl,
    responseType: 'stream',
  })

  const writer = fs.createWriteStream(downloadPath)
  response.data.pipe(writer)

  return new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

async function unzipFile() {
  try {
    await decompress(downloadPath, extractPath)
  } catch (err) {
    console.error(err)
  }
}

function compareNodeModules(targetDir: string, compareDir: string) {
  const targetFiles = fs.readdirSync(targetDir)

  targetFiles.forEach((file) => {
    const targetFilePath = path.join(targetDir, file)
    const compareFilePath = path.join(compareDir, file)

    if (fs.existsSync(targetFilePath) && fs.existsSync(compareFilePath)) {
      const targetStat = fs.statSync(targetFilePath)
      const compareStat = fs.statSync(compareFilePath)

      if (targetStat.isDirectory() && compareStat.isDirectory()) {
        compareNodeModules(targetFilePath, compareFilePath)
      } else {
        const sizeDifference = Math.abs(targetStat.size - compareStat.size)
        if (sizeDifference > 0) {
          console.log(`Size difference for ${compareFilePath}/${file}: ${sizeDifference} bytes`)
        }
      }
    }
  })
}

function compareFiles(targetDir: string, compareDir: string, file: string) {
  const targetFilePath = path.join(targetDir, file)
  const compareFilePath = path.join(compareDir, file)

  if (file === 'node_modules') {
    compareNodeModules(targetFilePath, compareFilePath)
    return
  }
  if (file.endsWith('.js.map') || file.endsWith('lock.json')) {
    console.log(`Skipping ${file}`)
    return
  }

  const targetFileContent = fs.readFileSync(targetFilePath, "utf-8")
  const compareFileContent = fs.readFileSync(compareFilePath, "utf-8")

  const diffResult = createTwoFilesPatch(
    targetFilePath,
    compareFilePath,
    targetFileContent,
    compareFileContent
  )

  console.log(`Diff result for ${file}:`)
  console.log(colorize(diffResult))
}

function findFunctionAndAsset(stackName: string, funcId: string) {
  const file = fs.readFileSync(`./cdk.out/${stackName}.template.json`, 'utf-8')
  const stack = JSON.parse(file)
  const funcKey = Object.keys(stack.Resources).filter(k => {
    if (!k.startsWith(funcId)) return false
    if (stack.Resources[k].Type !== 'AWS::Lambda::Function') return false
    return true
  })
  if (funcKey.length === 0) return {}
  const funcResource = stack.Resources[funcKey[0]]

  const name = funcResource.Properties.FunctionName
  const asset = funcResource.Metadata['aws:asset:path']

  return { name, asset }
}

function listStacks() {
  const files = fs.readdirSync('./cdk.out')
  const stacks = files.filter(f => f.endsWith('.template.json')).map(f => f.replace('.template.json', ''))
  console.log(stacks)
}

function listFunctions(stackName: string) {
  const file = fs.readFileSync(`./cdk.out/${stackName}.template.json`, 'utf-8')
  const stack = JSON.parse(file)
  const funcKeys = Object.keys(stack.Resources).filter(k => {
    if (stack.Resources[k].Type !== 'AWS::Lambda::Function') return false
    return true
  })
  const functions = funcKeys.map(k => stack.Resources[k].Properties.FunctionName)
  console.log(functions)
}

async function main() {
  const stackName = process.argv[2] || 'UnknownStack'
  const funcId = process.argv[3] || 'UnknownFunction'
  if (stackName === '--list') {
    listStacks()
    return
  }
  if (funcId === '--list') {
    listFunctions(stackName)
    return
  }

  const { name, asset } = findFunctionAndAsset(stackName, funcId)
  if (!name || !asset) {
    console.log('function not found')
    process.exit(1)
  }

  const res = await client.send(new GetFunctionCommand({ FunctionName: name }))
  await downloadAndUnzip(res.Code?.Location || '')
  await unzipFile()

  const targetDir = `cdk.out/${asset}`
  const files = fs.readdirSync(targetDir)

  files.forEach((file) => {
    const targetFilePath = path.join(targetDir, file)
    const extractFilePath = path.join(extractPath, file)

    if (fs.existsSync(targetFilePath) && fs.existsSync(extractFilePath)) {
      compareFiles(extractPath, targetDir, file)
    } else {
      console.log(`added: ${file}`)
    }
  })
}

main()
