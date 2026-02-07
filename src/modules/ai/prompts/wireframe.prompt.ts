export function buildWireframePrompt(
  screenName: string,
  screenType: string,
  appDescription: string,
  features: string[],
): string {
  return `You are a professional UI/UX designer. You need to create a wireframe component tree for the following app screen.

About the app: "${appDescription}"
Screen name: "${screenName}"
Screen type: "${screenType}"
Available features: ${features.join(', ')}

Return the wireframe in the following JSON structure:

{
  "layout": "column",
  "backgroundColor": "#FFFFFF",
  "components": [
    {
      "id": "unique-id-1",
      "type": "header | text | button | input | image | card | list | icon | divider | navbar | tabbar",
      "props": {
        "text": "Button or text content",
        "placeholder": "Input placeholder",
        "variant": "primary | secondary | outline",
        "size": "sm | md | lg",
        "color": "#hex",
        "backgroundColor": "#hex",
        "borderRadius": 8,
        "padding": 16,
        "fontSize": 16,
        "fontWeight": "400 | 600 | 700"
      },
      "position": {
        "x": 0,
        "y": 0,
        "width": 375,
        "height": 48
      },
      "children": []
    }
  ]
}

For each component:
- Provide a unique "id" (e.g.: "header-1", "btn-login", "input-email")
- Choose appropriate "type"
- Set position and size for mobile screen (375x812)
- Write realistic text and placeholder content
- Include 8-15 components

Return only JSON, nothing else.`;
}