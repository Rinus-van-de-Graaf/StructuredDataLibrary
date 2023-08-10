//version = "V 1.4.0" Add UNRELEASED if the current version is not yet published to the CDN. When releasing remove UNRELEASED.

class IndexDataSelector extends DataSelector {
    /**
     * Creates a new data selector for a part of the data to set the index of the element in its parent.
     * @param {string} name The name of the data.
     */
    constructor(name) {
        super(name, "", "", true);
    }

    /**
     * Get the the index of the item container in its parent.
     * @param {Element} itemContainer The item container to get the index from.
     * @returns Returns the index of the item container in its parent.
     */
     getData(itemContainer) {
         return Array.from(itemContainer.parentElement.children).indexOf(itemContainer);
     }
}

class EventDataSchema extends DataSchema {
    /**
     * Creates a new data schema.
     * @param {string} name The name of the data.
     * @param {string} itemContainerSelector The query selector from where to start the seperate selectors.
     * @param {boolean} mandatory If the data needs to be ignored if this data is missing.
     * @param {DataSelector[]} dataSelectors The data selectors of which this schema consists.
     * @param {DataSchema[]} dataSchemas The data schemas of which this schema consists.
     * @param {boolean} asArray Sets the data in an array
     */
    constructor(name, itemContainerSelector, mandatory, dataSelectors = null, dataSchemas = null, asArray = true) {
        super(name, itemContainerSelector, mandatory, dataSelectors, dataSchemas, false);

        this.asArray = asArray;
    }

    /**
     * Get the data relative to an item container.
     * @param {Element} itemContainer The item container within to search the data.
     * @returns Returns the requested data, null if the data did not satisfy the mandatory settings or in case of a collection if no data was found or satisfy the mandatory settings.
     */
    getData(itemContainer) {
        const usingItemContainer = itemContainer.closest(this.itemContainerSelector);
        
        if (this.asArray) {
            return [this.privateGetDataFromItemContainer(usingItemContainer)];
        }

        return this.privateGetDataFromItemContainer(usingItemContainer);
    }
}

class BoundEventListener {
    /**
     * Used to keep track of bound event listeners to be able to remove them when extra elements are loaded.
     * @param {Element} element The element the event listener is bound on.
     * @param {EventListener} eventListener Reference to the event listener.
     * @param {string} eventType The type of event to listen to, e.g. "click", "blur", "change". 
     */
    constructor(element, eventListener, eventType) {
        this.element = element;
        this.eventListener = eventListener;
        this.eventType = eventType;
    }

    /**
     * Remove the event listener that this event is bound to.
     */
    removeEvent() {
        this.element.removeEventListener(this.eventType, this.eventListener);
    }
}

class EnhancedEcommerceService {
    constructor() {
        this.boundClickEventListeners = [];
        this.dataLayerName = "dataLayer";
    }

    /**
     * Push an ecommerce event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {boolean} defaultEcommerceSchema True when the data schema provides only the items. If the ecommerce object needs to have more values this needs to be set to false.
     * @param {Array} extraEventDataSchemas Extra dataschemas to add to the top object to be on the same level as the ecommerce object.
     */
    pushEcommerceEvent(eventName, dataSchema, defaultEcommerceSchema = true, extraEventDataSchemas = null) {
        this.privatePushEcommerceEvent(eventName, dataSchema, document, defaultEcommerceSchema, extraEventDataSchemas);
    }

