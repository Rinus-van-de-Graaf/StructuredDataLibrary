//version = "V 1.2.0" Add UNRELEASED if the current version is not yet published to the CDN. When releasing remove UNRELEASED.

class ConfiguratorChoiceSelector {
    /**
     * Information to bind events on elements when the configurator is used to be called when a choice is made to bind the choices.
     * @param {string} selector The selector to the elements to bind the event on.
     * @param {string} eventType The type of event to listen to, e.g. "click", "blur", "change".
     * @param {boolean} onPriceCalculated True to trigger the event after the price has been calculated, false to trigger directly.
     */
    constructor(selector, eventType, onPriceCalculated) {
        this.selector = selector;
        this.eventType = eventType;
        this.onPriceCalculated = onPriceCalculated;
    }
}

class ConfiguratorInstructionSelector {
    /**
     * Information to bind events on elements when the configurator is used to be called when a choice is made to bind the information icons.
     * @param {string} selector The selector to the elements to bind the event on.
     * @param {string} eventType The type of event to listen to, e.g. "mouseenter", "touchstart".
     */
    constructor(selector, eventType) {
        this.selector = selector;
        this.eventType = eventType;
    }
}

class ChoiceEventSettings {
    /**
     * 
     * @param {ConfiguratorChoiceSelector[]} configuratorChoiceSelectors A collection of configurator choice selectors, default empty array.
     * @param {Function} getChoiceMadeSchema A function to the choice made schema, used when at least 1 configurator choice selector is given. The function is given the "currentStep" and "chosenItem" (element which triggered the event, is null when "onPriceCalculated" is true).
     * @param {ConfiguratorInstructionSelector} configuratorInstructionSelectors A collection of configurator information icons selectors, default empty array.
     * @param {Function} getInstructionSchema A function to the information schema, used when at least 1 information selector is given. The function is given the "currentStep", "configuratorType" and "element" (element which triggered the event).
     */
    constructor(configuratorChoiceSelectors = [], getChoiceMadeSchema = null, configuratorInstructionSelectors = [], getInstructionSchema = null) {
        this.configuratorChoiceSelectors = configuratorChoiceSelectors;
        this.getChoiceMadeSchema = getChoiceMadeSchema;
        this.configuratorInstructionSelectors = configuratorInstructionSelectors;
        this.getInstructionSchema = getInstructionSchema;
    }
}

class ErrorEventSettings {
    constructor(nextButtonSelector, getErrorSchemas) {
        this.nextButtonSelector = nextButtonSelector;
        this.getErrorSchemas = getErrorSchemas;
    }
}

class EnhancedEcommerceConfiguratorService extends EnhancedEcommerceService {
    /**
     * 
     * @param {string} configuratorType The type of the configurator.
     * @param {Function} getVirtualPageviewSchema A function to get the virtual pageview schema. Function is given the "currentStep".
     * @param {Function} getStepCompleteSchema A function to get the step complete schema. Function is given the "currentStep".
     * @param {Function} getSummarySchema A function to the summary schema. The function is given nothing.
     * @param {Function} getAddToBasketSchema A function to the add to basket schema. The function is given nothing.
     * @param {Function} getPathChanged A function to the path changed schema. The function is given the "fromStep" and "toStep".
     * @param {ChoiceEventSettings} choiceEventSettings The settings to bind on choices, both for choices made as the information with the choice.
     * @param {ErrorEventSettings} errorEventSettings The settings to push errors to the data layer.
     */
    constructor(configuratorType, getVirtualPageviewSchema, getStepCompleteSchema, getSummarySchema, getAddToBasketSchema, getPathChanged, choiceEventSettings = null, errorEventSettings = null) {
        super();

        this.lastEvent = "";
        this.currentStep = 1;
        this.boundEventListeners = [];
        this.stepChanged = false;
        this.choiceMadeForPriceCalculated = false;

        this.configuratorType = configuratorType;
        this.getVirtualPageviewSchema = getVirtualPageviewSchema;
        this.getStepCompleteSchema = getStepCompleteSchema;
        this.getSummarySchema = getSummarySchema;
        this.getAddToBasketSchema = getAddToBasketSchema;
        this.getPathChanged = getPathChanged;
        this.choiceEventSettings = choiceEventSettings;
        this.errorEventSettings = errorEventSettings;

        this.privateInit();
    }

