import type { TransformFnParams } from 'class-transformer';

type EnumShape = Record<string, string>;

export function normalizeEnumValue<T extends EnumShape>(
  value: unknown,
  enumType: T,
  aliases: Record<string, T[keyof T]> = {},
) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (Object.values(enumType).includes(trimmed as T[keyof T])) {
    return trimmed;
  }

  const normalizedKey = trimmed.toUpperCase().replace(/[\s-]+/g, '_');

  return (
    enumType[normalizedKey as keyof T] ??
    aliases[normalizedKey] ??
    trimmed
  );
}

export function enumValueTransform<T extends EnumShape>(
  enumType: T,
  aliases: Record<string, T[keyof T]> = {},
) {
  return ({ value }: TransformFnParams) =>
    normalizeEnumValue(value, enumType, aliases);
}
