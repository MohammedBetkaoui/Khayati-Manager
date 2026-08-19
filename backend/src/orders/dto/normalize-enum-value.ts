import type { TransformFnParams } from 'class-transformer';

type EnumShape = Record<string, string>;

export function enumValueTransform<T extends EnumShape>(
  enumType: T,
  aliases: Record<string, T[keyof T]> = {},
) {
  return ({ value }: TransformFnParams): unknown => {
    const input: unknown = value;
    if (typeof input !== 'string') return input;

    const trimmed = input.trim();
    if (Object.values(enumType).includes(trimmed)) return trimmed;

    const key = trimmed.toUpperCase().replace(/[\s-]+/g, '_');
    return enumType[key as keyof T] ?? aliases[key] ?? trimmed;
  };
}
