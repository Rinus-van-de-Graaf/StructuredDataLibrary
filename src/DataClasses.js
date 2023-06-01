//version = "V 1.1.0" Add UNRELEASED if the current version is not yet published to the CDN. When releasing remove UNRELEASED.

window.InputType = {
    Text: "text",
    Number: "number",
    Image: "image",
    Value: "value",
    Url: "url"
}

class DataSelector {
    /**
     * Creates a new data selector for a part of the data.
     * @param {string} name The name of the data.
     * @param {string} selector The query selector (relative to the schema's) from where to read the data. If empty and an attribute has been set it will use the item container to get the attribute from.
     * @param {string} inputType The type of the input, e.g. "text" or "number".
     * @param {boolean} mandatory If the structured data needs to be ignored if this data is missing.
     * @param {string} attribute The name of the data attribute to get the data, if empty the inner HTML will be used.
     * @param {boolean} isCollection If true the returned value will be an array with all found instances.
     */
    constructor(name, selector, inputType, mandatory, attribute = "", isCollection = false) {
        this.name = name;
        this.selector = selector;
        this.inputType = inputType;
        this.mandatory = mandatory;
        this.attribute = attribute;
        this.isCollection = isCollection;
    }

    /**
     * Get the data relative to an item container.
     * @param {Element} itemContainer The item container within to search the data.
     * @returns Returns the requested data, null if the data did not satisfy the mandatory settings.
     */
    getData(itemContainer) {
        if(!this.isCollection) {
            const item = this.selector === "" && this.attribute.length > 0 ? itemContainer : itemContainer.querySelector(this.selector);
            return this.privateGetDataFromItem(item);
        }

        const items = itemContainer.querySelectorAll(this.selector);
        let datas = [];

        items.forEach(item => {
            const data = this.privateGetDataFromItem(item);
            if(data !== null) {
                datas.push(data);
            }
        });

        if(datas.length > 0) {
            return datas;
        }

        console.log(`The data selector '${this.name}', using selector '${this.selector}', had no results for the collection.`);
        return null;
    }

    /**
     * Get the data from an item.
     * @param {Element} item The item to get the data from.
     * @returns Returns the data, null if the item was not found.
     */
    privateGetDataFromItem(item) {
        if(item == null) {
            console.log(`The data selector '${this.name}', using selector '${this.selector}', had no item to retrieve data from.`);
            return null;
        }

        if(this.inputType === InputType.Image) {
            return item.src;
        } else if(this.inputType === InputType.Value) {
            return item.value;
        } else if(this.inputType === InputType.Url) {
            return item.href;
        }

        let data = this.selector.indexOf("[itemprop=") >= 0 ? item.content : this.attribute === "" ? item.innerHTML : item.dataset[this.attribute];

        if(this.inputType === InputType.Text) {
            return data;
        } else if(this.inputType === InputType.Number) {
            data = data.replace(",-", "").replace(",", ".");

            // Check for a value with numbers behind a digit.
            let matchedNumbers = data.match(/\d+\.\d+/);
            if(matchedNumbers != null) {
                if(matchedNumbers.length === 1) {
                    // A match is always a number and can be safely cast.
                    return Number(matchedNumbers[0]);
                }

                console.log(`The data selector '${this.name}', using selector '${this.selector}', had multiple decimal values converted to a number.`);
                return null;
            }

            // Check for a value without a digit.
            matchedNumbers = data.match(/\d+/);
            if(matchedNumbers != null) {
                if(matchedNumbers.length === 1) {
                    // A match is always a number and can be safely cast.
                    return Number(matchedNumbers[0]);
                }

                console.log(`The data selector '${this.name}', using selector '${this.selector}', had multiple values converted to a number.`);
                return null;
            }

            console.log(`The data selector '${this.name}', using selector '${this.selector}', had no value converted to a number.`);
            return null;
        }
    }
}

