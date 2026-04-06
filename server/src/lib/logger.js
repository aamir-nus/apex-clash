function formatContext(context = {}) {
  const entries = Object.entries(context).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return "";
  }

  return ` ${JSON.stringify(Object.fromEntries(entries))}`;
}

function write(level, message, context) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${level.toUpperCase()} ${message}${formatContext(context)}`;
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](line);
}

export const logger = {
  info(message, context) {
    write("info", message, context);
  },
  warn(message, context) {
    write("warn", message, context);
  },
  error(message, context) {
    write("error", message, context);
  }
};
