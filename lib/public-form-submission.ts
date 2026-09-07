export type PublicFormClientFields = Record<string, string | string[]>;

export function buildPublicFormPayload(
  formType: string,
  fields: PublicFormClientFields,
  turnstileToken: string,
) {
  return {
    formType,
    ...fields,
    turnstileToken,
  };
}
