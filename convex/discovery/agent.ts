import OpenAI from "openai";
import { webFetch, webFetchToolDefinition } from "./tools";
import { Tiktoken } from "js-tiktoken/lite";
import cl100k_base from "js-tiktoken/ranks/cl100k_base";

interface Source {
  name: string;
  url: string;
  type: string;
}

interface Discovery {
  url: string;
  title: string;
  published: string;
  source: string;
}

interface DiscoveryResult {
  discoveries: Discovery[];
  summary: {
    sources_checked: number;
    items_found: number;
  };
}

function countTokens(text: string): number {
  const encoding = new Tiktoken(cl100k_base);
  const tokens = encoding.encode(text);
  return tokens.length;
}

function estimateMessagesTokens(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += countTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if ('text' in part && typeof part.text === 'string') {
          total += countTokens(part.text);
        }
      }
    }
    // Add overhead for role and message structure
    total += 4;
  }
  return total;
}

export async function discoveryAgentOpenAI(
  sources: Source[],
  sinceDate: Date,
  topics: string[],
  apiKey?: string,
  model?: string,
  logger?: (data: any) => Promise<void>,
  progressCallback?: (current: number, total: number, sourceName: string) => Promise<void>
): Promise<DiscoveryResult> {
  const openai = new OpenAI({
    baseURL: apiKey ? undefined : process.env.CONVEX_OPENAI_BASE_URL,
    apiKey: apiKey || process.env.CONVEX_OPENAI_API_KEY,
  });

  console.log("🔍 Discovery Agent Starting (OpenAI)...");
  
  // Process sources in batches to avoid token limits
  const BATCH_SIZE = 3;
  const allDiscoveries: Discovery[] = [];
  
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(sources.length / BATCH_SIZE);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches}: ${batch.map(s => s.name).join(', ')}`);
    
    // Report progress for each source in the batch
    for (let j = 0; j < batch.length; j++) {
      const sourceIndex = i + j;
      if (progressCallback) {
        await progressCallback(sourceIndex + 1, sources.length, batch[j].name);
      }
    }
    
    const batchResult = await processBatch(openai, batch, sinceDate, topics, model, logger);
    allDiscoveries.push(...batchResult.discoveries);
  }
  
  return {
    discoveries: allDiscoveries,
    summary: {
      sources_checked: sources.length,
      items_found: allDiscoveries.length,
    },
  };
}

async function processBatch(
  openai: OpenAI,
  sources: Source[],
  sinceDate: Date,
  topics: string[],
  model?: string,
  logger?: (data: any) => Promise<void>
): Promise<DiscoveryResult> {
  const topicsText = topics.length > 0 
    ? topics.join(', ') 
    : 'AI in healthcare (diagnostics, surgery, patient care, research)';
  
  const prompt = `You are an AI healthcare discovery agent.

Goal: Find AI healthcare articles published after ${sinceDate.toISOString().split('T')[0]}.

Sources: ${sources.map(s => `${s.name}: ${s.url}`).join(', ')}

Topics of Interest: ${topicsText}

Steps:
1. Use web_fetch for each source (returns JSON with articles array)
2. Filter for articles related to these topics: ${topicsText}
3. Estimate dates from context (assume recent = new)
4. Only include items likely from after ${sinceDate.toISOString().split('T')[0]}

web_fetch returns: {"url": "...", "articles": [{"title": "...", "url": "...", "snippet": "..."}]}

Return JSON:
{
  "discoveries": [
    {"url": "https://...", "title": "...", "published": "YYYY-MM-DD", "source": "..."}
  ]
}

Only return JSON, no extra text.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: prompt },
  ];

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    webFetchToolDefinition as OpenAI.Chat.Completions.ChatCompletionTool,
  ];

  let iteration = 0;
  const maxIterations = 15;
  const maxContextTokens = 100000;
  const MAX_TOOL_RESULT_TOKENS = 20000;

  while (iteration < maxIterations) {
    iteration++;

    const currentTokens = estimateMessagesTokens(messages);
    console.log(`📊 Iteration ${iteration}: ${currentTokens} tokens`);
    
    if (currentTokens > maxContextTokens) {
      console.warn(`⚠️ Truncating messages (${currentTokens} tokens)`);
      const systemMessage = messages[0];
      const recentMessages = messages.slice(-5);
      messages.length = 0;
      messages.push(systemMessage);
      messages.push(...recentMessages);
    }

    const modelToUse = model || "gpt-4o-mini";
    
    // Log the actual LLM call
    if (logger) {
      await logger({
        type: "llm_request",
        iteration,
        model: modelToUse,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        tokensEstimate: currentTokens,
      });
    }

    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    // Log the LLM response
    if (logger) {
      await logger({
        type: "llm_response",
        iteration,
        content: message.content,
        toolCalls: message.tool_calls?.map(tc => {
          if (tc.type === 'function') {
            return {
              id: tc.id,
              function: tc.function.name,
              arguments: tc.function.arguments,
            };
          }
          return { id: tc.id, function: 'unknown', arguments: '' };
        }),
        tokensUsed: response.usage?.total_tokens,
      });
    }

    if (message.content) {
      console.log(`✅ Agent completed in ${iteration} iterations`);
      
      try {
        const jsonMatch = message.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        const result = JSON.parse(jsonMatch[0]) as DiscoveryResult;
        
        if (!result.summary) {
          result.summary = {
            sources_checked: sources.length,
            items_found: result.discoveries?.length ?? 0,
          };
        }
        
        return result;
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        return {
          discoveries: [],
          summary: { sources_checked: sources.length, items_found: 0 },
        };
      }
    }

    if (message.tool_calls) {
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") continue;
        
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 Tool call: web_fetch(${args.url.slice(0, 50)}...)`);

        let result = await webFetch(args.url);
        let resultTokens = countTokens(result);
        
        // Truncate if too large
        if (resultTokens > MAX_TOOL_RESULT_TOKENS) {
          console.warn(`⚠️ Tool result too large (${resultTokens} tokens), truncating to ${MAX_TOOL_RESULT_TOKENS}`);
          // Estimate character count for target tokens (roughly 4 chars per token)
          const targetChars = MAX_TOOL_RESULT_TOKENS * 4;
          result = result.slice(0, targetChars);
          resultTokens = countTokens(result);
        }
        
        console.log(`   → Fetched ${result.length} chars (${resultTokens} tokens)`);

        // Log tool result
        if (logger) {
          await logger({
            type: "tool_result",
            iteration,
            toolCallId: toolCall.id,
            function: toolCall.function.name,
            url: args.url,
            resultLength: result.length,
            resultTokens,
            result: result.slice(0, 1000) + (result.length > 1000 ? '...' : ''),
          });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    } else {
      console.warn("⚠️ No content or tool calls returned");
      return {
        discoveries: [],
        summary: { sources_checked: sources.length, items_found: 0 },
      };
    }
  }

  console.warn(`⚠️ Max iterations (${maxIterations}) reached`);
  return {
    discoveries: [],
    summary: { sources_checked: sources.length, items_found: 0 },
  };
}
