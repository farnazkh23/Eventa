export class SingleFlight {
  private inFlight: Promise<void> | null = null

  run(operation: () => Promise<void>): Promise<void> {
    if (this.inFlight) return this.inFlight

    const promise = operation().finally(() => {
      if (this.inFlight === promise) this.inFlight = null
    })
    this.inFlight = promise
    return promise
  }
}