    privateInit() {
        // Start the virtual pageview on the first step.
        this.privatePushVirtualPageview(this.currentStep);

        this.privateInitBindings();
    }

    privateInitBindings() {
        // Bind the initial choices on the page.
        this.privateBindChoices();
        this.privateBindErrorsOnNext();

        document.addEventListener("jconfiguratorStepLoaded", this.privateStepChanged.bind(this));
        document.addEventListener("jconfiguratorStepRendered", this.privateBindChoices.bind(this));
        document.addEventListener("jconfiguratorSubStepRendered", this.privateBindChoices.bind(this));
        document.addEventListener("jconfiguratorSummaryLoaded", this.privateSummaryLoaded.bind(this));
        document.addEventListener("jconfiguratorAddToBasket", this.privateAddedToBasket.bind(this));
        document.addEventListener("jconfiguratorAfterCalculateTotalPrice", this.privatePriceCalculated.bind(this));
    }

    /**
     * Called on initBindings and when the configurator loaded another step.
     * Binds the next button (that triggers the errors) if the settings are provided.
     */
    privateBindErrorsOnNext() {
        if(this.errorEventSettings != null) {
            document.querySelectorAll(this.errorEventSettings.nextButtonSelector).forEach(button => {
                button.addEventListener("click", () => {
                        setTimeout(() => {
                        const errorEventSchemas = this.errorEventSettings.getErrorSchemas(this.currentStep, this.configuratorType);
                        // Delay a fraction to let the default functionality run first to make sure all errors are on the page.
                        errorEventSchemas.forEach(schema => {
                            this.privatePushConfiguratorEvent("ErrorMessage", schema);
                        });
                    }, 100);
                });
            });
        }
    }

    /**
     * Called when the configurator loaded another step.
     * It will call the virtual pageview and next/previous step events.
     */
    privateStepChanged() {
        this.stepChanged = true;
        const currentStep = parseInt((new URLSearchParams(window.location.search)).get("confloc").split("-")[0]);
        this.privatePushVirtualPageview(currentStep);
        this.privateNextPreviousStep(currentStep);
        this.privateBindErrorsOnNext();
    }

    /**
     * Pushes the next/previous events based on whether the user moved forward or backward.
     * @param {number} currentStep The step moved to.
     */
    privateNextPreviousStep(currentStep) {
        if(currentStep < this.currentStep) {
            this.privatePushConfiguratorEvent("Vorige stap", this.getPathChanged(this.currentStep, currentStep));
        } else if(currentStep > this.currentStep) {
            this.privatePushConfiguratorEvent("Volgende stap", this.getPathChanged(this.currentStep, currentStep));
        }
    }

    /**
     * Push an event from the configurator to the data layer.
     * @param {string} eventName The name of the event to push in the data layer.
     * @param {DataSchema} eventSchema The schema to use to generate the data layer information.
     * @param {Element} startingElement The element to start the schema from.
     */
    privatePushConfiguratorEvent(eventName, eventSchema, startingElement = document) {
        // Convert the data to Json to check whether the same event pas been pushed just before to prevent duplicates.
        const eventJson = JSON.stringify(eventSchema.getData(startingElement));

        if(this.lastEvent !== eventJson) {
            this._pushCustomEvent(eventName, eventSchema, startingElement);
        }

        this.lastEvent = eventJson;
    }

    /**
     * Called when the configurator loaded the summary.
     * It will push the summary event.
     * It will call the virtual pageview, step complete and next/previous step events.
     */
    privateSummaryLoaded() {
        this.privatePushVirtualPageview(this.currentStep + 1);
        this.privateNextPreviousStep(this.currentStep + 1);
        this.privatePushStepComplete(this.currentStep + 1);
        this.privatePushConfiguratorEvent("Samenvatting", this.getSummarySchema());
    }

    /**
     * Called when the configurator added the configuration to the basket.
     * It will push the add to basket event.
     */
    privateAddedToBasket() {
        const eventName = `Stap ${this.currentStep} afgerond - ${this.configuratorType}`;
        this.privatePushConfiguratorEvent(eventName, this.getAddToBasketSchema(this.currentStep));
    }

