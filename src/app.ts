import "reflect-metadata"
import { container } from "./container"
import { Server } from "./server"

const server = container.get(Server)
server.listen()
