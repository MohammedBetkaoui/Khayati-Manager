import type { TransformFnParams } from 'class-transformer';

export function enumValueTransform<T extends Record<string, string | number>>(
  enumObject: T,
) {
  return ({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;

    const normalized = value.trim();
    return enumObject[normalized as keyof T] ?? normalized;
  };
}
