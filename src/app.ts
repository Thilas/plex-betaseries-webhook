import config from "config"
import { BetaSeries } from "./betaseries/betaseries"
import { initializeServer } from "./server"

initializeServer(new BetaSeries(config.get("betaseries")), config.get("server"), true)
