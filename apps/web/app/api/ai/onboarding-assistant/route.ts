import Anthropic from '@anthropic-ai/sdk';

function getAnthropicApiKey() {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key || key === 'your_key_here') {
    return null;
  }
  return key;
}

const SYSTEM_PROMPT = `You are Fola, Foleio's friendly onboarding assistant.
Foleio is a Nigerian creator monetization platform where creators can:
- Sell digital content (videos, PDFs, images, tutorials)
- Create fan subscription plans (fans pay monthly in Naira)
- Offer bookable services with a services list
- Get paid via Paystack to Nigerian bank accounts

You are helping a Nigerian creator set up their Foleio account.
The onboarding has 4 steps:
1. Business info (display name, username, bio, category, social handles)
2. Payout account (optional during onboarding; creators can add this later on Earnings)
3. Subscription plans (optional - plans fans can subscribe to, priced in Naira)
4. Platform plan (Free ₦0 at 5% fee; Pro from ₦12,000/6mo at 3.5% + ₦100; Growth invite-only from ₦35,000/6mo at 3.5%)

Your job is to:
- Answer questions about any of the 4 steps in simple, friendly language
- Help creators decide what to write for their bio and display name
- Suggest subscription plan prices based on their content category
- Explain what each platform plan includes and help them choose
- Reassure creators who are nervous about the tech side
- Always respond in a warm, encouraging Nigerian tone
- Keep responses short - maximum 3 sentences unless they ask for more
- If asked anything unrelated to Foleio onboarding, politely redirect

You are NOT able to fill in the form for them - you can only guide and suggest.
Always end with an encouraging nudge to keep going.`;

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
    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      return Response.json(
        { error: 'Assistant unavailable right now (AI key missing)' },
        { status: 500 }
      );
    }
    const client = new Anthropic({ apiKey });

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
    console.error('Onboarding assistant error:', error);
    return Response.json(
      { error: 'Assistant unavailable right now' },
      { status: 500 }
    );
  }
}
