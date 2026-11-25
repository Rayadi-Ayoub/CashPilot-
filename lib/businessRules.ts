/** Erreur levée quand une règle métier (RM1 à RM7) refuse une opération. */
export class BusinessRuleError extends Error {
  constructor(public readonly rule: string, message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}
