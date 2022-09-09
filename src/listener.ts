import { Bot } from "./bot";
import { EventMap, EventPool } from "./events";
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
    }
    event(event_name: keyof EventMap) { // TODO: register event
        return this;
    }
}