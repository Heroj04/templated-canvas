export class Condition {
  values: Map<string, unknown> | undefined
  or: Condition[] | undefined
  not: Condition | undefined

  constructor() {

  }

  public processConditions (inputs: any): boolean {
    // Get results of values
    const valueResults: boolean[] = []
    if (this.values != null) {
      this.values.forEach((value, key) => {
        valueResults.push(Condition.testInputValue(value, inputs[key]))
      })
    }
    // Check if any result is false
    const valueResult = (valueResults.some(result => !result))

    // Get results of or operator
    const orResult = this.or != null ? this.or.some(condition => condition.processConditions(inputs)) : true

    // Get results of not operator
    const notResult = this.not != null ? !this.not.processConditions(inputs) : true

    // Return if all operators and values are true
    return valueResult && orResult && notResult
  }

  static testInputValue (value: unknown, input: unknown): boolean {
    // Create a results array
    const results: boolean[] = []

    // Setup our operator functions
    const operatorFunctions: Record<string, (param1: any) => boolean> = {
      $match: (pattern: RegExp) => (input as string).match(pattern) != null,
      $lt: (value: number) => (input as number) < value,
      $lte: (value: number) => (input as number) <= value,
      $gt: (value: number) => (input as number) > value,
      $gte: (value: number) => (input as number) >= value,
      $in: (values: unknown[]) => values.some(value => value === input)
    }

    if (typeof value === 'object') {
      // If value is an object (i.e., containing operators)
      for (const operator in value) {
        if (!Object.prototype.hasOwnProperty.call(value, operator)) continue
        if (typeof operatorFunctions[operator] === 'function') {
          results.push(operatorFunctions[operator](value[operator]))
        }
      }
    } else {
      // Otherwise its a real value and just compare to inputs
      results.push(value === input)
    }

    // Check if any result is false
    return results.some(result => !result)
  }
}
