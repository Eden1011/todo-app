const convertTimeToMilliseconds = require("../../utils/time.utils.js");

describe("convertTimeToMilliseconds", () => {
    describe("Valid time conversions", () => {
        const testCases = [
            { input: "500ms", expected: 500 },
            { input: "1millisecond", expected: 1 },
            { input: "100milliseconds", expected: 100 },

            { input: "1s", expected: 1000 },
            { input: "30sec", expected: 30000 },
            { input: "1second", expected: 1000 },
            { input: "60seconds", expected: 60000 },

            { input: "1m", expected: 60000 },
            { input: "5min", expected: 300000 },
            { input: "1minute", expected: 60000 },
            { input: "30minutes", expected: 1800000 },

            { input: "1h", expected: 3600000 },
            { input: "2hr", expected: 7200000 },
            { input: "1hour", expected: 3600000 },
            { input: "24hours", expected: 86400000 },

            { input: "1d", expected: 86400000 },
            { input: "1day", expected: 86400000 },
            { input: "7days", expected: 604800000 },

            { input: "1w", expected: 604800000 },
            { input: "1week", expected: 604800000 },
            { input: "2weeks", expected: 1209600000 },
        ];

        testCases.forEach(({ input, expected }) => {
            it(`should convert "${input}" to ${expected} milliseconds`, () => {
                expect(convertTimeToMilliseconds(input)).toBe(expected);
            });
        });
    });

    describe("Invalid time formats", () => {
        const invalidInputs = [
            "invalid",
            "5",
            "10x",
            "abc5m",
            "5 minutes",
            "",
            null,
            undefined,
        ];

        invalidInputs.forEach((input) => {
            it(`should throw error for "${input}"`, () => {
                expect(() => convertTimeToMilliseconds(input)).toThrow();
            });
        });

        it("should throw specific error for invalid format", () => {
            expect(() => convertTimeToMilliseconds("invalid")).toThrow(
                "Invalid time format. Supported formats are: seconds, minutes, hours, days, weeks or any shorthand version.",
            );
        });

        it("should throw specific error for unknown unit", () => {
            expect(() => convertTimeToMilliseconds("5xyz")).toThrow(
                "Unknown time unit: xyz",
            );
        });
    });

    describe("Edge cases", () => {
        it("should handle large numbers", () => {
            expect(convertTimeToMilliseconds("1000d")).toBe(86400000000);
        });

        it("should handle zero values", () => {
            expect(convertTimeToMilliseconds("0s")).toBe(0);
            expect(convertTimeToMilliseconds("0m")).toBe(0);
        });

        it("should be insensitive for units", () => {
            expect(convertTimeToMilliseconds("5M")).toBe(300000);
            expect(convertTimeToMilliseconds("2H")).toBe(7200000);
            expect(convertTimeToMilliseconds("1D")).toBe(86400000);
        });
    });

    describe("Mixed case input", () => {
        it("should handle mixed case units", () => {
            expect(convertTimeToMilliseconds("5Min")).toBe(300000);
            expect(convertTimeToMilliseconds("2Hours")).toBe(7200000);
            expect(convertTimeToMilliseconds("1DaY")).toBe(86400000);
        });
    });
});
