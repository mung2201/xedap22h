import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const IsFieldMatch = (
  matchingProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator => {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isFieldMatch',
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [matchingProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args?: ValidationArguments): boolean {
          if (!args) {
            return false;
          }

          const [property] = args.constraints;
          return value === (args.object as Record<string, unknown>)[property];
        },
        defaultMessage(args?: ValidationArguments): string {
          const [property] = args?.constraints ?? [matchingProperty];
          return `${args?.property ?? 'This field'} must match ${property}.`;
        },
      },
    });
  };
};
