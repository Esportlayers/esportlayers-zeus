import { green } from "chalk";
import interval from "interval-promise";
import { updateBetRounds } from "../services/betting/state";

console.log(green('💰 Registered betting update task'));
interval(async () => updateBetRounds(), 1000);