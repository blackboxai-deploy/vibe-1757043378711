// AI Services Configuration for AnimaGenius
// Using OpenRouter custom endpoint for AI processing

interface AIResponse {
  success: boolean
  data?: any
  error?: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{
    type: 'text' | 'image_url' | 'file'
    text?: string
    image_url?: { url: string }
    file?: { filename: string; file_data: string }
  }>
}

const AI_CONFIG = {
  endpoint: process.env.OPENROUTER_API_URL || 'https://oi-server.onrender.com/chat/completions',
  customerId: process.env.OPENROUTER_CUSTOMER_ID || 'cus_SFkzlM4lBe5pBM',
  headers: {
    'customerId': process.env.OPENROUTER_CUSTOMER_ID || 'cus_SFkzlM4lBe5pBM',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer xxx',
  },
  models: {
    chat: 'openrouter/anthropic/claude-sonnet-4', // Default model for content analysis
    script: 'openrouter/openai/gpt-4o', // Script generation
    image: 'replicate/black-forest-labs/flux-1.1-pro', // Image generation
    video: 'replicate/google/veo-3', // Video generation
  },
  timeouts: {
    chat: 30000, // 30 seconds
    script: 60000, // 1 minute
    image: 300000, // 5 minutes
    video: 900000, // 15 minutes
  }
}

export class AIService {
  // Content Analysis Service
  static async analyzeContent(content: string, fileType: string): Promise<AIResponse> {
    try {
      const systemPrompt = `You are an expert content analyzer for video creation. Analyze the provided ${fileType} content and extract:
1. Key themes and topics
2. Main narrative points
3. Visual elements described or suggested
4. Target audience and tone
5. Recommended video structure
6. Key quotes or important segments

Provide a structured analysis that will help create an engaging video script.`

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this ${fileType} content:\n\n${content}` }
      ]

      const response = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: AI_CONFIG.headers,
        body: JSON.stringify({
          model: AI_CONFIG.models.chat,
          messages,
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    } catch (error) {
      console.error('Content analysis error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Analysis failed' }
    }
  }

  // Script Generation Service
  static async generateScript(
    analysis: string, 
    duration: number, 
    style: string = 'professional'
  ): Promise<AIResponse> {
    try {
      const systemPrompt = `You are an expert video script writer. Create an engaging ${duration}-second video script based on the content analysis.

Requirements:
- Script duration: ${duration} seconds (approximately ${Math.floor(duration / 10)} sentences)
- Style: ${style}
- Include timestamps for key sections
- Provide visual cues and suggestions
- Make it engaging and suitable for AI video generation
- Include clear narration text
- Suggest appropriate background music mood

Format your response as JSON with:
{
  "title": "Video title",
  "duration": ${duration},
  "script": [
    {
      "timestamp": "00:00-00:10",
      "narration": "Opening narration text",
      "visual_cue": "Visual description",
      "music_mood": "upbeat/calm/dramatic"
    }
  ],
  "summary": "Brief script summary"
}`

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a video script based on this analysis:\n\n${analysis}` }
      ]

      const response = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: AI_CONFIG.headers,
        body: JSON.stringify({
          model: AI_CONFIG.models.script,
          messages,
          max_tokens: 3000,
        }),
      })

      if (!response.ok) {
        throw new Error(`Script generation failed: ${response.statusText}`)
      }

      const data = await response.json()
      const scriptContent = data.choices[0].message.content
      
      try {
        const parsedScript = JSON.parse(scriptContent)
        return { success: true, data: parsedScript }
      } catch {
        // If JSON parsing fails, return raw script
        return { success: true, data: { raw_script: scriptContent } }
      }
    } catch (error) {
      console.error('Script generation error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Script generation failed' }
    }
  }

  // Image Generation Service
  static async generateImage(prompt: string, style: string = 'professional'): Promise<AIResponse> {
    try {
      const enhancedPrompt = `${prompt}, ${style} style, high quality, professional lighting, detailed, 4K resolution`

      const response = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: AI_CONFIG.headers,
        body: JSON.stringify({
          model: AI_CONFIG.models.image,
          messages: [
            { role: 'user', content: `Generate an image: ${enhancedPrompt}` }
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    } catch (error) {
      console.error('Image generation error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Image generation failed' }
    }
  }

  // Video Generation Service
  static async generateVideo(prompt: string, duration: number = 10): Promise<AIResponse> {
    try {
      const videoPrompt = `Create a ${duration}-second video: ${prompt}. High quality, professional, smooth transitions, engaging visuals.`

      const response = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: AI_CONFIG.headers,
        body: JSON.stringify({
          model: AI_CONFIG.models.video,
          messages: [
            { role: 'user', content: videoPrompt }
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    } catch (error) {
      console.error('Video generation error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Video generation failed' }
    }
  }

  // File Analysis with Multimodal Support
  static async analyzeFile(
    fileContent: string, 
    fileType: string, 
    fileName: string,
    base64Data?: string
  ): Promise<AIResponse> {
    try {
      const systemPrompt = `You are an expert file analyzer. Extract all relevant information from this ${fileType} file (${fileName}) that would be useful for creating a video. Include:
1. Main content and structure
2. Key data points and insights
3. Visual elements or charts described
4. Recommended narrative flow
5. Important quotes or text sections
6. Suggested video segments`

      let messages: ChatMessage[]

      if (base64Data && (fileType.includes('image') || fileType.includes('pdf'))) {
        // Multimodal analysis for images or PDFs
        messages = [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: `Analyze this ${fileType} file: ${fileName}` },
              { 
                type: fileType.includes('image') ? 'image_url' : 'file',
                ...(fileType.includes('image') 
                  ? { image_url: { url: `data:${fileType};base64,${base64Data}` } }
                  : { file: { filename: fileName, file_data: `data:${fileType};base64,${base64Data}` } }
                )
              }
            ]
          }
        ]
      } else {
        // Text-based analysis
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this ${fileType} content from ${fileName}:\n\n${fileContent}` }
        ]
      }

      const response = await fetch(AI_CONFIG.endpoint, {
        method: 'POST',
        headers: AI_CONFIG.headers,
        body: JSON.stringify({
          model: AI_CONFIG.models.chat,
          messages,
          max_tokens: 2500,
        }),
      })

      if (!response.ok) {
        throw new Error(`File analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data: data.choices[0].message.content }
    } catch (error) {
      console.error('File analysis error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'File analysis failed' }
    }
  }
}

// Export configuration for other modules
export { AI_CONFIG }