class FixedDataSelector extends DataSelector {
    /**
     * Creates a new data selector for a part of the data with a fixed value.
     * @param {string} name The name of the data.
     * @param {*} fixedValue The fixed value to return.
     */
    constructor(name, fixedValue) {
        super(name, "", "", true);
        this.fixedValue = fixedValue;
    }

    /**
     * Get the fixed value.
     * @param {Element} itemContainer The item container within to search the data.
     * @returns Returns fixed value.
     */
     getData(itemContainer) {
         return this.fixedValue;
     }
}

class DataSchema {
    /**
     * Creates a new data schema.
     * @param {string} name The name of the data.
     * @param {string} itemContainerSelector The query selector from where to start the seperate selectors.
     * @param {boolean} mandatory If the data needs to be ignored if this data is missing.
     * @param {DataSelector[]} dataSelectors The data selectors of which this schema consists.
     * @param {DataSchema[]} dataSchemas The data schemas of which this schema consists.
     * @param {boolean} isCollection If true the returned value will be an array with all found instances.
     */
    constructor(name, itemContainerSelector, mandatory, dataSelectors = null, dataSchemas = null, isCollection = false) {
        this.name = name;
        this.itemContainerSelector = itemContainerSelector;
        this.mandatory = mandatory;
        this.dataSelectors = dataSelectors;
        this.dataSchemas = dataSchemas;
        this.isCollection = isCollection;
    }

    /**
     * Get the data relative to an item container.
     * @param {Element} itemContainer The item container within to search the data.
     * @returns Returns the requested data, null if the data did not satisfy the mandatory settings or in case of a collection if no data was found or satisfy the mandatory settings.
     */
    getData(itemContainer) {
        if(!this.isCollection) {
            const innerItemContainer = this.itemContainerSelector === "" ? itemContainer : itemContainer.querySelector(this.itemContainerSelector);

            if(innerItemContainer == null) {
                console.log(`The data schema '${this.name}', using selector '${this.itemContainerSelector}', did not find an element.`);
                return null;
            }

            return this._getDataFromItemContainer(innerItemContainer);
        }

        const innerItemContainers = itemContainer.querySelectorAll(this.itemContainerSelector);
        let datas = [];

        innerItemContainers.forEach(innerItemContainer => {
            const data = this._getDataFromItemContainer(innerItemContainer);
            if(data !== null) {
                datas.push(data);
            }
        });

        if(datas.length > 0) {
            return datas;
        }
        
        console.log(`The data schema '${this.name}', using selector '${this.itemContainerSelector}', had no results for the collection.`);
        return null;
    }

    /**
     * Get the data relative to an item container.
     * @param {Element} itemContainer The item container within to search the data.
     * @returns Returns the requested data, null if the data did not satisfy the mandatory settings.
     */
    _getDataFromItemContainer(itemContainer) {
        let data = {};
        let invalidData = false;

        // Get the data from each structured data selector.
        if(this.dataSelectors !== null) {
            this.dataSelectors.forEach(dataSelector => {
                const value = dataSelector.getData(itemContainer);

                if(value !== null) {
                    data[dataSelector.name] = value;
                } else if(dataSelector.mandatory) {
                    invalidData = true;
                }
            });
        }

        if(invalidData) {
            console.log(`The data schema '${this.name}', using selector '${this.itemContainerSelector}', missed mandatory data.`);
            return null;
        }

        // Get the data from each structured data schema.
        if(this.dataSchemas !== null) {
            this.dataSchemas.forEach(dataSchema => {
                const value = dataSchema.getData(itemContainer);

                if(value !== null) {
                    data[dataSchema.name] = value;
                } else if(dataSchema.mandatory) {
                    invalidData = true;
                }
            });
        }

        if(invalidData) {
            console.log(`The data schema '${this.name}', using selector '${this.itemContainerSelector}', missed mandatory schema.`);
            return null;
        }

        return data;
    }
}