    /**
     * Pushes an ecommerce event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {Element} startingElement The element to start from, either document for self pushed events or the event target from click events.
     * @param {boolean} defaultEcommerceSchema True when the data schema provides only the items. If the ecommerce object needs to have more values this needs to be set to false.
     * @param {Array} extraEventDataSchemas Extra dataschemas to add to the top object to be on the same level as the ecommerce object.
     */
    privatePushEcommerceEvent(eventName, dataSchema, startingElement, defaultEcommerceSchema, extraEventDataSchemas) {
        try {
            const data = dataSchema.getData(startingElement);
            
            let eventData = {
                event: eventName
            };
            
            if (defaultEcommerceSchema){
                // The items array can include up to 200 elements.
                if (data != null) {
                    data.length = Math.min(data.length, 200);
                }
                eventData.ecommerce = {};
                eventData.ecommerce["items"] = data || [];
            } else {
                if (data == null) {
                    if (window.StructuredDataLibrarySettings.DebugMode) console.warn(`No data was found for the Ecommerce object for '${eventName}'. Cancelling the data layer push.`);
                    return;
                }

                // The items array can include up to 200 elements.
                if (data["items"] != null) {
                    data["items"].length = Math.min(data["items"].length, 200);
                }

                eventData[dataSchema.name] = data;
            }

            // If there are extra event data schemas, add these to the top layer of the event object.
            if (extraEventDataSchemas && extraEventDataSchemas.length > 0) {
                extraEventDataSchemas.forEach(extraEventDataSchema => {
                    eventData[extraEventDataSchema.name] = extraEventDataSchema.getData(document);
                });
            }
            
            // Clear the previous ecommerce object.
            this.privatePushToDataLayer({ ecommerce: null })
            this.privatePushToDataLayer(eventData);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Push an ecommerce event when the item from the initiator selector has been clicked.
     * @param {string} eventName The name of the event to be pushed when clicked.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {string} initiatorSelector The element that needs to initiate the click event, relative to the data schema item container or the item container if this value is empty.
     * @param {boolean} stopPropagation If set to true the 'stopPropagation' method of the click event will be called.
     * @param {Array} extraEventDataSchemas Extra dataschemas to add to the top object to be on the same level as the ecommerce object.
     */
    bindClickEcommerceEvent(eventName, dataSchema, initiatorSelector = "", defaultEcommerceSchema = true, stopPropagation = false, extraEventDataSchemas = null) {
        try {
            const initiators = document.querySelectorAll(dataSchema.itemContainerSelector);
            initiators.forEach(initiator => {
                let elementsToBind = [];
                initiatorSelector === "" ?  elementsToBind.push(initiator) : elementsToBind = initiator.querySelectorAll(initiatorSelector);
                elementsToBind.forEach(elementToBind => {
                    const eventListener = (event) => {
                        if (stopPropagation) {
                            event.stopPropagation();
                        }
                        this.privatePushEcommerceEvent(eventName, dataSchema, elementToBind, defaultEcommerceSchema, extraEventDataSchemas);
                    }
                    elementToBind.addEventListener("click", eventListener);
                    this.boundClickEventListeners.push(new BoundEventListener(elementToBind, eventListener, "click"));
                });
            });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Push a custom event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     */
    pushCustomEvent(eventName, dataSchema) {
        this.privatePushCustomEvent(eventName, dataSchema, document);
    }

    /**
     * Pushes a custom event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {Element} startingElement The element to start from, either document for self pushed events or the event target from click events.
     */
    privatePushCustomEvent(eventName, dataSchema, startingElement) {
        try {
            const data = dataSchema.getData(startingElement);
            const eventData = {event: eventName, ...data};
            this.privatePushToDataLayer(eventData);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Push a custom event when the item from the initiator selector has been clicked.
     * @param {string} eventName The name of the event to be pushed when clicked.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {string} initiatorSelector The element that needs to initiate the click event, relative to the data schema item container or the item container if this value is empty.
     * @param {boolean} stopPropagation If set to true the 'stopPropagation' method of the click event will be called. 
     */
    bindClickCustomEvent(eventName, dataSchema, initiatorSelector = "", stopPropagation = false) {
        try {
            const initiators = document.querySelectorAll(dataSchema.itemContainerSelector);
            initiators.forEach(initiator => {
                let elementsToBind = [];
                initiatorSelector === "" ?  elementsToBind.push(initiator) : elementsToBind = initiator.querySelectorAll(initiatorSelector);
                elementsToBind.forEach(elementToBind => {
                    const eventListener = (event) => {
                        if (stopPropagation) {
                            event.stopPropagation();
                        }
                        this.privatePushCustomEvent(eventName, dataSchema, elementToBind);
                    }
                    elementToBind.addEventListener("click", eventListener);
                    this.boundClickEventListeners.push(new BoundEventListener(elementToBind, eventListener, "click"));
                });
            });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Push an event to the data layer.
     * @param {object} eventData The event data to push to the data layer.
     */
    privatePushToDataLayer(eventData) {
        // Create the data layer if it does not yet exists.
        window[this.dataLayerName] = window[this.dataLayerName] || [];

        window[this.dataLayerName].push(eventData);
        console.log("Enhanced Ecommerce:", window[this.dataLayerName][window[this.dataLayerName].length - 1]);
    }

    /**
     * Remove all event listeners that have been bound for clicks using the bind functions of this Enhanced Ecommerce object.
     */
    removeAllBoundClicks() {
        try {
            this.boundClickEventListeners.forEach(boundClickEventListener => {
                boundClickEventListener.removeEvent();
            });

            this.boundClickEventListeners = [];
        } catch (error) {
            console.error(error);
        }
    }
}

window.enhancedEcommerceService = new EnhancedEcommerceService();