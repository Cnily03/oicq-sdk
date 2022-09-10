import { Bot } from "./bot";
import { ActionThis, EventElem, EventMap, EventPool, EventResponse } from "./events";
import { AppHandler } from "./bot";

export class Listener extends AppHandler<Bot> {
    private event_pool: EventPool<Bot>;
    /**
     * Register one or more listener to some event(s).
     */
    constructor() {
        super("Listener");
        this.event_pool = [];
    }

    apphandler(app: Bot) {
        // this.event()
        // action.bind(this)
        for (const elem of this.event_pool) {
            app.CLIENT.on(elem.event, (...args: any) => {
                elem.action.call({
                    app: app
                }, ...args)
            });
        }
    }

    // TODO: Use options

    event<T extends keyof EventMap<Bot>>(event_name: T, action: EventElem<Bot, T>["action"]) {
        this.event_pool.push({
            event: event_name,
            action: action
        })
        return this;
    }
}