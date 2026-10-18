import { observeWindowsIloader } from "../operator/windows-iloader-observer.mjs";

const result = observeWindowsIloader();
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
