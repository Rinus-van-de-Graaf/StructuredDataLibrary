//version = "V 1.2.0" Add UNRELEASED if the current version is not yet published to the CDN. When releasing remove UNRELEASED.

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
        
        if(this.asArray) {
            return [this._getDataFromItemContainer(usingItemContainer)];
        }

        return this._getDataFromItemContainer(usingItemContainer);
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
     */
    pushEcommerceEvent(eventName, dataSchema, defaultEcommerceSchema = true) {
        this.privatePushEcommerceEvent(eventName, dataSchema, document, defaultEcommerceSchema);
    }

    /**
     * Pushes an ecommerce event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {Element} startingElement The element to start from, either document for self pushed events or the event target from click events.
     * @param {boolean} defaultEcommerceSchema True when the data schema provides only the items. If the ecommerce object needs to have more values this needs to be set to false.
     */
    privatePushEcommerceEvent(eventName, dataSchema, startingElement, defaultEcommerceSchema) {
        const data = dataSchema.getData(startingElement);
        
        let eventData = {
            event: eventName
        };
        
        if(defaultEcommerceSchema){
            // The items array can include up to 200 elements.
            data.length = Math.min(data.length, 200);
            eventData.ecommerce = {};
            eventData.ecommerce["items"] = data;
        } else {
            // The items array can include up to 200 elements.
            if(data["items"] != null) {
                data["items"].length = Math.min(data["items"].length, 200);
            }

            eventData[dataSchema.name] = data;
        }
        
        // Clear the previous ecommerce object.
        this.privatePushToDataLayer({ ecommerce: null })
        this.privatePushToDataLayer(eventData);
    }

    /**
     * Push an ecommerce event when the item from the initiator selector has been clicked.
     * @param {string} eventName The name of the event to be pushed when clicked.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {string} initiatorSelector The element that needs to initiate the click event, relative to the data schema item container or the item container if this value is empty.
     * @param {boolean} stopPropagation If set to true the 'stopPropagation' method of the click event will be called. 
     */
    bindClickEcommerceEvent(eventName, dataSchema, initiatorSelector = "", defaultEcommerceSchema = true, stopPropagation = false) {
        const initiators = document.querySelectorAll(dataSchema.itemContainerSelector);
        initiators.forEach(initiator => {
            const elementToBind = initiatorSelector === "" ? initiator : initiator.querySelector(initiatorSelector);
            if(elementToBind == null) {
                return;
            }

            const eventListener = (event) => {
                if(stopPropagation) {
                    event.stopPropagation();
                }
                this.privatePushEcommerceEvent(eventName, dataSchema, elementToBind, defaultEcommerceSchema);
            }
            elementToBind.addEventListener("click", eventListener);
            this.boundClickEventListeners.push(new BoundEventListener(elementToBind, eventListener, "click"));
        });
    }

    /**
     * Push a custom event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     */
    pushCustomEvent(eventName, dataSchema) {
        this._pushCustomEvent(eventName, dataSchema, document);
    }

    /**
     * Pushes a custom event to the data layer.
     * @param {string} eventName The name of the event.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {Element} startingElement The element to start from, either document for self pushed events or the event target from click events.
     */
    _pushCustomEvent(eventName, dataSchema, startingElement) {
        const data = dataSchema.getData(startingElement);
        const eventData = {event: eventName, ...data};
        this.privatePushToDataLayer(eventData);
    }

    /**
     * Push a custom event when the item from the initiator selector has been clicked.
     * @param {string} eventName The name of the event to be pushed when clicked.
     * @param {DataSchema} dataSchema The data schema to use.
     * @param {string} initiatorSelector The element that needs to initiate the click event, relative to the data schema item container or the item container if this value is empty.
     * @param {boolean} stopPropagation If set to true the 'stopPropagation' method of the click event will be called. 
     */
    bindClickCustomEvent(eventName, dataSchema, initiatorSelector = "", stopPropagation = false) {
        const initiators = document.querySelectorAll(dataSchema.itemContainerSelector);
        initiators.forEach(initiator => {
            const elementToBind = initiatorSelector === "" ? initiator : initiator.querySelector(initiatorSelector);
            if(elementToBind == null) {
                return;
            }

            const eventListener = (event) => {
                if(stopPropagation) {
                    event.stopPropagation();
                }
                this._pushCustomEvent(eventName, dataSchema, elementToBind);
            }
            elementToBind.addEventListener("click", eventListener);
            this.boundClickEventListeners.push(new BoundEventListener(elementToBind, eventListener, "click"));
        });
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
        this.boundClickEventListeners.forEach(boundClickEventListener => {
            boundClickEventListener.removeEvent();
        });

        this.boundClickEventListeners = [];
    }
}

window.enhancedEcommerceService = new EnhancedEcommerceService();