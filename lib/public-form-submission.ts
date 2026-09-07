export type PublicFormClientFields = Record<string, string | string[]>;

export function buildPublicFormPayload(
  formType: string,
  fields: PublicFormClientFields,
  securityCheckToken: string,
) {
  return {
    formType,
    ...fields,
    securityCheckToken,
  };
}
