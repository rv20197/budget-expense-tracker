export type FieldErrors<TField extends string = string> = Partial<
  Record<TField, string[]>
>;

export type ActionResult<TData, TField extends string = string> =
  | { success: true; data: TData }
  | { success: false; error: string; fieldErrors?: FieldErrors<TField> };
