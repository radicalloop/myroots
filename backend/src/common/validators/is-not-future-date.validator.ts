import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === null || value === undefined || value === '') {
            return true;
          }

          if (typeof value !== 'string') {
            return false;
          }

          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return false;
          }

          const today = new Date();
          today.setHours(23, 59, 59, 999);

          return date <= today;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not be in the future`;
        },
      },
    });
  };
}
