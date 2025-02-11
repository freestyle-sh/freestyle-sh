import { useCloud } from "../src/index.js";

useCloud("counter", undefined, {
  baseUrl: "http://localhost:3000",
})
  .increment()
  .then((result) => {
    console.log(`the count is ${result.value}`);
  })
  .catch((err) => {
    console.error(err);
  });
