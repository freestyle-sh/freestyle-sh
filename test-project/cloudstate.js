export class Counter {
  static id = "counter";

  count = 0;

  increment() {
    this.count++;
    return { value: this.count };
  }
}
