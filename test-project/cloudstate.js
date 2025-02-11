import { useCloud, cloudstate } from "freestyle-sh";

console.log(process.env);

@cloudstate
class Counter {
  static id = "counter";

  count = 0;

  increment() {
    this.count++;
    return {
      value: this.count,
    };
  }
}
