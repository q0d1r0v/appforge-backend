export function buildCodegenPrompt(
  screens: any[],
  features: any[],
  techStack: string[],
): string {
  const screenList = screens
    .map((s) => `- ${s.name} (${s.type})`)
    .join('\n');
  const featureList = features
    .map((f) => `- ${f.name}: ${f.description}`)
    .join('\n');

  return `You are a senior React Native developer. Generate a starter project structure and core code for the following app.

Tech Stack: ${techStack.join(', ') || 'React Native, TypeScript, Expo'}

Screens:
${screenList}

Features:
${featureList}

Return the code in the following JSON structure:

{
  "techStack": {
    "frontend": "React Native + Expo",
    "language": "TypeScript",
    "navigation": "React Navigation",
    "stateManagement": "Zustand",
    "styling": "NativeWind"
  },
  "projectStructure": [
    {
      "path": "src/screens/LoginScreen.tsx",
      "content": "// Full component code here",
      "language": "tsx",
      "description": "Login screen with email/password form"
    }
  ],
  "setupInstructions": "Step by step setup instructions",
  "dependencies": {
    "expo": "~51.0.0",
    "@react-navigation/native": "^6.0.0"
  },
  "envVariables": {
    "API_URL": "http://localhost:3000/api/v1"
  }
}

Write fully functional React Native components for each screen.
Include navigation setup, App.tsx, and core type definitions.
Return only JSON.`;
}
