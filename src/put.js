import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { gzip } from 'zlib'
import { promisify } from 'util'
const gzipAsync = promisify(gzip)

const TABLE_NAME = process.env.TABLE_NAME
const client = new DynamoDBClient({})
const dynamo = DynamoDBDocumentClient.from(client)

export async function PutData(event, context) {
    let body
    let statusCode = 200
    const headers = {
        "Content-Type": "application/json",
    }

    try {
        let requestJSON = JSON.parse(event.body)

        const bufferToSave = await gzipAsync(JSON.stringify(requestJSON))
        if (!bufferToSave) throw 'ERROR_ZLIB'

        await dynamo.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    id: requestJSON.id,
                    tenant: requestJSON.tenant,
                    idCompanie: requestJSON.idCompanie,
                    updatedAt: requestJSON.updatedAt,
                    url: requestJSON.url,
                    startPeriod: requestJSON.startPeriod,
                    endPeriod: requestJSON.endPeriod,
                    bufferToSave
                },
            })
        )
        body = `Put item ${requestJSON.id}`
    } catch (error) {
        statusCode = 400
        body = error.message
        console.log(error)
    } finally {
        body = JSON.stringify(body)
    }

    return {
        statusCode,
        body,
        headers,
    }
}