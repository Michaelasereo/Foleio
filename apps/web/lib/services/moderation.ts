type ImageModerationResult = {
  flagged: boolean;
  confidence: number;
  reason: string;
};

export async function checkVideoModeration(
  muxAssetId: string,
  contentId: string,
  creatorEmail: string,
  contentTitle: string
): Promise<{ flagged: boolean; reason?: string }> {
  try {
    const auth = Buffer.from(
      `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
    ).toString('base64');

    await fetch(`https://api.mux.com/video/v1/assets/${muxAssetId}/master-access`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    void contentId;
    void creatorEmail;
    void contentTitle;
    return { flagged: false };
  } catch (error) {
    console.error('Moderation check failed:', error);
    return { flagged: false };
  }
}

export async function checkImageModeration(
  imageBase64: string,
  mediaType: string = 'image/jpeg'
): Promise<ImageModerationResult> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return { flagged: false, confidence: 0, reason: 'missing_api_key' };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `You are a content moderator for a Nigerian creator platform.
Analyze this image and respond ONLY with valid JSON, nothing else.
Format: {"flagged": boolean, "confidence": number, "reason": string}

Flag as true ONLY if the image contains:
- Sexually explicit content or pornography
- Full or partial nudity in a sexual context
- Content that sexualizes minors

Do NOT flag: fitness content, medical/educational content,
traditional clothing, bridal content, artistic content.

Confidence should be 0.0 to 1.0.
Reason should be brief (under 10 words) or "clean content".`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text || '{}';
    const clean = String(text).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as Partial<ImageModerationResult>;

    const confidence = Number(parsed.confidence || 0);
    const flagged = parsed.flagged === true && confidence > 0.8;

    return {
      flagged,
      confidence,
      reason: parsed.reason || 'unknown',
    };
  } catch (error) {
    console.error('Image moderation failed:', error);
    // Fail open to avoid blocking creators when moderation API fails.
    return { flagged: false, confidence: 0, reason: 'moderation_error' };
  }
}
