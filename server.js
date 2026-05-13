const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("NexaPayTradeFX Backend Running")
})

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err))

const authRoutes = require("./routes/authRoutes")

app.use("/api/auth", authRoutes)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log("Server running on", PORT)
})
