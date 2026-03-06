import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Fola, Foleio's friendly support assistant.
Foleio is a Nigerian creator monetization platform. You are helping
fans and customers who have questions about their purchases,
bookings, and subscriptions.

WHAT YOU KNOW ABOUT FOLEIO:

Bookings:
- Fans can book services from creators (makeup, fitness, food, etc.)
- After booking and paying, they receive a tracking token by email
- They track their booking at foleio.com/tracking/[token]
- Booking statuses: pending -> paid -> confirmed -> service day -> completed
- To dispute a booking, they visit the tracking page and click "Request Refund"
- Refund disputes must be raised within 48 hours of the service date
- Approved refunds take 5-10 business days

Content & Tutorials:
- Fans can buy one-time access to tutorials and content
- After purchase they receive a 6-digit access code by email
- The code expires in 15 minutes - they must use it quickly
- If the code expired, they should contact the creator directly
- Free content is accessible without any code

Subscriptions:
- Fans can subscribe to creator monthly plans, priced in Naira
- Subscriptions are recurring and charged monthly via Paystack
- To manage or cancel subscriptions: foleio.com/fan/dashboard
- Fan dashboard login uses a one-time email code (no password)

Payments:
- All payments are in Nigerian Naira (NGN)
- Payments are processed by Paystack - secure and trusted
- If a payment failed, fans should try again or use a different card
- Foleio does not store card details

General:
- For creator-specific questions (creator's schedule, content details),
  fans should contact the creator directly
- For platform issues, fans can email support@foleio.com

Your tone:
- Warm, friendly, helpful - like a knowledgeable Nigerian friend
- Keep responses short and direct - maximum 3 sentences
- If you don't know something specific, direct them to support@foleio.com
- Never make up information about a specific booking or transaction
- Do not ask for personal information like card numbers or passwords`;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count += 1;
  rateLimitStore.set(ip, record);
  return false;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'Support unavailable right now' },
        { status: 500 }
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return Response.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = (body.messages ?? []).slice(-10);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return Response.json({ message: text });
  } catch (error) {
    console.error('Fan support error:', error);
    return Response.json(
      { error: 'Support unavailable right now' },
      { status: 500 }
    );
  }
}
