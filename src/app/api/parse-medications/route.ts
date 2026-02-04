import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { text } = await request.json();

  console.log("=== PARSE MEDICATIONS API ===");
  console.log("Received text length:", text?.length || 0);
  console.log("Text preview:", text?.substring(0, 200));

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  try {
    console.log("Calling OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a medical document parser. Extract medication information from the provided text.

Return a JSON array of medications found. Each medication should have:
- name: The medication name (capitalize first letter)
- dosage: The dosage amount (e.g., "10mg", "500mg", "1 tablet")
- frequency: How often to take it (e.g., "once daily", "twice daily", "every 8 hours", "as needed")
- instructions: Any special instructions (optional)

If no medications are found, return an empty array [].

Only return valid JSON, no other text. Example format:
[{"name": "Lisinopril", "dosage": "10mg", "frequency": "once daily", "instructions": "take with food"}]`,
        },
        {
          role: "user",
          content: `Extract medications from this text:\n\n${text}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    console.log("OpenAI response:", content);

    // Parse the JSON response
    let medications = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      medications = JSON.parse(cleanContent);
      console.log("Parsed medications:", medications);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content, parseError);
      medications = [];
    }

    return NextResponse.json({ medications });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to parse medications", medications: [] },
      { status: 500 }
    );
  }
}
