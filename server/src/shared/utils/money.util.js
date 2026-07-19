const PAISE_PER_RUPEE = 100;

function assertFiniteNonNegativeNumber(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number`);
    }

    if (value < 0) {
        throw new RangeError(`${name} cannot be negative`);
    }
}

// Shifting the decimal exponent avoids common binary floating-point rounding
// errors such as 1.005 becoming 100 paise instead of 101 paise.
function roundToPaise(amount) {
    const [coefficient, exponent = "0"] = amount.toString().toLowerCase().split("e");
    const shiftedExponent = Number(exponent) + 2;
    const amountInPaise = Math.round(Number(`${coefficient}e${shiftedExponent}`));

    if (!Number.isSafeInteger(amountInPaise)) {
        throw new RangeError("Amount is too large to represent safely in paise");
    }

    return Object.is(amountInPaise, -0) ? 0 : amountInPaise;
}

function toPaise(amount) {
    assertFiniteNonNegativeNumber(amount, "Amount");
    return roundToPaise(amount);
}

function fromPaise(amountInPaise) {
    assertFiniteNonNegativeNumber(amountInPaise, "Paise amount");

    if (!Number.isSafeInteger(amountInPaise)) {
        throw new RangeError("Paise amount must be a safe integer");
    }

    return amountInPaise / PAISE_PER_RUPEE;
}

function roundMoney(amount) {
    return fromPaise(toPaise(amount));
}

export { fromPaise, roundMoney, toPaise };

export default {
    fromPaise,
    roundMoney,
    toPaise,
};
