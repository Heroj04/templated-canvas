/**
 * A class representing a condition to be evaluated against a set of inputs
 */
export class Condition {
  values?: Map<string, unknown>
  or?: Condition[]
  not?: Condition

  /**
   * Create a Condition Object
   * @param values A map of Key Value Pairs as <InputName, EqualValue> or <InputName, {Operator: Value}>
   * @param or An array of conditions whose final value will be true if any containing conditions are true
   * @param not A condition whose result will be inverted
   */
  constructor (values?: Map<string, unknown>, or?: Condition[], not?: Condition) {
    this.values = values
    this.or = or
    this.not = not
    // TODO - condition constructor
  }

  /**
   * Process the conditons of this object against a set of inputs
   * @param inputs The inputs to evaluate the condition against
   * @returns True if the condition passes
   */
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

  /**
   * Test a single condition against a single condition value
   * @param value The value of the condition
   * @param input The input to compare against
   * @returns True if the value matches the input value or passess the operation
   */
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
          results.push(operatorFunctions[operator](value[operator as keyof typeof value]))
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
