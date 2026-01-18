// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Buffer } from "node:buffer"; // Required for handling file data
import { convert } from "npm:html-to-text"; // We need a way to strip HTML tags for the URL feature
import pdf from "npm:pdf-parse@1.1.1"; // The Text Extractor Library

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { inputType, data, userId, deckId } = await req.json();

    if (!OPENAI_API_KEY) throw new Error("Missing OpenAI API Key");
    if (!userId) throw new Error("Missing User ID");

    console.log(`🐧 BrainGuin Processing: ${inputType}`);

    // --- 1. ROBUST TEXT EXTRACTION ---
    let cleanText = ""; // Initialize empty

    // HANDLE PDF
    if (inputType === 'pdf') {
      console.log("📄 Extracting text from PDF...");
      const dataBuffer = Buffer.from(data, 'base64');
      const pdfData = await pdf(dataBuffer);
      cleanText = pdfData.text;
    } 
    // HANDLE URL (New Feature Fix)
    else if (inputType === 'url') {
       console.log("🌐 Scraping URL...");
       const urlResponse = await fetch(data); // 'data' is the URL string
       const html = await urlResponse.text();
       // Convert HTML to plain text to save tokens and reduce noise
       cleanText = convert(html, { wordwrap: 130 });
    } 
    // HANDLE RAW TEXT / TOPIC
    else {
      cleanText = data;
    }

    // --- SAFETY TRUNCATION ---
    // gpt-4o-mini has a 128k context window, but let's keep it efficient.
    const MAX_CHARS = 60000; 
    if (cleanText.length > MAX_CHARS) {
      console.log(`✂️ Truncating content from ${cleanText.length} to ${MAX_CHARS}`);
      cleanText = cleanText.substring(0, MAX_CHARS) + "... [Truncated]";
    }

    // --- 3. CALL OPENAI ---
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // gpt-4o is fast and good at formatting JSON
        messages: [
          {
            role: 'system',
            content: `You are BrainGuin, an elite Spaced Repetition architect.
            
            YOUR GOAL:
            Convert the provided SOURCE MATERIAL into high-impact "Atomic Flashcards".
            
            RULES FOR FLASHCARDS:
            1. **Atomic Principle**: One card = One concept.
            2. **Active Recall**: Use direct questions. No "True/False".
            3. **Brevity**: Answers must be concise (under 2 sentences).
            4. **Extraction**: If the text is messy (from a PDF), ignore headers/footers and focus on the core knowledge.
            5. **Quantity**: Generate 5 cards.
            
            OUTPUT FORMAT:
            Return ONLY valid JSON with this structure:
            {
              "title": "Short Deck Title",
              "summary": "A concise bullet-point summary (markdown supported).",
              "flashcards": [{ "front": "Q", "back": "A" }]
            }`
          },
          { role: 'user', content: `SOURCE MATERIAL:\n\n${cleanText}` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await response.json();
    
    if (aiData.error) throw new Error(aiData.error.message);

    const content = JSON.parse(aiData.choices[0].message.content);

    // --- 4. SAVE TO DATABASE (The New Part) ---
    console.log("💾 Saving to Supabase...");
    
    // --- 4. SAVE TO DATABASE ---
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    let targetDeckId = deckId;

    if (!targetDeckId) {
      // FLOW A: Create a New Deck
      const { data: newDeck, error: deckError } = await supabaseAdmin
        .from('decks')
        .insert({
          user_id: userId,
          title: content.title || "New Deck",
          source_type: inputType,
          source_content: cleanText
        })
        .select().single();
      
      if (deckError) throw new Error(`Deck Creation Failed: ${deckError.message}`);
      targetDeckId = newDeck.id;
    }

   // FLOW B: Append Cards (Works for both New and Existing Decks)
    const cardsToInsert = content.flashcards.map((card: any) => ({
      deck_id: targetDeckId,
      user_id: userId,
      front: card.front,
      back: card.back,
      is_mastered: false
    }));

    const { error: cardsError } = await supabaseAdmin
      .from('flashcards')
      .insert(cardsToInsert);

    if (cardsError) throw new Error(`Cards Save Failed: ${cardsError.message}`);

   // --- 5. SUCCESS RESPONSE ---
    // We return success: true, the deck_id, and the count of NEW cards added
    return new Response(JSON.stringify({ 
      success: true, 
      deck_id: targetDeckId, 
      card_count: cardsToInsert.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Server Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});