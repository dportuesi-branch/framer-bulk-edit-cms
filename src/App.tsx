import { framer, CanvasNode, Collection, isTextNode, CollectionItem, isFrameNode, isComponentInstanceNode } from "framer-plugin"
import { useState, useEffect } from "react"
import "./App.css"
import { Columns, getDataForCSV } from "./Util"

function useSelection() {
    const [selection, setSelection] = useState<CanvasNode[]>([])

    useEffect(() => {
        return framer.subscribeToSelection(setSelection)
    }, [])

    return selection
}

export function App() {
    const [collections, setCollections] = useState<Collection[]>([])
    const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>(undefined)
    const [selectedCollectionItems, setSelectedCollectionItems] = useState<CollectionItem[]>([])
    // for the dropdown
    const [selectedDataSlug, setSelectedDataSlug] = useState("")

    const [selectedCollectionItemColumnIndex, setSelectedCollectionItemColumnIndex] = useState<number>(0)
    
    const [selectedData, setSelectedData] = useState<Columns>([])
    const [selectedColumnNames, setSelectedColumnNames] = useState<Columns>([])

    useEffect(() => {
        framer.showUI({
            position: "top right",
            minHeight: 240,
            width: 240,
        })

        Promise.resolve(framer.getCollections()).then((collections) => {
            setCollections(collections)
        })
    }, [])

    useEffect(() => {
        if (selectedCollection) {
            Promise.resolve(selectedCollection.getItems()).then((data) => {
                setSelectedCollectionItems(data)
            })
        }
    }, [selectedCollection])
    
    const selection = useSelection()
    const [selectionCache, setSelectionCache] = useState<CanvasNode[]>([])

    const layer = selection.length === 1 ? "layer" : "layers"

    const setAttributes = async (node: CanvasNode) => {
        const selectedColumnName = selectedColumnNames[selectedCollectionItemColumnIndex]
        const selectedDataValue = selectedData[selectedCollectionItemColumnIndex]
        if ('name' in node && node.name == selectedColumnName) {
            if (isTextNode(node)) {
                await node.setText(selectedDataValue)
            } else if(isFrameNode(node)) {
                if (node.backgroundImage && typeof node.backgroundImage === 'object') {
                    // setImage only works on selected node, so we have to select each image we want to set
                    await framer.setSelection(node.id)
                    await framer.setImage({
                        image: selectedDataValue
                    })
                } 
            } else if(isComponentInstanceNode(node)) {
                if (node.controls && typeof node.controls === 'object') {
                    await framer.setSelection(node.id)
                    await framer.setImage({
                        image: selectedDataValue
                    })
                }
            }
        }

        // set color
        if (isFrameNode(node) && node.backgroundColor && typeof node.backgroundColor === 'object' && 'name' in node.backgroundColor) {
            if (node.backgroundColor.name === selectedColumnName) {
                node.setAttributes({
                    backgroundColor: selectedDataValue
                })
            }
        }
    }

    const handleSetContent = async () => {
        setSelectionCache(selection)
        try {
            if (selectionCache && selectedCollection) {
                const applyAttributesRecursively = async (node: CanvasNode) => {
                    await setAttributes(node)

                    const children = await node.getChildren()
                    if (children && children.length > 0) {
                        for (const child of children) {
                            await applyAttributesRecursively(child)
                        }
                    }
                }
                for (const selected of selectionCache) {
                    await applyAttributesRecursively(selected)
                }
            } else {
                console.warn("Selected article not found");
            }
        } catch (error) {
            console.error("Error setting content:", error);
        } finally {
            // reset the selection to the original selection
            // TODO this works inconsistently
            //framer.setSelection(selectionCache.map((node) => node.id))
        }
    };

    const handleSelectedCollectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = event.target.value
        const collection = collections.find((collection) => collection.id === selectedId)
        setSelectedCollection(collection)
    }

    const handleSelectedDataChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSlug = event.target.value
        setSelectedDataSlug(selectedSlug)
        const item = selectedCollectionItems.find((item) => item.slug === selectedSlug)
        if (selectedCollection && item) {
            Promise.resolve(selectedCollection.getFields()).then((fields) => {
                const rows = getDataForCSV(fields, [item])
                // index of 0 is the header row
                setSelectedColumnNames(rows[0])
                setSelectedData(rows[1])
            })
        }
    }

    return (
        <main>
            <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                <h3>
                    Data To Set:
                </h3>
                <p>
                    Collection
                </p>
                <select
                    value={selectedCollection?.id ?? ""}
                    onChange={(e) => {
                        handleSelectedCollectionChange(e)
                    }}
                >
                    <option key={"empty"} value="" disabled>
                        Select an entry
                    </option>
                    {collections.map((collection, index) => (
                        <option key={index} value={collection.id}>
                            {collection.name}
                        </option>
                    ))}
                </select>

                {selectedCollection && (
                    <>
                        <p>
                            Content
                        </p>
                        <select
                            value={selectedDataSlug}
                            onChange={(e) => handleSelectedDataChange(e)}
                        >
                            <option key={"empty"} value="" disabled>
                                Select an entry
                            </option>
                            {selectedCollectionItems.map((collection, index) => (
                                <option key={index} value={collection.slug}>
                                    {collection.slug}
                                </option>
                            ))}
                        </select>
                    </>
                )}
                {selectedDataSlug != "" && (
                    <>
                     <p>
                        Column
                    </p>
                    <select
                        value={selectedCollectionItemColumnIndex}
                        onChange={(e) => setSelectedCollectionItemColumnIndex(parseInt(e.target.value, 10))}
                    >
                        {selectedColumnNames.map((column, index) => (
                            <option key={index} value={index}>
                                {column}
                            </option>
                        ))}
                    </select>
                    </>
                )}
            </div>
            <p>
                You have {selection.length} {layer} selected.
            </p>
            <button className="framer-button-primary" onClick={async () => await handleSetContent()}>
                Set Selected
            </button>
        </main>
    )
}