    /**
     * It will push the virtual pageview event.
     * @param {number} currentStep The step that is being viewed.
     */
    privatePushVirtualPageview(currentStep) {
        this.privatePushConfiguratorEvent("VirtualPageview", this.getVirtualPageviewSchema(currentStep));
    }

    /**
     * Called when the configurator finished calculating the price.
     * It will call the step complete or choice made events when it meets the criteria.
     */
    privatePriceCalculated() {
        // When the price has been calculated and a choice was delayed for this, call it.
        if(this.choiceMadeForPriceCalculated) {
            this.choiceMadeForPriceCalculated = false;
            this.privatePushChoiceMade(null);
        }

        // When the price has been calculated the first time since the step changed call the step complete.
        if(this.stepChanged) {
            this.stepChanged = false;
            this.privatePushStepComplete(parseInt((new URLSearchParams(window.location.search)).get("confloc").split("-")[0]));
        }
    }

    /**
     * It will push the steo complete event.
     * @param {number} currentStep The step that the user is currently on.
     */
    privatePushStepComplete(currentStep) {
        if(this.currentStep < currentStep) {
            const eventName = `Stap ${this.currentStep} afgerond - ${this.configuratorType}`;
            this.privatePushConfiguratorEvent(eventName, this.getStepCompleteSchema(this.currentStep));
        }

        this.currentStep = currentStep;
    }

    /**
     * Binds the event listeners to the choice elements.
     * @returns Returns if no choice event settings are set.
     */
    privateBindChoices() {
        if(this.choiceEventSettings == null) {
            return;
        }

        // Remove all event listeners that have been bound for the choices, otherwise it will keep adding event listeners.
        this.boundEventListeners.forEach(boundEventListener => {
            boundEventListener.removeEvent();
        });

        this.boundEventListeners = [];

        if(this.choiceEventSettings.configuratorChoiceSelectors != null && this.choiceEventSettings.configuratorChoiceSelectors.length > 0 && this.choiceEventSettings.getChoiceMadeSchema != null) {
            // Bind event listeners for each configurator choice selector.
            this.choiceEventSettings.configuratorChoiceSelectors.forEach(choiceSelector => {
                document.querySelectorAll(choiceSelector.selector).forEach(element => {
                    const event = choiceSelector.onPriceCalculated ? this.privatePushChoiceMadeDelayed.bind(this) : this.privatePushChoiceMade.bind(this);
                    element.addEventListener(choiceSelector.eventType, event);
                    this.boundEventListeners.push(new BoundEventListener(element, event, choiceSelector.eventType));
                });
            });
        }

        if(this.choiceEventSettings.configuratorInstructionSelectors != null && this.choiceEventSettings.configuratorInstructionSelectors.length > 0 && this.choiceEventSettings.getInstructionSchema != null) {
            // Bind event listeners for each configurator instruction selector.
            this.choiceEventSettings.configuratorInstructionSelectors.forEach(instructionSelector => {
                document.querySelectorAll(instructionSelector.selector).forEach(element => {
                    const event = () => {
                        this.privatePushConfiguratorEvent("Informatie icoon", this.choiceEventSettings.getInstructionSchema(this.currentStep, this.configuratorType, element));
                    };
                    element.addEventListener(instructionSelector.eventType, event);
                    this.boundEventListeners.push(new BoundEventListener(element, event, instructionSelector.eventType));
                });
            });
        }
    }

    /**
     * It will push the choice made event.
     * @param {Event} event The event that called this function. Can be null when delayed.
     */
    privatePushChoiceMade(event) {
        const eventName = `Keuzes stap ${this.currentStep} - ${this.configuratorType}`;
        this.privatePushConfiguratorEvent(eventName, this.choiceEventSettings.getChoiceMadeSchema(this.currentStep, event == null ? null : event.currentTarget));
    }

    /**
     * Mark that a choice has been made so that it will push the event when the price has been calculated.
     */
    privatePushChoiceMadeDelayed() {
        this.choiceMadeForPriceCalculated = true;
    }
}