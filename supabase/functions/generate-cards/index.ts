// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Buffer } from "node:buffer";
import mammoth from "npm:mammoth";
import { PDFExtract } from "npm:pdf.js-extract";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// --- RETRY HELPER (Resilience) ---
async function fetchWithRetry(url: string, options: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      // If rate limited (429) or server error (5xx), wait and retry
      if (response.status === 429 || response.status >= 500) {
        console.warn(`Attempt ${i + 1} failed. Retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoffish
        continue;
      }
      return response; // Return 4xx errors immediately (client fault)
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { inputType, data, userId, deckId, mimeType } = await req.json();

    console.log("--- 🏁 STARTING PROCESS ---");
    console.log(`Payload received: type=${inputType}, userId=${userId}, mime=${mimeType}`);

    if (!OPENAI_API_KEY) throw new Error("Missing OpenAI API Key");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Database Keys");
    if (!userId) throw new Error("Missing User ID");

    console.log(`🐧 BrainGuin Processing: ${inputType}`);

    // --- 1. ROBUST TEXT EXTRACTION & PROMPT SETUP ---
    let cleanText = ""; // Keep this for URL/Topic saving

    try {
     if (inputType === 'document') {
      console.log("📂 Step 1: Processing Document...");
         if (!data) throw new Error("No file data provided.");
         const dataBuffer = Buffer.from(data, 'base64');
         const safeMime = mimeType || ''; // Fallback to empty string if undefined

         if (safeMime.includes('pdf')) {
            //  console.log("📄 Extracting PDF Text...");
            //  const pdfData = await pdf(dataBuffer);
            //  cleanText = pdfData.text;
            //  console.log(`✅ PDF Extracted: ${cleanText.length} chars`);
            console.log("📄 Extracting PDF via pdf.js-extract...");
            const pdfExtract = new PDFExtract();
            const result = await pdfExtract.extractBuffer(dataBuffer, {});
            cleanText = result.pages
                .map(page => page.content.map(item => item.str).join(" "))
                .join("\n");
         } 
         else if (safeMime.includes('wordprocessingml') || safeMime.includes('msword')) {
             console.log("📝 Extracting Word Doc Text...");
             const result = await mammoth.extractRawText({ buffer: dataBuffer });
             cleanText = result.value;
             console.log(`✅ Word Doc Extracted: ${cleanText.length} chars`);
         } 
         else if (safeMime.includes('text/plain')) {
             console.log("📃 Extracting Plain Text...");
             cleanText = dataBuffer.toString('utf-8');
              console.log(`✅ Plain Text Extracted: ${cleanText.length} chars`);
         }
         else {
             // If we don't know the mime type, try parsing it as a string just in case,
             // otherwise throw an error.
             throw new Error(`Unsupported document format: ${safeMime}`);
         }

         if (!cleanText || cleanText.trim().length < 20) {
              console.warn("⚠️ Extracted text is very short or empty. This might be a scanned image without OCR. Please ensure the document contains selectable text.");
             throw new Error("Document text is empty or unreadable (might be a scanned image without text).");
         }
      } 
      else if (inputType === 'url') {
       console.log("🌐 Scraping URL...");
       if (data.includes('twitter.com') || data.includes('x.com')) {
             console.log("🐦 Using Twitter bypass...");
             // Convert https://x.com/user/status/123 to https://api.vxtwitter.com/user/status/123
             const vxUrl = data.replace('x.com', 'api.vxtwitter.com').replace('twitter.com', 'api.vxtwitter.com');
             
             const vxResponse = await fetch(vxUrl);
             if (!vxResponse.ok) throw new Error("Could not fetch Tweet.");
             
             const vxData = await vxResponse.json();
             // Extract the tweet text
             cleanText = `Tweet by ${vxData.user_name}:\n${vxData.text}`;
         } 
         // 🚨 USE JINA FOR EVERYTHING ELSE
         else {
       // By prepending https://r.jina.ai/, their server acts as a headless browser,
         // runs the JavaScript, strips the ads/menus, and returns clean text!
         const urlResponse = await fetch(`https://r.jina.ai/${data}`, {
             headers: {
                 // Tell Jina to return clean Markdown/Text optimized for AI
                 "Accept": "text/plain", 
             }
         });
         
         if (!urlResponse.ok) throw new Error(`Failed to access URL: ${urlResponse.statusText}`);
         
         cleanText = await urlResponse.text();
         
         if (!cleanText || cleanText.length < 100) {
             throw new Error("Website content is too short or aggressively blocked by the host.");
         }
        //  const urlResponse = await fetch(data);
        //  if (!urlResponse.ok) throw new Error(`Failed to access URL: ${urlResponse.statusText}`);
        //  const html = await urlResponse.text();
        //  cleanText = convert(html, { 
        //      wordwrap: 130, 
        //      selectors: [ 
        //          { selector: 'img', format: 'skip' },
        //          { selector: 'a', options: { ignoreHref: true } }
        //      ] 
        //  });
        //  if (!cleanText || cleanText.length < 100) throw new Error("Website content is too short or blocked.");
         }
      } 
      else {
        cleanText = data;
      }
    } catch (extractError: any) {
      console.error("Extraction Failed:", extractError);
      return new Response(JSON.stringify({ error: `Content Error: ${extractError.message}` }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // --- 2. TRUNCATION ---
    const MAX_CHARS = 50000; // Safe limit for gpt-4o-mini output buffer
    if (cleanText.length > MAX_CHARS) {
      console.log(`✂️ Truncating content from ${cleanText.length} chars`);
      cleanText = cleanText.substring(0, MAX_CHARS) + "... [Truncated]";
    }

    // --- 3. CALL OPENAI (With Retry & Better Prompt) ---
    console.log("🧠 Calling AI...");
    const prompt = `
      You are BrainGuin, an elite Spaced Repetition architect.
      
      YOUR GOAL:
      Analyze the SOURCE MATERIAL and convert *every* key concept into an "Atomic Flashcard".
      Do NOT limit the number of cards. Create as many as necessary to comprehensively cover the material (up to 50 max).

      LANGUAGE RULE (CRITICAL):
      1. First, detect the primary language of the SOURCE MATERIAL.
      2. Write that exact language name in the "detected_language" field (e.g., "English", "Spanish", "French").
      3. ALL subsequent fields (Title, Summary, Questions, Answers, Context) MUST be written in that EXACT SAME language.

      CRITICAL RULES:
      1. **Atomic Principle**: One card = One specific fact. Do not merge multiple concepts.
      2. **Active Recall**: Front must be a direct question. No "True/False" or multiple choice.
      3. **Brevity**: Answers must be extremely concise (under 2 sentences).
      4. **Extraction**: Ignore artifacts like page numbers, headers, footers, or citations. Focus only on the core educational content.
      5. **Comprehensive Coverage**: Generate as many cards as needed to fully cover the material (up to 50 max).

      CONTEXT HINTS:
      Provide a short, helpful hint for the "context" field to orient the user.
      - Good: "Relates to the year 1066" or "Type of sorting algorithm"
      - Bad: "Starts with B" (Don't give the answer away)

      OUTPUT FORMAT (JSON ONLY):
      {
        "detected_language": "The primary language of the source text",
        "title": "A short, catchy title for this deck (max 5 words) in the DETECTED LANGUAGE",
        "summary": "A brief summary of what this deck covers in the DETECTED LANGUAGE",
        "flashcards": [
           { 
             "question": "What is the powerhouse of the cell? (Must be in DETECTED LANGUAGE)", 
             "answer": "Mitochondria (Must be in DETECTED LANGUAGE)",
             "context": "Cell Biology - Organelle Function (Must be in DETECTED LANGUAGE)"
           }
        ]
      }
    `;
    

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', 
        messages: [ // 👈 Fixed Syntax here
          { role: 'system', content: prompt },
          { role: 'user', content: `SOURCE MATERIAL:\n\n${cleanText}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0
      })
    });

    const aiData = await response.json();
    if (aiData.error) throw new Error(`OpenAI Error: ${aiData.error.message}`);
    
    const content = JSON.parse(aiData.choices[0].message.content);

    // --- 4. SAVE TO DATABASE ---
    console.log(`💾 Saving ${content.flashcards.length} cards to Supabase...`);
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let targetDeckId = deckId;

    // A. Create Deck if needed
    if (!targetDeckId) {
      const { data: newDeck, error: deckError } = await supabaseAdmin
        .from('decks')
        .insert({
          user_id: userId,
          title: content.title || "New Study Deck",
          source_type: inputType,
          // 🚨 CRITICAL: Save 15000 chars so "Generate More" actually works!
          source_content: cleanText.substring(0, 15000)
        })
        .select().single();
      
      if (deckError) throw new Error(`DB Deck Error: ${deckError.message}`);
      targetDeckId = newDeck.id;
    }

    // B. Insert Cards (Using 'question', 'answer', 'context' to match DB)
    const cardsToInsert = content.flashcards.map((card: any) => ({
      deck_id: targetDeckId,
      user_id: userId,
      question: card.question, // Matches DB column
      answer: card.answer,     // Matches DB column
      context: card.context,   // Matches DB column
      status: 'new',
      interval_days: 0,
      ease_factor: 2.5,
      repetition_count: 0
    }));

    const { error: cardsError } = await supabaseAdmin
      .from('flashcards')
      .insert(cardsToInsert);

    if (cardsError) throw new Error(`DB Cards Error: ${cardsError.message}`);

    // --- 5. SUCCESS ---
    return new Response(JSON.stringify({ 
      success: true, 
      deck_id: targetDeckId, 
      card_count: cardsToInsert.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("🔥 Fatal Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

