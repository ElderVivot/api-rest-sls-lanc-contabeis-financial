import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
import { unzip } from 'zlib'
import { promisify } from 'util'
const unzipAsync = promisify(unzip)

const TABLE_NAME = process.env.TABLE_NAME
const client = new DynamoDBClient({})
const dynamo = DynamoDBDocumentClient.from(client)

export async function GetData(event, context) {
  let body
  let statusCode = 200
  const headers = {
    "Content-Type": "application/json",
  }

  try {
    let id = ''

    if (event.pathParameters) {
      id = event.pathParameters.id
      const query = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          id
        }
      })
      const result = await dynamo.send(query)
      result.Item = await unzipAsync(result.Item.bufferToSave)
      result.Item = JSON.parse(result.Item.toString())
      body = result
    } else {
      const query = new ScanCommand({
        TableName: TABLE_NAME
      })
      const result = await dynamo.send(query)
      body = result
    }
  } catch (error) {
    statusCode = 400
    body = error.message
  } finally {
    body = JSON.stringify(body)
  }

  return {
    statusCode,
    body,
    headers
  }
}