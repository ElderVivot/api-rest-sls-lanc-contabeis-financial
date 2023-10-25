import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { gzip } from 'zlib'
import { promisify } from 'util'
import axios from 'axios'
const gzipAsync = promisify(gzip)

const TABLE_NAME = process.env.TABLE_NAME
const API_HOST_SETTINGS_LANC_CONTABEIS = process.env.API_HOST_SETTINGS_LANC_CONTABEIS
const client = new DynamoDBClient({})
const dynamo = DynamoDBDocumentClient.from(client)

async function updateValuesLancs(requestJSON) {
    try {
        const result = await axios.get(`${API_HOST_SETTINGS_LANC_CONTABEIS}/settings-lanc-contabeis/${requestJSON.idCompanie}`)
        const valuesDataSettings = result.data.Item

        requestJSON.lancs.map((movement, index) => {
            const typeMovement = movement.amountMoviment < 0 ? 'payment' : 'receipt'
            let alreadyUpdateThisLine = false
            for (const dataSetting of valuesDataSettings.financialLancContabil) {
                const valueComparation = dataSetting.valueComparation.toUpperCase()
                if (dataSetting.typeMovement === typeMovement && dataSetting.typeComparation === 'isEqual') {
                    if (dataSetting.fieldToCompare === 'nameProviderClient' && valueComparation === movement.nameProviderClient.toUpperCase()) {
                        if (movement.amountMoviment < 0) requestJSON.lancs[index].accountDebit = dataSetting.account
                        else requestJSON.lancs[index].accountCredit = dataSetting.account
                        alreadyUpdateThisLine = true
                        break
                    }
                    if (dataSetting.fieldToCompare === 'category' && valueComparation === movement.category.toUpperCase()) {
                        if (movement.amountMoviment < 0) requestJSON.lancs[index].accountDebit = dataSetting.account
                        else requestJSON.lancs[index].accountCredit = dataSetting.account
                        alreadyUpdateThisLine = true
                        break
                    }
                    if (dataSetting.fieldToCompare === 'historic' && valueComparation === movement.historic.toUpperCase()) {
                        if (movement.amountMoviment < 0) requestJSON.lancs[index].accountDebit = dataSetting.account
                        else requestJSON.lancs[index].accountCredit = dataSetting.account
                        alreadyUpdateThisLine = true
                        break
                    }
                }
            }
            if (!alreadyUpdateThisLine) {
                for (const dataSetting of valuesDataSettings.financialLancContabil) {
                    const valueComparation = dataSetting.valueComparation.toUpperCase()
                    if (dataSetting.typeMovement === typeMovement && dataSetting.typeComparation === 'contains') {
                        if (dataSetting.fieldToCompare === 'nameProviderClient' && movement.nameProviderClient.toUpperCase().indexOf(valueComparation) >= 0) {
                            if (movement.amountMoviment < 0) requestJSON.lancs[index].accountDebit = dataSetting.account
                            else requestJSON.lancs[index].accountCredit = dataSetting.account
                            break
                        }
                        if (dataSetting.fieldToCompare === 'category' && movement.category.toUpperCase().indexOf(valueComparation) >= 0) {
                            if (movement.amountMoviment < 0) requestJSON.lancs[index].accountDebit = dataSetting.account
                            else requestJSON.lancs[index].accountCredit = dataSetting.account
                            break
                        }
                        if (dataSetting.fieldToCompare === 'historic' && movement.historic.toUpperCase().indexOf(valueComparation) >= 0) {
                            if (movement.amountMoviment < 0) requestJSON.lancs[index].accountDebit = dataSetting.account
                            else requestJSON.lancs[index].accountCredit = dataSetting.account
                            break
                        }
                    }
                }
            }
            return null
        })

        requestJSON.lancs.map((movement, index) => {
            for (const dataSetting of valuesDataSettings.bankFinancialLancContabil) {
                const valueComparation = dataSetting.valueComparation.replace('-', '')
                if (dataSetting.typeComparation === 'isEqual' && valueComparation === movement.bankAndAccount) {
                    if (movement.amountMoviment < 0) requestJSON.lancs[index].accountCredit = dataSetting.account
                    else requestJSON.lancs[index].accountDebit = dataSetting.account
                    break
                }
                if (dataSetting.typeComparation === 'contains' && movement.bankAndAccount.indexOf(valueComparation) >= 0) {
                    if (movement.amountMoviment < 0) requestJSON.lancs[index].accountCredit = dataSetting.account
                    else requestJSON.lancs[index].accountDebit = dataSetting.account
                    break
                }
            }
            return null
        })
    } catch (error) {
        console.log(error)
    }
    return requestJSON
}

export async function PutData(event, context) {
    let body
    let statusCode = 200
    const headers = {
        "Content-Type": "application/json",
    }

    try {
        let requestJSON = JSON.parse(event.body)

        if ((!requestJSON.updateDataSetting || requestJSON.updateDataSetting !== '0') && requestJSON.lancs.length > 0) {
            await updateValuesLancs(requestJSON)
        }

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