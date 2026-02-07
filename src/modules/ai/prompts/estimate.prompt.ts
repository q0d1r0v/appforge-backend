export function buildEstimatePrompt(
  projectAnalysis: any,
  features: any[],
): string {
  return `You are a professional software project manager. You need to create a detailed time & cost estimate for the following app project.

App details:
- Name: ${projectAnalysis.appName || 'Unknown'}
- Type: ${projectAnalysis.appType || 'Unknown'}
- Complexity: ${projectAnalysis.estimatedComplexity || 'medium'}

Feature list:
${features.map((f, i) => `${i + 1}. ${f.name} - ${f.description} (Priority: ${f.priority}, Complexity: ${f.complexity || 'N/A'})`).join('\n')}

Return the estimate in the following JSON structure:

{
  "designHours": 40,
  "frontendHours": 120,
  "backendHours": 100,
  "testingHours": 40,
  "deploymentHours": 16,
  "totalHours": 316,
  "hourlyRate": 50,
  "designCost": 2000,
  "developmentCost": 11000,
  "infrastructureCost": 800,
  "totalCost": 13800,
  "estimatedDuration": "8-10 weeks",
  "phases": [
    {
      "name": "Phase name",
      "duration": "2 weeks",
      "cost": 3000,
      "tasks": ["Task 1", "Task 2"]
    }
  ],
  "risks": [
    {
      "risk": "Risk description",
      "mitigation": "How to mitigate",
      "impact": "low | medium | high"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Provide a realistic and professional estimate. Return only JSON.`;
}