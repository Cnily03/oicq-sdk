export abstract class AppHandler<T> {
    /**
     * What is the app handler called, used to distinguish between different app handlers.
     */
    readonly $identify: string;
    /**
     * Set up the app handler.
     * @param identify what is the app handler called, used to distinguish between different app handlers
     */
    constructor(identify: string) {
        this.$identify = identify;
    }
    /**
     * See example:
     * ```
     * const app = new Bot(...)
     * const handler = new Handler(...)
     * ...
     * app.use(handler)
     * ```
     * `app.use` will call the function apphandler in the class handler.
     * @param {T} app app instance
     */
    abstract apphandler(app: T): any;
}