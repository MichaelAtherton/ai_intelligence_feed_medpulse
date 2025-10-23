"use node";

import OpenAI from "openai";

interface AnalysisResult {
  industry?: string;
  department?: string;
  aiTechnology?: string[];
  businessImpact?: string;
  technicalDetails?: string;
  keyInsights?: string[];
  summary?: string;
  tags?: string[];
}

export async function analyzeArticleContent(
  title: string,
  content: string,
  url: string,
  apiKey?: string,
  model?: string
): Promise<AnalysisResult> {
  const openai = new OpenAI({
    baseURL: apiKey ? undefined : process.env.CONVEX_OPENAI_BASE_URL,
    apiKey: apiKey || process.env.CONVEX_OPENAI_API_KEY,
  });

  // Truncate content if too long (keep first 15k chars for context)
  const truncatedContent = content.length > 15000 
    ? content.slice(0, 15000) + '...' 
    : content;

  const prompt = `Analyze this AI healthcare article and extract structured insights.

Title: ${title}
URL: ${url}

Content:
${truncatedContent}

Extract the following information in JSON format:
{
  "industry": "Primary healthcare industry (e.g., Hospital Systems, Pharmaceuticals, Medical Devices, Diagnostics, Telemedicine)",
  "department": "Primary department/function (e.g., Radiology, Oncology, Emergency Medicine, Clinical Research, Operations)",
  "aiTechnology": ["List of AI technologies mentioned (e.g., Computer Vision, NLP, Machine Learning, Deep Learning, LLM)"],
  "businessImpact": "Brief description of business impact or ROI (1-2 sentences)",
  "technicalDetails": "Key technical implementation details (1-2 sentences)",
  "keyInsights": ["3-5 key takeaways or insights"],
  "summary": "2-3 sentence summary of the article",
  "tags": ["5-7 relevant tags for categorization"]
}

Focus on:
- Specific AI use cases and applications
- Measurable outcomes or results
- Technical approaches and methodologies
- Business value and impact
- Industry-specific insights

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: model || "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are an AI healthcare analyst. Extract structured insights from articles about AI in healthcare. Always return valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
    
    // Validate and clean up the result
    return {
      industry: result.industry || undefined,
      department: result.department || undefined,
      aiTechnology: Array.isArray(result.aiTechnology) ? result.aiTechnology : undefined,
      businessImpact: result.businessImpact || undefined,
      technicalDetails: result.technicalDetails || undefined,
      keyInsights: Array.isArray(result.keyInsights) ? result.keyInsights : undefined,
      summary: result.summary || undefined,
      tags: Array.isArray(result.tags) ? result.tags : undefined,
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}
