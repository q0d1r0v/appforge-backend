export function buildAnalysisPrompt(description: string): string {
  return `You are a professional product manager and software architect.
The client has described their app idea. You need to analyze it and return a structured JSON response.

Client's idea:
"${description}"

Return the following JSON structure:

{
  "appName": "Suggested app name",
  "appType": "MOBILE_APP | WEB_APP | SAAS | ECOMMERCE",
  "targetAudience": "Who will use this app",
  "coreProblem": "Main problem this app solves",
  "features": [
    {
      "name": "Feature name",
      "description": "Detailed description",
      "category": "Authentication | Payment | etc",
      "priority": "MVP | HIGH | MEDIUM | LOW",
      "estimatedHours": 8,
      "complexity": 3
    }
  ],
  "screens": [
    {
      "name": "Screen name",
      "type": "LOGIN | HOME | DASHBOARD | etc",
      "order": 1,
      "description": "What this screen does"
    }
  ],
  "userPersonas": [
    {
      "name": "Persona name",
      "description": "Who they are",
      "goals": ["Goal 1", "Goal 2"],
      "painPoints": ["Pain 1", "Pain 2"]
    }
  ],
  "technicalRequirements": {
    "platform": "iOS/Android/Web",
    "authentication": true,
    "database": true,
    "realtime": false,
    "payments": false,
    "notifications": false
  },
  "estimatedComplexity": "simple | medium | complex",
  "suggestedTechStack": ["React Native", "Node.js", "PostgreSQL"]
}

Return only JSON, nothing else.`;
}
