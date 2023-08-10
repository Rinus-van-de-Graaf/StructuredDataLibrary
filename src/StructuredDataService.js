//version = "V 1.1.0" Add UNRELEASED if the current version is not yet published to the CDN. When releasing remove UNRELEASED.

class StructuredDataSchema extends DataSchema {
    /**
     * Creates a new data schema.
     * @param {string} schemaType The type of the schema, e.g. "FAQPage".
     * @param {string} name The name of the data.
     * @param {string} itemContainerSelector The query selector from where to start the seperate selectors.
     * @param {boolean} mandatory If the data needs to be ignored if this data is missing.
     * @param {DataSelector[]} dataSelectors The data selectors of which this schema consists.
     * @param {DataSchema[]} dataSchemas The data schemas of which this schema consists.
     * @param {boolean} isCollection If true the returned value will be an array with all found instances.
     */
    constructor(schemaType, name, itemContainerSelector, mandatory, dataSelectors = null, dataSchemas = null, isCollection = false) {
        super(name, itemContainerSelector, mandatory, dataSelectors, dataSchemas, isCollection);
        this.schemaType = schemaType;
    }

    /**
     * Get the data relative to an item container and set the structured data type tag.
     * @param {Element} itemContainer The item container within to search the data.
     * @returns Returns the requested data, null if the data did not satisfy the mandatory settings.
     */
    privateGetDataFromItemContainer(itemContainer) {
        const data = super.privateGetDataFromItemContainer(itemContainer);

        if (data === null) {
            return data;
        }

        return {"@type": this.schemaType, ...data};
    }
}

class StructuredDataService {
    /**
     * Generate the Json for the given schema.
     * @param {DataSchema} structuredDataScheme The scheme to generate the Json for.
     * @returns Returns the structured data, null if the data did not satisfy the mandatory settings.
     */
    generateStructuredData(structuredDataScheme) {
        try {
            const structuredData = structuredDataScheme.getData(document);
            if (structuredData === null) {
                if (window.StructuredDataLibrarySettings.DebugMode) console.warn("Structured data failed to generate.");
                return null;
            }

            return {"@context": "https://schema.org", ...structuredData};
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * Add a structured data object to the head of the website.
     * @param {object} structuredData The structured data to convert to a Json and add to the head.
     * @returns Ignores the structured data if it is null.
     */
    addStructuredDataToHead(structuredData) {
        try {
            if (structuredData === null) {
                if (window.StructuredDataLibrarySettings.DebugMode) console.warn("Provided structured data was null, could not add to header.");
                return;
            }

            const script = document.createElement('script');
            script.setAttribute('type', 'application/ld+json');
            script.textContent = JSON.stringify(structuredData, null, 2);
            document.head.appendChild(script);
        } catch (error) {
            console.error(error);
        }
    }
}

window.structuredDataService = new StructuredDataService();