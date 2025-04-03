import { HfInference } from "@huggingface/inference";

export const dynamic = "force-dynamic"; // dynamic routing

const hf = new HfInference(process.env.HF_TOKEN);

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid prompt - must be a non-empty string",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      inputs: `You are an accurate, knowledgeable AI assistant. Provide only factual information. If unsure, say you don't know. Also just only return the response you have, no added "A:" or "Answer:" or anything else. Question: ${prompt}`,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.3,
        do_sample: true,
        return_full_text: false,
      },
    });

    // Clean the response
    const cleanResponse = response.generated_text
      .replace(/^A:\s*/i, "")
      .replace(/\[INST\].*?\[\/INST\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return new Response(JSON.stringify({ reply: cleanResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
