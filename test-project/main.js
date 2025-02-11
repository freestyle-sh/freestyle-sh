import express from "express";
import { useCloud } from "freestyle-sh";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  useCloud("counter")
    .increment()
    .then((result) => {
      res.send(`the count is ${result.value}`);
    })
    .catch((err) => {
      console.log(err);
      res.send("Failed to increment: " + err);
    });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
