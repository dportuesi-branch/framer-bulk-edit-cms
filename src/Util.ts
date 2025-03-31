import { CollectionItem, Field, isColorStyle } from "framer-plugin"

export type Columns = string[]
type Rows = Columns[]
type SupportedField = Exclude<Field, { type: "divider" | "unsupported" }>

export function shouldBeNever(_: never) {}

function isFieldSupported(field: Field): field is SupportedField {
    switch (field.type) {
        case "image":
        case "file":
        case "collectionReference":
        case "formattedText":
        case "multiCollectionReference":
        case "enum":
        case "color":
        case "string":
        case "boolean":
        case "date":
        case "link":
        case "number":
            return true

        case "divider":
        case "unsupported":
            return false

        default:
            shouldBeNever(field)
            return false
    }
}

export function getDataForCSV(fields: Field[], items: CollectionItem[]): Rows {
    const rows: Rows = []
    const supportedFields = fields.filter(isFieldSupported)

    // Add header row.
    rows.push(supportedFields.map(field => field.name))

    // Add slug header to the start.
    rows[0].unshift("Slug")

    // Add all the data rows.
    for (const item of items) {
        const columns: Columns = []

        // Add the slug cell.
        columns.push(item.slug)

        for (const field of supportedFields) {
            const fieldData = item.fieldData[field.id]

            switch (fieldData.type) {
                case "image":
                case "file": {
                    if (!fieldData.value) {
                        columns.push("")
                        continue
                    }

                    columns.push(`${fieldData.value.url}`)
                    continue
                }

                case "multiCollectionReference": {
                    columns.push(`${fieldData.value.join(",")}`)
                    continue
                }

                case "enum": {
                    columns.push(`${fieldData.value}`)
                    continue
                }

                case "color": {
                    if (isColorStyle(fieldData.value)) {
                        columns.push(fieldData.value.light)
                        continue
                    }

                    columns.push(fieldData.value)
                    continue
                }

                case "collectionReference":
                case "formattedText":
                case "string":
                case "boolean":
                case "date":
                case "link":
                case "number": {
                    columns.push(`${fieldData.value ?? ""}`)
                    continue
                }

                default: {
                    shouldBeNever(fieldData)
                }
            }
        }

        rows.push(columns)
    }

    return rows
}