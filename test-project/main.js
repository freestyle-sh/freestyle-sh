import express from "express";
import { useCloud } from "freestyle-sh";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  const count = await useCloud("counter")
    .increment()
    .catch((err) => {
      console.error(err);
      res.send("Failed to increment");
    });
  res.send(`the count is ${count.value}`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
