import express from "express"
import mongoose from "mongoose"
import Messages from "./dbMessages.js"
import Pusher from "pusher"
import cors from "cors"
import 'dotenv/config'

const app = express()
const port = process.env.PORT
const pusher = new Pusher({
  appId: "1609032",
  key: "b8255243c6e1dc4858f6", 
  secret: "e7a003ab7d33f44e4809",
  cluster: "ap2",
  useTLS: true
});

app.use(express.json())
app.use(cors())

const connection_url = process.env.MONGO_URL

mongoose.connect(connection_url, {})

app.get("/", (req, res) => {
    res.status(200).send("hello world, how you doing?" )
})

const db = mongoose.connection
db.once("open", () => {
    console.log("DB connected");
    const msgCollection = db.collection("messagecontents")
    const changeStream = msgCollection.watch()

    changeStream.on("change", (change) => {
        console.log(change);

        if (change.operationType === "insert") {
            const messageDetails = change.fullDocument
            pusher.trigger("messages", "inserted", {
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received,
            })
        } else {
            console.log("Error triggering pusher")
        }
    })
})

app.get("/messages/sync",  (req, res) => {
    Messages.find({})
    .then((data) => {
        res.status(200).send(data)
    })
        .catch((err) => {
        res.status(500).send(err)
    })
})

app.post("/messages/new", (req, res) => {
    const dbMessage = req.body

    Messages.create(dbMessage) 
        .then((data) => {
        res.status(201).send(data)
    })
        .catch((err) => {
        res.status(500).send(err)
    })
})

app.listen(port,() => {
    console.log(`Listening on localhost:${port}`);
})