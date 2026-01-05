interface GeminiRequest {
    contents: Array<{
        role?: "user" | "model";
        parts: Array<{ text: string }>;
    }>;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method === "GET") {
        return new Response(
            JSON.stringify({
                status: "ok",
                message: "Leads Genie AI (Hugging Face) is active",
            }),
            { headers: corsHeaders, status: 200 }
        );
    }

    try {
        const body = (await req.json().catch(() => null)) as GeminiRequest | null;

        if (!body?.contents?.length) {
            return new Response(
                JSON.stringify({ error: "No conversation content provided" }),
                { headers: corsHeaders, status: 400 }
            );
        }

        const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
        if (!apiKey) {
            console.error("Missing HUGGINGFACE_API_KEY");
            return new Response(
                JSON.stringify({ error: "AI Service configuration error" }),
                { headers: corsHeaders, status: 500 }
            );
        }

        // --- Model Configuration ---
        const targetModel = "meta-llama/Meta-Llama-3-8B-Instruct";
        const url = "https://router.huggingface.co/v1/chat/completions";

        // Convert Gemini-style "contents" to OpenAI-style "messages"
        const messages = body.contents.map(msg => ({
            role: msg.role === "model" ? "assistant" : "user",
            content: msg.parts.map(p => p.text).join("\n")
        }));

        console.log(`[AI] Request → ${targetModel} via router`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: targetModel,
                messages: messages,
                max_tokens: 1024,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[HF Error ${response.status}]`, errorText);

            return new Response(
                JSON.stringify({
                    error: "AI provider error",
                    status: response.status,
                    detail: errorText
                }),
                { headers: corsHeaders, status: response.status }
            );
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";

        return new Response(
            JSON.stringify({
                text: text.trim(),
                raw: data,
            }),
            { headers: corsHeaders, status: 200 }
        );
    } catch (err) {
        console.error("[Function Error]", err);
        return new Response(
            JSON.stringify({ error: "Internal service error" }),
            { headers: corsHeaders, status: 500 }
        );
    }
});
