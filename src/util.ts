import "./components/colors";
import * as readline from "readline";
import { Writable } from "stream"
/**
 * Reading the console input with more options.
 * @param {String} qurey - the string before the input
 * @param {Boolean} muted - decide where the input should be hidden
 * @returns {Promise<Buffer>} reading result Promise
 * @example
 * ```
 * reading("Please input your password: ", true)
 *     .then(password => {
 *         console.log(String(password));
 *     })
 * ```
 */
export const reading = function (qurey: string = "", muted: boolean = false): Promise<Buffer> {
    return new Promise((resolve) => {
        const MUTED: boolean = muted;
        muted = false;
        var rl = readline.createInterface({
            input: process.stdin,
            output: MUTED ? new Writable({
                write: function (chunk, encoding, callback) {
                    if (!muted)
                        process.stdout.write(chunk, encoding);
                    callback();
                }
            }) : process.stdout,
            terminal: true
        });
        rl.question(qurey, function (answer: string) {
            rl.close();
            if (MUTED) process.stdout.write("\n");
            resolve(Buffer.from(answer));
        });
        muted = MUTED;
    });
}