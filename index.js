class BaseValidator {
    constructor() {
        this.rules = [];
        this.isRequired = false;
    }

    required() {
        this.isRequired = true;
        this.rules.push((value, field) => {
            if (value === undefined || value === null || value === '') {
                throw { field, message: 'Value is required' };
            }
        });
        return this;
    }

    oneOf(allowedValues) {
        this.rules.push((value, field) => {
            if (!allowedValues.includes(value)) {
                throw { field, message: `Value must be one of: ${allowedValues.join(', ')}` };
            }
        });
        return this;
    }

    validate(value, field) {
        if (value === undefined && !this.isRequired) {
            return; // Пропускаем необязательные поля
        }
        for (let rule of this.rules) {
            rule(value, field);
        }
        return true;
    }
}

class StringValidator extends BaseValidator {
    constructor() {
        super();
    }

    email() {
        this.rules.push((value, field) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                throw { field, message: 'Invalid email format' };
            }
        });
        return this;
    }

    min(length) {
        this.rules.push((value, field) => {
            if (value.length < length) {
                throw { field, message: `Value must be at least ${length} characters long` };
            }
        });
        return this;
    }

    max(length) {
        this.rules.push((value, field) => {
            if (value.length > length) {
                throw { field, message: `Value must be no more than ${length} characters long` };
            }
        });
        return this;
    }

    reg(mask) {
        this.rules.push((value, field) => {
            const regex = new RegExp(mask);
            if (!regex.test(value)) {
                throw { field, message: 'String does not match the required pattern' };
            }
        });
        return this;
    }
}

class NumberValidator extends BaseValidator {
    constructor() {
        super();
    }

    min(minValue) {
        this.rules.push((value, field) => {
            if (value < minValue) {
                throw { field, message: `Value must be greater than or equal to ${minValue}` };
            }
        });
        return this;
    }

    max(maxValue) {
        this.rules.push((value, field) => {
            if (value > maxValue) {
                throw { field, message: `Value must be less than or equal to ${maxValue}` };
            }
        });
        return this;
    }

    phone() {
        this.rules.push((value, field) => {
            const phoneRegex = /^\+?[0-9]{10,12}$/;
            if (!phoneRegex.test(String(value))) {
                throw { field, message: 'Invalid phone number format' };
            }
        });
        return this;
    }
}

class BooleanValidator extends BaseValidator {
    constructor() {
        super();
    }

    validate(value, field) {
        if (value === undefined && !this.isRequired) {
            return; // Пропускаем необязательные поля
        }
        if (typeof value !== 'boolean') {
            throw { field, message: 'Value must be a boolean' };
        }
        return super.validate(value, field);
    }
}

class ArrayValidator extends BaseValidator {
    constructor() {
        super();
        this.itemValidator = null;
    }

    minLength(length) {
        this.rules.push((value, field) => {
            if (value.length < length) {
                throw { field, message: `Array must contain at least ${length} items` };
            }
        });
        return this;
    }

    maxLength(length) {
        this.rules.push((value, field) => {
            if (value.length > length) {
                throw { field, message: `Array must contain no more than ${length} items` };
            }
        });
        return this;
    }

    items(validator) {
        this.itemValidator = validator;
        this.rules.push((value, field) => {
            for (let i = 0; i < value.length; i++) {
                try {
                    validator.validate(value[i], `${field}[${i}]`);
                } catch (error) {
                    throw { field: error.field, message: error.message };
                }
            }
        });
        return this;
    }
}

class JSONValidator extends BaseValidator {
    constructor() {
        super();
    }

    validate(value, field) {
        if (value === undefined && !this.isRequired) {
            return;
        }
        try {
            JSON.parse(value);
        } catch (e) {
            throw { field, message: 'Invalid JSON format' };
        }
        return super.validate(value, field);
    }
}

class Schema {
    constructor(schema, only = false) {
        this.schema = new Map(Object.entries(schema));
        this.only = only;
    }

    validate(data) {
        const schemaKeys = Array.from(this.schema.keys());
        const dataKeys = Object.keys(data);

        if (this.only) {
            const extraFields = dataKeys.filter(key => !schemaKeys.includes(key));
            if (extraFields.length > 0) {
                throw { field: extraFields[0], message: `Unexpected field '${extraFields[0]}' not defined in schema` };
            }
        }

        for (let [key, validator] of this.schema.entries()) {
            if (!(key in data) && validator.isRequired) {
                throw { field: key, message: 'Field is required' };
            }
        }

        for (let key of schemaKeys) {
            if (key in data) {
                const validator = this.schema.get(key);
                validator.validate(data[key], key);
            }
        }

        return 'Validation successful';
    }
}

class Validator {
    static string() {
        return new StringValidator();
    }

    static number() {
        return new NumberValidator();
    }

    static boolean() {
        return new BooleanValidator();
    }

    static array() {
        return new ArrayValidator();
    }

    static json() {
        return new JSONValidator();
    }

    static createSchema(schemaDefinition, only = false) {
        return new Schema(schemaDefinition, only);
    }
}

module.exports = Validator;