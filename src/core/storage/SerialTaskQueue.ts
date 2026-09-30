/** A failure rejects its caller, but must not poison later operations. */
export class SerialTaskQueue {
  private tail: Promise<void> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }

  whenIdle(): Promise<void> { return this.tail; }
}
