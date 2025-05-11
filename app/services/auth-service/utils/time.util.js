function convertTimeToMilliseconds(timeString) {
  const regex = /^(\d+)([a-zA-Z]+)$/;
  const match = timeString.match(regex);

  if (!match) {
    throw new Error(
      "Invalid time format. Supported formats are: seconds, minutes, hours, days, weeks or any shorthand version."
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const milliseconds = {
    ms: 1,
    millisecond: 1,
    milliseconds: 1,
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000
  };

  if (!(unit in milliseconds)) {
    throw new Error(`Unknown time unit: ${unit}`);
  }

  return value * milliseconds[unit];
}

module.exports = convertTimeToMilliseconds;
