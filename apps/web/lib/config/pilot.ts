export const PILOT_EMAILS: string[] = [
  'your@email.com',
  'teammate@email.com',
  'asereope@gmail.com',
  'Shosglam@gmail.com',
  // add more here
];

export function isPilotEmail(email: string): boolean {
  return PILOT_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
