const captureDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function parseCreateTime(createTime?: string) {
  if (!createTime) {
    return null;
  }
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatCaptureDate(createTime?: string) {
  const date = parseCreateTime(createTime);
  if (!date) {
    return null;
  }
  return captureDateFormatter.format(date);
}

export function formatMemoryHeadline(createTime?: string) {
  const date = parseCreateTime(createTime);
  if (!date) {
    return null;
  }
  const now = new Date();
  const sameMonthDay = date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const yearDiff = now.getFullYear() - date.getFullYear();

  if (sameMonthDay && yearDiff > 0) {
    const years = yearDiff === 1 ? "one year" : `${yearDiff} years`;
    return `On this day, ${years} ago`;
  }

  return null;
}
