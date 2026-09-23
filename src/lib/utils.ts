
export function safeDate(ts: any): Date {
  if (!ts) return new Date();
  
  // Firestore Timestamp
  if (typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  
  // Object with seconds (sometimes seen in serializations)
  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000);
  }
  
  // Object with _seconds
  if (typeof ts._seconds === 'number') {
    return new Date(ts._seconds * 1000);
  }
  
  // Native Date or string/number that can be parsed
  const date = new Date(ts);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return new Date();
}

export function safeToMillis(ts: any): number {
  return safeDate(ts).getTime();
}

export function safeToDateString(ts: any): string {
  return safeDate(ts).toLocaleDateString();
}
