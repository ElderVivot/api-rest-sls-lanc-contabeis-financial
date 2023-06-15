import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb"

const TABLE_NAME = process.env.TABLE_NAME
const client = new DynamoDBClient({})
const dynamo = DynamoDBDocumentClient.from(client)

export async function DeleteData(event, context) {
  let body
  let statusCode = 200
  const headers = {
    "Content-Type": "application/json",
  }

  try {
    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          id: event.pathParameters.id,
        },
      })
    )
    body = `Deleted item ${event.pathParameters.id}`
  } catch (error) {
    statusCode = 400
    body = error.message
  } finally {
    body = JSON.stringify(body)
  }

  return {
    statusCode,
    body,
    headers,
  }
}