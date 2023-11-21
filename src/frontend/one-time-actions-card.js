// Learn more here:
// https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
//
// The UI is here:
// https://design.home-assistant.io/#concepts/home
//
// Look at the code in:
// - /Users/rluvaton/dev/playing-around/home-assistant/controlling-from-js
// - /Users/rluvaton/dev/personal/scheduler


import {
    LitElement,
    html,
    css,
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

let schemas;

// Taken from https://github.com/home-assistant/frontend/blob/e1dc73e992a620d580cd321f40ffa9ca44b8cc2a/gallery/src/pages/automation/editor-action.ts#L28-L44
// and then found the matching components
const AUTOMATION_ACTION_NEEDED_COMPONENTS = [
    "ha-automation-action-event",
    "ha-automation-action-device",
    "ha-automation-action-service",
    "ha-automation-action-condition",
    "ha-automation-action-delay",
    "ha-automation-action-scene",
    "ha-automation-action-play-media",
    "ha-automation-action-wait",
    "ha-automation-action-wait-for-trigger",
    "ha-automation-action-repeat",
    "ha-automation-action-if-then",
    "ha-automation-action-choose",
    "ha-automation-action-variables",
    "ha-automation-action-parallel",
    "ha-automation-action-stop",
];

let currentNumberOfComponentLoaded = 0;


async function waitForAutomationActionsComponentsToLoad(currentInstance) {
    if (isAutomationActionsComponentLoaded()) {
        currentInstance.requestUpdate();
        return schemas;
    }

    await loadAutomation();

    const componentsThatLoaded = await Promise.all(
        AUTOMATION_ACTION_NEEDED_COMPONENTS.map(async componentName => {
            await Promise.race([customElements.whenDefined(componentName), sleep(1000)]);
            const component = customElements.get(componentName);

            if (!component) {
                console.warn(`Timeout waiting for component ${componentName} for ${name} to load`);
                return undefined;
            }

            return true
        })
    );

    currentNumberOfComponentLoaded = Math.max(currentNumberOfComponentLoaded, componentsThatLoaded.filter(Boolean).length)

    currentInstance.requestUpdate();
}

function isAutomationActionsComponentLoaded() {
    return currentNumberOfComponentLoaded === AUTOMATION_ACTION_NEEDED_COMPONENTS.length;
}

function isAutomationActionsComponentsPartiallyLoaded() {
    return currentNumberOfComponentLoaded > 0;
}

class OneTimeActionsCard extends LitElement {
    actions = [];
    timeData = {
        hours: 0,
        minutes: 0,
        seconds: 0
    };
    addonBaseUrl;

    static get properties() {
        return {
            hass: {},
            config: {},
        };
    }

    onValueChanged = (ev) => {
        this.actions = ev.detail.value;
        this.requestUpdate();
    };

    runInChanged = (e) => {
        this.timeData = e.detail.value;
        this.requestUpdate();
    }

    render() {
        if (!isAutomationActionsComponentsPartiallyLoaded()) {
            waitForAutomationActionsComponentsToLoad(this);
            console.warn('still not loaded');
            return "";
        }

        return html`
            <div class="row">
                <div class="content">
                    <ha-card .header= ${"One time tasks"}>
                        <div class="card-content">

                            <!-- The run in time -->
                            <ha-form
                                    .data=${this.timeData}
                                    .schema=${[
                                        {
                                            type: "positive_time_period_dict",
                                            required: true,
                                        },
                                    ]}
                                    .computeLabel=${() => 'Run in'}
                                    @value-changed=${this.runInChanged}
                            >
                            </ha-form>

                            <br>

                            <!-- The actions to run when the time arrive -->
                            <ha-automation-action
                                    .required
                                    .hass=${this.hass}
                                    .actions=${this.actions}
                                    @value-changed=${this.onValueChanged}
                            ></ha-automation-action>
                        </div>

                        <div class="card-actions">
                            <!-- Add to one time runs -->
                            <mwc-button
                                    .disabled=${this.disabled}
                                    @click=${this.handleSubmit}
                            >Submit
                            </mwc-button>
                        </div>
                    </ha-card>
                </div>
            </div>
        `;
    }

    get disabled() {
        return this.actions.length === 0 || (this.timeData.hours === 0 && this.timeData.minutes === 0 && this.timeData.seconds === 0);
    }

    async handleSubmit() {
        console.log('submit was clicked', {
            actions: this.actions,
            runIn: this.timeData
        });

        try {
            await this.saveOneTimeTask({
                actions: this.actions,
                runIn: this.timeData
            });
        } catch (error) {
            console.error('Failed to save one time task', error);
        }
    }

    static styles = css`
      .row {
        display: flex;
      }

      .content {
        padding: 50px 0;
        background-color: var(--primary-background-color);
      }

      .light {
        flex: 1;
        padding-left: 50px;
        padding-right: 50px;
        box-sizing: border-box;
      }

      .light ha-card {
        margin-left: auto;
      }

      .dark {
        display: flex;
        flex: 1;
        padding-left: 50px;
        box-sizing: border-box;
        flex-wrap: wrap;
      }

      ha-card {
        width: 400px;
      }

      pre {
        width: 300px;
        margin: 0 16px 0;
        overflow: auto;
        color: var(--primary-text-color);
      }

      .card-actions {
        display: flex;
        flex-direction: row-reverse;
        border-top: none;
      }

      @media only screen and (max-width: 1500px) {
        .light {
          flex: initial;
        }
      }
      @media only screen and (max-width: 1000px) {
        .light,
        .dark {
          padding: 16px;
        }

        .row,
        .dark {
          flex-direction: column;
        }

        ha-card {
          margin: 0 auto;
          width: 100%;
          max-width: 400px;
        }

        pre {
          margin: 16px auto;
        }
      }


      .options {
        max-width: 800px;
        margin: 16px auto;
      }

      .options ha-formfield {
        margin-right: 16px;
      }
    `;

    // The user supplied configuration. Throw an exception and Home Assistant
    // will render an error card.
    async setConfig(config) {
        this.config = config;
        await waitForAutomationActionsComponentsToLoad(this);

        try {
            await this.assertCanSendRequests();
        } catch (error) {
            console.error('Failed to assert can send requests', error);
        }
    }

    async saveOneTimeTask({runIn, actions}) {
        const data = {
            runIn,
            actions
        };

        await this.sendPost('/one-time-tasks', data);
    }

    async sendGet(url) {
        return this.sendRequestToSchedulerAddon({
            method: 'GET',
            url
        });
    }

    async sendPost(url, data) {
        return this.sendRequestToSchedulerAddon({
            method: 'POST',
            url,
            data
        });
    }

    async sendRequestToSchedulerAddon({
                                          method,
                                          url,
                                          data
                                      }) {
        await this.assertCanSendRequests();

        try {
            const response = await this.hass.connection.sendMessagePromise({
                type: 'proxy-to-local-home-assistant-network/http',
                method: method.toUpperCase(),
                url: `${this.addonBaseUrl}${url}`,
                data: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            let body = response.content;

            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error('Failed to parse response body', body)
            }

            console.log({
                ...response,
                body
            });

            if (response.status_code >= 400) {
                throw new HttpError({
                    url,
                    body,
                    statusCode: response.status_code,
                    method,
                    message: 'Request failed'
                })
            }

            return body;
        } catch (err) {
            if (err instanceof HttpError) {
                throw err;
            }

            console.error('Message failed!', err);
            throw new Error('Failed to send request to scheduler addon')
        }
    }

    async assertCanSendRequests() {
        if (this.addonBaseUrl) {
            return;
        }

        let retries = 10;

        while (!this.addonBaseUrl && retries-- > 0) {
            if (!this.hass) {
                await sleep(1000);
            }

            if (!this.hass) {
                continue;
            }

            try {
                const addonInfo = await this.hass.callWS({
                    type: "supervisor/api",
                    method: "GET",

                    // TODO - Find a better way to get the hostname
                    endpoint: "/addons/ce16f137_scheduler/info"
                });

                this.addonBaseUrl = `http://${addonInfo.hostname}:3000`;
            } catch (err) {
                console.error('Failed to get addon info', err);
            }
        }

        if (!this.addonBaseUrl) {
            throw new Error('Failed to get addon hostname, timed out');
        }
    }
}

async function loadConfigPanel() {
    if (customElements.get("ha-panel-config")) return;

    await customElements.whenDefined("partial-panel-resolver");
    const ppResolver = document.createElement("partial-panel-resolver");
    const routes = ppResolver.getRoutes([
        {
            component_name: "config",
            url_path: "a",
        },
    ]);
    await routes?.routes?.a?.load?.();
    await customElements.whenDefined("ha-panel-config");
}

async function loadAutomation() {
    if (customElements.get("ha-config-automation")) return;

    await loadConfigPanel();

    const configRouter = document.createElement("ha-panel-config");

    await configRouter?.routerOptions?.routes?.automation?.load?.(); // Load ha-config-automation
    await configRouter?.routerOptions?.routes?.dashboard?.load?.(); // Load ha-config-dashboard
    await configRouter?.routerOptions?.routes?.general?.load?.(); // Load ha-settings-row
    await configRouter?.routerOptions?.routes?.entities?.load?.(); // Load ha-data-table

    await customElements.whenDefined("ha-config-automation");
}

customElements.define("one-time-actions-card", OneTimeActionsCard);

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}

class HttpError extends Error {
    constructor({url, method, body, statusCode, message}) {
        super(message);
        this.url = url;
        this.method = method;
        this.body = body;
        this.statusCode = statusCode;
    }
}
