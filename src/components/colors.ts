import * as colors from "colors";

colors.setTheme({
    info: "cyan",
    success: "green",
    warn: "yellow",
    error: "red"
});

declare global {
    interface String {
        info: string,
        success: string,
        warn: string,
        error: string
    }
}